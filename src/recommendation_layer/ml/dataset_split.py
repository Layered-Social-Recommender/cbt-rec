"""
Structural Edge-Splitting & Leakage-Prevention Protocol for CBT-Rec Layer 5 ML.

Key Principles:
1. No Historical Timestamps: Mastodon follow edges have no timestamps. Edge splitting is strictly
   structural (edge masking), avoiding temporal imputation artifacts.
2. Warm-Start vs. Cold-Start Distinction:
   - Warm-start test slice: Edges from sources with out-degree >= 2 where the source retains >= 1
     edge in G_train.
   - Cold-start test slice: Controlled holdout of edges from sources with out-degree = 1,
     leaving the source with out-degree = 0 in G_train.
3. Strict Leakage Prevention:
   - G_train contains strictly E_train edges.
   - Candidate generation during evaluation filters only training follows; held-out test edges remain
     in the candidate pool to be ranked.
   - Negative sampling strictly excludes all observed positive edges (E_train union E_test).
"""

import logging
from typing import Dict, List, Set, Tuple, Any, Optional
import numpy as np
import pandas as pd
import networkx as nx

logger = logging.getLogger(__name__)

class DirectedEdgeSplit:
    def __init__(
        self,
        train_edges: List[Tuple[str, str]],
        warm_test_edges: List[Tuple[str, str]],
        cold_test_edges: List[Tuple[str, str]],
        all_nodes: List[str],
        seed: int = 42
    ):
        self.train_edges = list(train_edges)
        self.warm_test_edges = list(warm_test_edges)
        self.cold_test_edges = list(cold_test_edges)
        self.all_test_edges = self.warm_test_edges + self.cold_test_edges
        self.all_nodes = list(all_nodes)
        self.seed = seed

        # Fast lookup sets
        self.train_edge_set: Set[Tuple[str, str]] = set(self.train_edges)
        self.warm_test_set: Set[Tuple[str, str]] = set(self.warm_test_edges)
        self.cold_test_set: Set[Tuple[str, str]] = set(self.cold_test_edges)
        self.all_positive_set: Set[Tuple[str, str]] = (
            self.train_edge_set | self.warm_test_set | self.cold_test_set
        )

        # Validation: Verify strict disjointness
        overlap_warm = self.train_edge_set & self.warm_test_set
        overlap_cold = self.train_edge_set & self.cold_test_set
        overlap_test = self.warm_test_set & self.cold_test_set
        if overlap_warm or overlap_cold or overlap_test:
            raise ValueError(
                f"Data leakage detected! Non-empty overlap between splits: "
                f"warm={len(overlap_warm)}, cold={len(overlap_cold)}, test_types={len(overlap_test)}"
            )

        # Construct training graph G_train strictly with E_train
        self.G_train = nx.DiGraph()
        self.G_train.add_nodes_from(self.all_nodes)
        self.G_train.add_edges_from(self.train_edges)

        # Map target user to their test ground-truth followees
        self.warm_test_ground_truth: Dict[str, Set[str]] = {}
        for u, v in self.warm_test_edges:
            self.warm_test_ground_truth.setdefault(u, set()).add(v)

        self.cold_test_ground_truth: Dict[str, Set[str]] = {}
        for u, v in self.cold_test_edges:
            self.cold_test_ground_truth.setdefault(u, set()).add(v)

        self.all_test_ground_truth: Dict[str, Set[str]] = {}
        for u, v in self.all_test_edges:
            self.all_test_ground_truth.setdefault(u, set()).add(v)

    def get_candidate_pool(self, target_acct: str) -> List[str]:
        """
        Leakage-Safe Candidate Generation for Evaluation:
        Candidates for target u include all nodes in V EXCEPT:
        - target u itself (no self-recommendations)
        - accounts already followed by u in the TRAINING graph G_train.
        Held-out test followees REMAIN in the candidate pool so the model can be evaluated on finding them.
        """
        training_follows = set(self.G_train.successors(target_acct))
        excluded = training_follows | {target_acct}
        return [n for n in self.all_nodes if n not in excluded]

    def sample_negative(self, target_acct: str, rng: np.random.Generator) -> str:
        """
        Careful Negative Sampling:
        Picks an account v' that is NOT followed by target in training OR test.
        Unobserved pairs are implicit negative feedback, representing unobserved interactions
        rather than confirmed active aversion.
        """
        while True:
            idx = rng.integers(0, len(self.all_nodes))
            cand = self.all_nodes[idx]
            if cand != target_acct and (target_acct, cand) not in self.all_positive_set:
                return cand

    def get_summary(self) -> Dict[str, Any]:
        return {
            'total_nodes': len(self.all_nodes),
            'total_edges': len(self.all_positive_set),
            'train_edges_count': len(self.train_edges),
            'warm_test_edges_count': len(self.warm_test_edges),
            'cold_test_edges_count': len(self.cold_test_edges),
            'warm_test_users_count': len(self.warm_test_ground_truth),
            'cold_test_users_count': len(self.cold_test_ground_truth),
            'density_train': len(self.train_edges) / max(1, len(self.all_nodes) * (len(self.all_nodes) - 1)),
            'seed': self.seed
        }


def create_structural_edge_split(
    rels_df: pd.DataFrame,
    users_df: pd.DataFrame,
    warm_test_ratio: float = 0.20,
    cold_test_count: int = 15,
    seed: int = 42
) -> DirectedEdgeSplit:
    """
    Constructs a reproducible, leakage-free directed edge split.
    Args:
        rels_df: DataFrame with 'source_canonical', 'target_canonical', 'type' (all 'follows').
        users_df: DataFrame with 'canonical_acct'.
        warm_test_ratio: Proportion of edges to hold out from nodes with out-degree >= 2.
        cold_test_count: Number of edges to hold out from nodes with out-degree == 1.
        seed: Random seed for deterministic reproducibility.
    """
    rng = np.random.default_rng(seed)
    
    all_nodes = sorted(users_df['canonical_acct'].unique().tolist())
    all_edges = [
        (str(row['source_canonical']), str(row['target_canonical']))
        for _, row in rels_df.iterrows()
        if row.get('type', 'follows') == 'follows'
    ]

    # Map source -> list of targets
    source_to_targets: Dict[str, List[str]] = {}
    for u, v in all_edges:
        source_to_targets.setdefault(u, []).append(v)

    warm_test_edges: List[Tuple[str, str]] = []
    cold_test_edges: List[Tuple[str, str]] = []
    train_edges: List[Tuple[str, str]] = []

    # Separate sources by out-degree
    multi_edge_sources = [u for u, targets in source_to_targets.items() if len(targets) >= 2]
    single_edge_sources = [u for u, targets in source_to_targets.items() if len(targets) == 1]

    # 1. Warm-Start Test Holdout:
    # From multi-edge sources, hold out roughly warm_test_ratio of edges,
    # ensuring each source retains AT LEAST 1 edge in training.
    for u in sorted(multi_edge_sources):
        targets = list(source_to_targets[u])
        rng.shuffle(targets)
        # Cap held-out count so at least 1 edge remains in training
        n_holdout = max(1, int(round(len(targets) * warm_test_ratio)))
        n_holdout = min(n_holdout, len(targets) - 1)

        test_t = targets[:n_holdout]
        train_t = targets[n_holdout:]

        for v in test_t:
            warm_test_edges.append((u, v))
        for v in train_t:
            train_edges.append((u, v))

    # 2. Cold-Start Test Holdout:
    # Sample cold_test_count edges from single-edge sources.
    # In G_train, these sources will have out-degree = 0.
    shuffled_singles = list(sorted(single_edge_sources))
    rng.shuffle(shuffled_singles)
    
    actual_cold_count = min(cold_test_count, len(shuffled_singles))
    cold_sources_selected = set(shuffled_singles[:actual_cold_count])

    for u in sorted(single_edge_sources):
        target = source_to_targets[u][0]
        if u in cold_sources_selected:
            cold_test_edges.append((u, target))
        else:
            train_edges.append((u, target))

    return DirectedEdgeSplit(
        train_edges=train_edges,
        warm_test_edges=warm_test_edges,
        cold_test_edges=cold_test_edges,
        all_nodes=all_nodes,
        seed=seed
    )
