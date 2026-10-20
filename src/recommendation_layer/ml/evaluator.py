"""
Offline Evaluation Engine for Directed Follow Link Prediction Baselines.
Evaluates:
- In-Degree Popularity
- Common Neighbours (Directed)
- Adamic-Adar (Directed)
- Jaccard Coefficient (Directed)
- BPR Matrix Factorization

Computes Precision@5, Precision@10, Recall@5, Recall@10, NDCG@10, and MRR.
Evaluates separately on:
1. Warm-Start Slice (sources with out-degree >= 1 in G_train)
2. Cold-Start Slice (sources with out-degree == 0 in G_train)
3. Combined Test Set
"""

import os
import sys
import json
import sqlite3
import logging
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional
import pandas as pd
import numpy as np

# Local imports
from src.recommendation_layer.ml.dataset_split import create_structural_edge_split, DirectedEdgeSplit
from src.recommendation_layer.ml.baselines import (
    InDegreePopularityBaseline,
    CommonNeighboursBaseline,
    AdamicAdarBaseline,
    JaccardBaseline,
    BPRMatrixFactorization
)
from src.recommendation_layer.ml.lightgcn import DirectedLightGCN
from src.recommendation_layer.ml.metrics import evaluate_user_ranking, aggregate_ranking_metrics


logger = logging.getLogger(__name__)

def run_baseline_evaluation(
    db_path: Optional[str] = None,
    warm_test_ratio: float = 0.20,
    cold_test_count: int = 15,
    seed: int = 42,
    output_json_path: Optional[str] = None
) -> Dict[str, Any]:
    """
    Executes reproducible offline link prediction baseline evaluation.
    """
    if db_path is None:
        base_dir = os.path.dirname(__file__)
        db_path = os.path.abspath(os.path.join(
            base_dir, '..', '..', '..', 'data', 'processed', 'mastodon', 'cbt_rec_dataset.db'
        ))

    conn = sqlite3.connect(db_path)
    rels_df = pd.read_sql("SELECT source_canonical, target_canonical, type FROM relationships WHERE type='follows'", conn)
    users_df = pd.read_sql("SELECT canonical_acct, is_stub FROM users", conn)
    conn.close()

    # Create reproducible structural split
    split = create_structural_edge_split(
        rels_df=rels_df,
        users_df=users_df,
        warm_test_ratio=warm_test_ratio,
        cold_test_count=cold_test_count,
        seed=seed
    )

    split_summary = split.get_summary()

    # Define baseline and graph neural network models to evaluate
    models = [
        InDegreePopularityBaseline(),
        CommonNeighboursBaseline(),
        AdamicAdarBaseline(),
        JaccardBaseline(),
        BPRMatrixFactorization(embedding_dim=32, learning_rate=0.05, reg_lambda=0.01, epochs=60, seed=seed),
        DirectedLightGCN(embedding_dim=32, num_layers=1, learning_rate=0.01, reg_lambda=0.01, epochs=60, optimizer='adam', seed=seed),
        DirectedLightGCN(embedding_dim=32, num_layers=2, learning_rate=0.01, reg_lambda=0.01, epochs=60, optimizer='adam', seed=seed)
    ]


    all_model_results = []

    for model in models:
        # Fit strictly on G_train
        model.fit(split)

        # 1. Warm-Start Evaluation
        warm_metrics_list = []
        for target, ground_truth in split.warm_test_ground_truth.items():
            candidate_pool = split.get_candidate_pool(target)
            ranked_cands = model.rank_candidates(target, candidate_pool)
            u_metrics = evaluate_user_ranking(ranked_cands, ground_truth, k_list=[5, 10])
            if u_metrics is not None:
                warm_metrics_list.append(u_metrics)

        warm_agg = aggregate_ranking_metrics(warm_metrics_list)

        # 2. Cold-Start Evaluation
        cold_metrics_list = []
        for target, ground_truth in split.cold_test_ground_truth.items():
            candidate_pool = split.get_candidate_pool(target)
            ranked_cands = model.rank_candidates(target, candidate_pool)
            u_metrics = evaluate_user_ranking(ranked_cands, ground_truth, k_list=[5, 10])
            if u_metrics is not None:
                cold_metrics_list.append(u_metrics)

        cold_agg = aggregate_ranking_metrics(cold_metrics_list)

        # 3. Combined Evaluation
        combined_metrics_list = warm_metrics_list + cold_metrics_list
        combined_agg = aggregate_ranking_metrics(combined_metrics_list)

        all_model_results.append({
            'model_name': model.name,
            'model_params': model.get_params(),
            'warm_start_evaluation': warm_agg,
            'cold_start_evaluation': cold_agg,
            'combined_evaluation': combined_agg
        })

    experiment_record = {
        'experiment_title': 'CBT-Rec Stage 1: Machine Learning Baseline Link Prediction',
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'dataset_provenance': 'Bounded Mastodon snapshot (270 accounts, 214 follow edges)',
        'split_summary': split_summary,
        'evaluation_protocol': {
            'edge_split': 'Structural edge holdout (no temporal imputation)',
            'training_graph': 'Constructed strictly from E_train (178 edges)',
            'candidate_generation': 'All accounts in V excluding self and training follows',
            'negative_sampling': 'Implicit feedback; excludes all observed positive edges (train and test)',
            'aggregation': 'Macro-averaged per user across evaluated targets with standard error'
        },
        'cold_start_audit_notes': {
            'bpr_mf_mechanism': (
                'For cold-start users (out-degree=0 in G_train), source embeddings W_out receive 0 gradient updates '
                'and remain at random Gaussian initialization. Candidate ranking is driven primarily by learned target '
                'bias b_in and target embedding magnitude, functioning as a global authority prior rather than personalized learning.'
            ),
            'graph_baselines_mechanism': (
                'For directed Common Neighbours, Adamic-Adar, and Jaccard, cold-start users have empty outgoing training '
                'neighborhoods (N_out=0), yielding identically 0.0 scores for all candidates. Residual ranking is determined '
                'strictly by deterministic tie-breaking (lexicographical username ordering).'
            )
        },
        'results': all_model_results
    }


    if output_json_path is None:
        base_dir = os.path.dirname(__file__)
        output_json_path = os.path.abspath(os.path.join(
            base_dir, '..', '..', '..', 'data', 'processed', 'mastodon', 'ml_baseline_experiments.json'
        ))

    os.makedirs(os.path.dirname(output_json_path), exist_ok=True)
    with open(output_json_path, 'w', encoding='utf-8') as f:
        json.dump(experiment_record, f, indent=2)

    return experiment_record


def format_results_table(exp_record: Dict[str, Any]) -> str:
    """Formats experiment outputs into an academic text table."""
    lines = []
    lines.append("=" * 105)
    lines.append(f"CBT-Rec Stage 1 ML Baseline Evaluation (Seed={exp_record['split_summary']['seed']})")
    lines.append(f"Split: Train={exp_record['split_summary']['train_edges_count']} edges | Warm Test={exp_record['split_summary']['warm_test_edges_count']} edges ({exp_record['split_summary']['warm_test_users_count']} users) | Cold Test={exp_record['split_summary']['cold_test_edges_count']} edges ({exp_record['split_summary']['cold_test_users_count']} users)")
    lines.append("=" * 105)
    lines.append(f"{'Model Name':<32} | {'Slice':<9} | {'P@5':<8} | {'P@10':<8} | {'R@5':<8} | {'R@10':<8} | {'NDCG@10':<8} | {'MRR':<8}")
    lines.append("-" * 105)

    for res in exp_record['results']:
        name = res['model_name']
        for slice_name, agg in [
            ('Warm-Start', res['warm_start_evaluation']),
            ('Cold-Start', res['cold_start_evaluation']),
            ('Combined', res['combined_evaluation'])
        ]:
            s = agg.get('summary', {})
            p5 = s.get('precision@5', {}).get('mean', 0.0)
            p10 = s.get('precision@10', {}).get('mean', 0.0)
            r5 = s.get('recall@5', {}).get('mean', 0.0)
            r10 = s.get('recall@10', {}).get('mean', 0.0)
            ndcg10 = s.get('ndcg@10', {}).get('mean', 0.0)
            mrr = s.get('mrr', {}).get('mean', 0.0)

            lines.append(
                f"{name:<32} | {slice_name:<9} | {p5:<8.4f} | {p10:<8.4f} | {r5:<8.4f} | {r10:<8.4f} | {ndcg10:<8.4f} | {mrr:<8.4f}"
            )
        lines.append("-" * 105)

    return "\n".join(lines)


if __name__ == '__main__':
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    record = run_baseline_evaluation()
    print(format_results_table(record))
