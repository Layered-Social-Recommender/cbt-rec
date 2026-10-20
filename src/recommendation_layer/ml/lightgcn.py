"""
Directed LightGCN for Account-to-Account Follow Prediction in CBT-Rec.

Mathematical Formulation:
1. Dual-Persona Node Roles:
   In a directed follow graph G = (V, E_train), following is asymmetric (u -> v !=> v -> u).
   Every node u in V has two distinct base representations:
   - E_src^(0) in R^(N x d): Follower persona (outgoing interest representation).
   - E_tgt^(0) in R^(N x d): Followee persona (incoming authority/topic representation).
   - b_in in R^N: Target bias representing baseline followability / global authority.

2. Directed Normalized Adjacency:
   Let A in {0, 1}^(N x N) be the directed adjacency matrix (A_uv = 1 iff u -> v in E_train).
   D_out = diag(d_out(1), ..., d_out(N)) and D_in = diag(d_in(1), ..., d_in(N)).
   Symmetric directed normalization:
   A_norm = D_out^(-1/2) * A * D_in^(-1/2)
   with safeguard: (D^(-1/2))_ii = 1 / sqrt(d_i) if d_i > 0 else 0.

3. Directed Multi-Layer Convolution:
   For layer l in {0, ..., L-1}:
   - Source propagation: E_src^(l+1) = A_norm * E_tgt^(l)
     (aggregates target embeddings of accounts followed by u).
   - Target propagation: E_tgt^(l+1) = A_norm^T * E_src^(l)
     (aggregates source embeddings of followers of v).

4. Layer Combination:
   E_src^* = sum_{l=0}^L alpha_l * E_src^(l),   E_tgt^* = sum_{l=0}^L alpha_l * E_tgt^(l)
   with alpha_l = 1 / (L + 1).

5. Scoring & Loss:
   y_uv = <E_src^*[u], E_tgt^*[v]> + b_in[v]
   Optimization on Bayesian Personalized Ranking (BPR) pairwise loss with L2 regularization.
   Cold-start accounts (out-degree = 0 in G_train) have zero outgoing propagation, and their
   base source embeddings receive zero gradient updates, properly documented as a global prior fallback.
"""

import math
import logging
from typing import Dict, List, Set, Tuple, Any, Optional
import numpy as np
import scipy.sparse as sp

from src.recommendation_layer.ml.dataset_split import DirectedEdgeSplit
from src.recommendation_layer.ml.baselines import BaselineModel

logger = logging.getLogger(__name__)


class DirectedLightGCN(BaselineModel):
    """
    Directed Light Graph Convolutional Network (Directed LightGCN).
    Adapts LightGCN to asymmetric directed social networks using dual source/target roles
    and directed normalized bipartite-like message passing.
    """
    def __init__(
        self,
        embedding_dim: int = 32,
        num_layers: int = 2,
        learning_rate: float = 0.01,
        reg_lambda: float = 0.01,
        epochs: int = 60,
        optimizer: str = 'adam',
        seed: int = 42
    ):
        self.embedding_dim = embedding_dim
        self.num_layers = num_layers
        self.learning_rate = learning_rate
        self.reg_lambda = reg_lambda
        self.epochs = epochs
        self.optimizer = optimizer.lower()
        self.seed = seed
        self.name = f"Directed LightGCN (L={num_layers})"

        self.user_to_idx: Dict[str, int] = {}
        self.idx_to_user: Dict[int, str] = {}
        self.all_nodes: List[str] = []

        # Graph matrices
        self.A_norm: Optional[sp.csr_matrix] = None
        self.A_norm_T: Optional[sp.csr_matrix] = None
        self.d_out: Optional[np.ndarray] = None
        self.d_in: Optional[np.ndarray] = None

        # Base trainable embeddings (layer 0)
        self.E_src_0: Optional[np.ndarray] = None
        self.E_tgt_0: Optional[np.ndarray] = None
        self.b_in: Optional[np.ndarray] = None

        # Final multi-layer combined representations
        self.E_src_star: Optional[np.ndarray] = None
        self.E_tgt_star: Optional[np.ndarray] = None

        # Layer weighting coefficients
        self.alpha = [1.0 / (self.num_layers + 1)] * (self.num_layers + 1)
        self.loss_history: List[float] = []

    def get_params(self) -> Dict[str, Any]:
        """Returns model hyperparameters for experiment tracking and reproducibility."""
        return {
            'embedding_dim': self.embedding_dim,
            'num_layers': self.num_layers,
            'learning_rate': self.learning_rate,
            'reg_lambda': self.reg_lambda,
            'epochs': self.epochs,
            'optimizer': self.optimizer,
            'seed': self.seed
        }

    def _build_directed_adjacency(self, split: DirectedEdgeSplit):
        """
        Builds directed adjacency matrix strictly from training edges in G_train.
        Guarantees zero test-edge leakage into graph propagation.
        """
        self.all_nodes = list(split.all_nodes)
        self.user_to_idx = {u: i for i, u in enumerate(self.all_nodes)}
        self.idx_to_user = {i: u for u, i in self.user_to_idx.items()}
        num_nodes = len(self.all_nodes)

        row_ind = [self.user_to_idx[u] for u, v in split.train_edges if u in self.user_to_idx and v in self.user_to_idx]
        col_ind = [self.user_to_idx[v] for u, v in split.train_edges if u in self.user_to_idx and v in self.user_to_idx]
        data = np.ones(len(row_ind), dtype=np.float64)

        A = sp.csr_matrix((data, (row_ind, col_ind)), shape=(num_nodes, num_nodes))

        # Degree calculations
        self.d_out = np.array(A.sum(axis=1)).flatten()
        self.d_in = np.array(A.sum(axis=0)).flatten()

        # Directed symmetric normalization: D_out^(-1/2) * A * D_in^(-1/2)
        # Numerical safeguard: nodes with degree 0 receive factor 0.0 (prevents division by zero)
        d_out_inv_sqrt = np.zeros(num_nodes, dtype=np.float64)
        mask_out = self.d_out > 0
        d_out_inv_sqrt[mask_out] = 1.0 / np.sqrt(self.d_out[mask_out])

        d_in_inv_sqrt = np.zeros(num_nodes, dtype=np.float64)
        mask_in = self.d_in > 0
        d_in_inv_sqrt[mask_in] = 1.0 / np.sqrt(self.d_in[mask_in])

        D_out_inv = sp.diags(d_out_inv_sqrt)
        D_in_inv = sp.diags(d_in_inv_sqrt)

        self.A_norm = (D_out_inv @ A @ D_in_inv).tocsr()
        self.A_norm_T = self.A_norm.transpose().tocsr()

    def _propagate(self, e_src_0: np.ndarray, e_tgt_0: np.ndarray) -> Tuple[np.ndarray, np.ndarray, List[np.ndarray], List[np.ndarray]]:
        """
        Computes forward directed graph convolution across L layers and forms
        the weighted layer combination.
        """
        src_layers = [e_src_0]
        tgt_layers = [e_tgt_0]

        for l in range(self.num_layers):
            # Directed message passing:
            # Source aggregates target representations of followees
            next_src = self.A_norm @ tgt_layers[-1]
            # Target aggregates source representations of followers
            next_tgt = self.A_norm_T @ src_layers[-1]

            src_layers.append(next_src)
            tgt_layers.append(next_tgt)

        e_src_star = sum(a * el for a, el in zip(self.alpha, src_layers))
        e_tgt_star = sum(a * el for a, el in zip(self.alpha, tgt_layers))

        return e_src_star, e_tgt_star, src_layers, tgt_layers

    def fit(self, split: DirectedEdgeSplit):
        """
        Fits Directed LightGCN strictly on training data from DirectedEdgeSplit.
        Uses BPR pairwise loss with Adam or SGD optimizer.
        """
        rng = np.random.default_rng(self.seed)

        # 1. Build directed normalized adjacency
        self._build_directed_adjacency(split)
        num_nodes = len(self.all_nodes)

        # 2. Initialize dual embeddings and target biases
        scale = 1.0 / np.sqrt(self.embedding_dim)
        self.E_src_0 = rng.normal(0.0, scale, (num_nodes, self.embedding_dim)).astype(np.float64)
        self.E_tgt_0 = rng.normal(0.0, scale, (num_nodes, self.embedding_dim)).astype(np.float64)
        self.b_in = np.zeros(num_nodes, dtype=np.float64)

        train_pairs = [
            (self.user_to_idx[u], self.user_to_idx[v])
            for u, v in split.train_edges
            if u in self.user_to_idx and v in self.user_to_idx
        ]

        if not train_pairs:
            logger.warning("DirectedLightGCN fit: No training pairs available.")
            self.E_src_star = self.E_src_0.copy()
            self.E_tgt_star = self.E_tgt_0.copy()
            return self

        n_samples = len(train_pairs)
        self.loss_history = []

        # Optimizer state (for Adam)
        m_s, v_s = np.zeros_like(self.E_src_0), np.zeros_like(self.E_src_0)
        m_t, v_t = np.zeros_like(self.E_tgt_0), np.zeros_like(self.E_tgt_0)
        m_b, v_b = np.zeros_like(self.b_in), np.zeros_like(self.b_in)
        beta1, beta2, eps = 0.9, 0.999, 1e-8

        for epoch in range(1, self.epochs + 1):
            rng.shuffle(train_pairs)

            # 3. Forward graph convolution
            e_src_star, e_tgt_star, _, _ = self._propagate(self.E_src_0, self.E_tgt_0)

            G_src_star = np.zeros_like(e_src_star)
            G_tgt_star = np.zeros_like(e_tgt_star)
            grad_b_in = np.zeros_like(self.b_in)
            epoch_loss = 0.0

            # 4. Pairwise BPR loss and gradient accumulation
            for u_idx, v_idx in train_pairs:
                u_str = self.idx_to_user[u_idx]
                neg_str = split.sample_negative(u_str, rng)
                neg_idx = self.user_to_idx[neg_str]

                y_pos = np.dot(e_src_star[u_idx], e_tgt_star[v_idx]) + self.b_in[v_idx]
                y_neg = np.dot(e_src_star[u_idx], e_tgt_star[neg_idx]) + self.b_in[neg_idx]
                diff = y_pos - y_neg

                if diff >= 0:
                    sig_neg = 1.0 / (1.0 + np.exp(diff))
                    loss = np.log1p(np.exp(-diff))
                else:
                    sig_neg = np.exp(-diff) / (1.0 + np.exp(-diff))
                    loss = -diff + np.log1p(np.exp(diff))

                epoch_loss += loss

                # Gradient w.r.t final representations
                G_src_star[u_idx] += -sig_neg * (e_tgt_star[v_idx] - e_tgt_star[neg_idx])
                G_tgt_star[v_idx] += -sig_neg * e_src_star[u_idx]
                G_tgt_star[neg_idx] += sig_neg * e_src_star[u_idx]
                grad_b_in[v_idx] += -sig_neg
                grad_b_in[neg_idx] += sig_neg

            # 5. Exact reverse backpropagation through linear directed convolution
            G_s_layers = [self.alpha[l] * G_src_star for l in range(self.num_layers + 1)]
            G_t_layers = [self.alpha[l] * G_tgt_star for l in range(self.num_layers + 1)]

            grad_s = G_s_layers.copy()
            grad_t = G_t_layers.copy()
            for l in range(self.num_layers - 1, -1, -1):
                grad_t[l] = grad_t[l] + self.A_norm_T @ grad_s[l + 1]
                grad_s[l] = grad_s[l] + self.A_norm @ grad_t[l + 1]

            # Regularization gradient applied to active parameters
            grad_E_src_0 = grad_s[0] / n_samples
            grad_E_tgt_0 = grad_t[0] / n_samples
            grad_b_in = grad_b_in / n_samples

            active_src = np.abs(grad_s[0]).sum(axis=1) > 0
            active_tgt = np.abs(grad_t[0]).sum(axis=1) > 0
            active_b = np.abs(grad_b_in) > 0

            grad_E_src_0[active_src] += self.reg_lambda * self.E_src_0[active_src]
            grad_E_tgt_0[active_tgt] += self.reg_lambda * self.E_tgt_0[active_tgt]
            grad_b_in[active_b] += self.reg_lambda * self.b_in[active_b]


            # 6. Parameter update step
            if self.optimizer == 'adam':
                m_s = beta1 * m_s + (1 - beta1) * grad_E_src_0
                v_s = beta2 * v_s + (1 - beta2) * (grad_E_src_0 ** 2)
                m_s_hat = m_s / (1 - beta1 ** epoch)
                v_s_hat = v_s / (1 - beta2 ** epoch)
                self.E_src_0 -= self.learning_rate * m_s_hat / (np.sqrt(v_s_hat) + eps)

                m_t = beta1 * m_t + (1 - beta1) * grad_E_tgt_0
                v_t = beta2 * v_t + (1 - beta2) * (grad_E_tgt_0 ** 2)
                m_t_hat = m_t / (1 - beta1 ** epoch)
                v_t_hat = v_t / (1 - beta2 ** epoch)
                self.E_tgt_0 -= self.learning_rate * m_t_hat / (np.sqrt(v_t_hat) + eps)

                m_b = beta1 * m_b + (1 - beta1) * grad_b_in
                v_b = beta2 * v_b + (1 - beta2) * (grad_b_in ** 2)
                m_b_hat = m_b / (1 - beta1 ** epoch)
                v_b_hat = v_b / (1 - beta2 ** epoch)
                self.b_in -= self.learning_rate * m_b_hat / (np.sqrt(v_b_hat) + eps)
            else:  # Standard SGD
                self.E_src_0 -= self.learning_rate * grad_E_src_0
                self.E_tgt_0 -= self.learning_rate * grad_E_tgt_0
                self.b_in -= self.learning_rate * grad_b_in

            self.loss_history.append(epoch_loss / float(n_samples))

        # 7. Final forward propagation to cache optimal inference embeddings
        self.E_src_star, self.E_tgt_star, _, _ = self._propagate(self.E_src_0, self.E_tgt_0)
        return self

    def score_candidates(self, target_acct: str, candidate_pool: List[str]) -> Dict[str, float]:
        """
        Scores candidate accounts for target_acct using propagated embeddings.

        Computes: score(u, v) = sigmoid(<e_u^src,*, e_v^tgt,*> + b_v^in).

        Returns bounded affinity scores in (0, 1). These are NOT calibrated
        probabilities; they are monotonic transformations of raw logits used
        strictly for ranking. The sigmoid ensures numerical boundedness but
        does not imply a probabilistic interpretation.

        For cold-start sources (out-degree = 0 in G_train), e_src^* is a
        scaled random vector (alpha_0 * e_src^(0)). The dot-product term is
        small relative to b_in but nonzero, so cold-start rankings are
        dominated by b_in but not exclusively determined by it.
        """
        if target_acct not in self.user_to_idx or self.E_src_star is None or self.E_tgt_star is None:
            return {c: 0.0 for c in candidate_pool}

        u_idx = self.user_to_idx[target_acct]
        w_u_src = self.E_src_star[u_idx]

        cand_indices = [self.user_to_idx[c] for c in candidate_pool if c in self.user_to_idx]
        if not cand_indices:
            return {c: 0.0 for c in candidate_pool}

        cand_w_tgt = self.E_tgt_star[cand_indices]  # (K, d)
        cand_b_in = self.b_in[cand_indices]         # (K,)

        logits = np.dot(cand_w_tgt, w_u_src) + cand_b_in
        scores_arr = 1.0 / (1.0 + np.exp(-np.clip(logits, -15.0, 15.0)))

        scores = {}
        for cand_str, s in zip(candidate_pool, scores_arr):
            scores[cand_str] = float(s)

        return scores

