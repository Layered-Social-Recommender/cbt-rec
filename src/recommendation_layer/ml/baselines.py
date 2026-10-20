"""
Baseline Models Module for Directed User-to-User Link Prediction.

Implemented Baselines:
1. In-Degree Popularity: Non-personalized baseline ranking candidates by in-degree in G_train.
2. Common Neighbours (CN): Directed 2-hop structural link predictor (|N_out(u) ∩ N_in(v)|).
3. Adamic-Adar (AA): Directed link predictor penalizing hubs with large outgoing neighbourhoods.
4. Jaccard Coefficient (JC): Directed structural similarity (|N_out(u) ∩ N_in(v)| / |N_out(u) ∪ N_in(v)|).
5. BPR Matrix Factorization (BPR-MF): Trainable dual-embedding collaborative filtering model in pure NumPy.

All models operate strictly on training data provided by DirectedEdgeSplit to prevent leakage.
"""

import math
import logging
from typing import Dict, List, Set, Tuple, Any, Optional
import numpy as np

from src.recommendation_layer.ml.dataset_split import DirectedEdgeSplit

logger = logging.getLogger(__name__)

class BaselineModel:
    def fit(self, split: DirectedEdgeSplit):
        raise NotImplementedError

    def score_candidates(self, target_acct: str, candidate_pool: List[str]) -> Dict[str, float]:
        raise NotImplementedError

    def rank_candidates(self, target_acct: str, candidate_pool: List[str]) -> List[str]:
        scores = self.score_candidates(target_acct, candidate_pool)
        # Deterministic sorting: descending by score, tie-break by candidate username
        sorted_cands = sorted(candidate_pool, key=lambda c: (-scores.get(c, 0.0), c))
        return sorted_cands

    def get_params(self) -> Dict[str, Any]:
        """Returns model hyperparameters for experiment tracking and reproducibility."""
        return {}


class InDegreePopularityBaseline(BaselineModel):
    """
    Ranks candidate accounts strictly by their incoming degree in G_train.
    Non-personalized baseline representing platform celebrity / authority popularity.
    """
    def __init__(self):
        self.in_degrees: Dict[str, int] = {}
        self.name = "In-Degree Popularity"

    def fit(self, split: DirectedEdgeSplit):
        self.in_degrees = dict(split.G_train.in_degree())
        return self

    def score_candidates(self, target_acct: str, candidate_pool: List[str]) -> Dict[str, float]:
        return {cand: float(self.in_degrees.get(cand, 0)) for cand in candidate_pool}


class CommonNeighboursBaseline(BaselineModel):
    """
    Directed Common Neighbours:
    Counts directed 2-hop paths (u -> w -> v) in G_train:
    Intermediaries(u, v) = N_out(u) ∩ N_in(v).
    """
    def __init__(self):
        self.G_train = None
        self.name = "Common Neighbours (Directed)"

    def fit(self, split: DirectedEdgeSplit):
        self.G_train = split.G_train
        return self

    def score_candidates(self, target_acct: str, candidate_pool: List[str]) -> Dict[str, float]:
        if not self.G_train.has_node(target_acct):
            return {c: 0.0 for c in candidate_pool}

        out_u = set(self.G_train.successors(target_acct))
        if not out_u:
            # Target has no outgoing edges in training graph (e.g. cold-start)
            return {c: 0.0 for c in candidate_pool}

        scores = {}
        for cand in candidate_pool:
            if not self.G_train.has_node(cand):
                scores[cand] = 0.0
                continue
            in_v = set(self.G_train.predecessors(cand))
            common = out_u & in_v
            scores[cand] = float(len(common))

        return scores


class AdamicAdarBaseline(BaselineModel):
    """
    Directed Adamic-Adar:
    Weights directed 2-hop intermediaries by the inverse log of their outgoing degree:
    AA(u, v) = sum_{w in N_out(u) ∩ N_in(v)} [ 1 / log(1 + |N_out(w)|) ]
    """
    def __init__(self):
        self.G_train = None
        self.name = "Adamic-Adar (Directed)"

    def fit(self, split: DirectedEdgeSplit):
        self.G_train = split.G_train
        return self

    def score_candidates(self, target_acct: str, candidate_pool: List[str]) -> Dict[str, float]:
        if not self.G_train.has_node(target_acct):
            return {c: 0.0 for c in candidate_pool}

        out_u = set(self.G_train.successors(target_acct))
        if not out_u:
            return {c: 0.0 for c in candidate_pool}

        scores = {}
        for cand in candidate_pool:
            if not self.G_train.has_node(cand):
                scores[cand] = 0.0
                continue
            in_v = set(self.G_train.predecessors(cand))
            common = out_u & in_v
            
            score_val = 0.0
            for w in common:
                deg_w = self.G_train.out_degree(w)
                denom = math.log(1.0 + deg_w)
                if denom > 0:
                    score_val += 1.0 / denom
            scores[cand] = score_val

        return scores


class JaccardBaseline(BaselineModel):
    """
    Directed Jaccard Structural Coefficient:
    JC(u, v) = |N_out(u) ∩ N_in(v)| / |N_out(u) ∪ N_in(v)|
    """
    def __init__(self):
        self.G_train = None
        self.name = "Jaccard Coefficient (Directed)"

    def fit(self, split: DirectedEdgeSplit):
        self.G_train = split.G_train
        return self

    def score_candidates(self, target_acct: str, candidate_pool: List[str]) -> Dict[str, float]:
        if not self.G_train.has_node(target_acct):
            return {c: 0.0 for c in candidate_pool}

        out_u = set(self.G_train.successors(target_acct))
        if not out_u:
            return {c: 0.0 for c in candidate_pool}

        scores = {}
        for cand in candidate_pool:
            if not self.G_train.has_node(cand):
                scores[cand] = 0.0
                continue
            in_v = set(self.G_train.predecessors(cand))
            intersection = out_u & in_v
            union = out_u | in_v
            scores[cand] = float(len(intersection)) / float(len(union)) if union else 0.0

        return scores


class BPRMatrixFactorization(BaselineModel):
    """
    Bayesian Personalized Ranking Matrix Factorization (BPR-MF).
    Pure NumPy implementation of pairwise collaborative ranking for directed follow networks:
    - Source embeddings: W_out in R^(N x d) (representing user as follower)
    - Target embeddings: W_in in R^(N x d) (representing user as followee)
    - Target bias: b_in in R^N
    - Optimization: SGD on BPR pairwise loss with L2 regularization
    - Negative Sampling: Carefully excludes all observed edges (train and test)
    """
    def __init__(
        self,
        embedding_dim: int = 32,
        learning_rate: float = 0.05,
        reg_lambda: float = 0.01,
        epochs: int = 60,
        seed: int = 42
    ):
        self.embedding_dim = embedding_dim
        self.learning_rate = learning_rate
        self.reg_lambda = reg_lambda
        self.epochs = epochs
        self.seed = seed
        self.name = "BPR Matrix Factorization"

        self.user_to_idx: Dict[str, int] = {}
        self.idx_to_user: Dict[int, str] = {}
        self.W_out = None
        self.W_in = None
        self.b_in = None
        self.loss_history = []

    def get_params(self) -> Dict[str, Any]:
        return {
            'embedding_dim': self.embedding_dim,
            'learning_rate': self.learning_rate,
            'reg_lambda': self.reg_lambda,
            'epochs': self.epochs,
            'seed': self.seed
        }


    def fit(self, split: DirectedEdgeSplit):
        rng = np.random.default_rng(self.seed)

        # Index all nodes in dataset
        self.user_to_idx = {u: i for i, u in enumerate(split.all_nodes)}
        self.idx_to_user = {i: u for u, i in self.user_to_idx.items()}
        num_users = len(split.all_nodes)

        # Initialize dual embeddings with small normal variance
        scale = 1.0 / np.sqrt(self.embedding_dim)
        self.W_out = rng.normal(0.0, scale, (num_users, self.embedding_dim)).astype(np.float64)
        self.W_in = rng.normal(0.0, scale, (num_users, self.embedding_dim)).astype(np.float64)
        self.b_in = np.zeros(num_users, dtype=np.float64)

        train_pairs = [
            (self.user_to_idx[u], self.user_to_idx[v])
            for u, v in split.train_edges
            if u in self.user_to_idx and v in self.user_to_idx
        ]

        if not train_pairs:
            logger.warning("BPR-MF fit: No training pairs available.")
            return self

        self.loss_history = []
        n_samples = len(train_pairs)

        for epoch in range(self.epochs):
            rng.shuffle(train_pairs)
            epoch_loss = 0.0

            for u_idx, v_idx in train_pairs:
                u_str = self.idx_to_user[u_idx]
                neg_str = split.sample_negative(u_str, rng)
                neg_idx = self.user_to_idx[neg_str]

                # Dot products + target bias
                y_pos = np.dot(self.W_out[u_idx], self.W_in[v_idx]) + self.b_in[v_idx]
                y_neg = np.dot(self.W_out[u_idx], self.W_in[neg_idx]) + self.b_in[neg_idx]
                diff = y_pos - y_neg

                # Numerically stable sigmoid: sigma(-diff)
                # Note: sigma(-diff) = 1 / (1 + exp(diff))
                if diff >= 0:
                    sig_neg = 1.0 / (1.0 + np.exp(diff))
                    loss = np.log1p(np.exp(-diff))
                else:
                    sig_neg = np.exp(-diff) / (1.0 + np.exp(-diff))
                    loss = -diff + np.log1p(np.exp(diff))

                epoch_loss += loss

                # Gradient descent step
                w_u = self.W_out[u_idx].copy()
                w_v = self.W_in[v_idx].copy()
                w_neg = self.W_in[neg_idx].copy()

                # Update target bias
                self.b_in[v_idx] += self.learning_rate * (sig_neg - self.reg_lambda * self.b_in[v_idx])
                self.b_in[neg_idx] += self.learning_rate * (-sig_neg - self.reg_lambda * self.b_in[neg_idx])

                # Update embeddings
                self.W_out[u_idx] += self.learning_rate * (sig_neg * (w_v - w_neg) - self.reg_lambda * w_u)
                self.W_in[v_idx] += self.learning_rate * (sig_neg * w_u - self.reg_lambda * w_v)
                self.W_in[neg_idx] += self.learning_rate * (-sig_neg * w_u - self.reg_lambda * w_neg)

            self.loss_history.append(epoch_loss / float(n_samples))

        return self

    def score_candidates(self, target_acct: str, candidate_pool: List[str]) -> Dict[str, float]:
        if target_acct not in self.user_to_idx or self.W_out is None:
            return {c: 0.0 for c in candidate_pool}

        u_idx = self.user_to_idx[target_acct]
        w_u = self.W_out[u_idx]

        cand_indices = [self.user_to_idx[c] for c in candidate_pool if c in self.user_to_idx]
        if not cand_indices:
            return {c: 0.0 for c in candidate_pool}

        cand_w_in = self.W_in[cand_indices]  # (K, d)
        cand_b_in = self.b_in[cand_indices]  # (K,)

        # Dot product
        logits = np.dot(cand_w_in, w_u) + cand_b_in
        # Numerically clipped sigmoid
        probs = 1.0 / (1.0 + np.exp(-np.clip(logits, -15.0, 15.0)))

        scores = {}
        for cand_str, p in zip(candidate_pool, probs):
            scores[cand_str] = float(p)

        return scores
