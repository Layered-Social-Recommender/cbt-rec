"""
Ranking Evaluation Metrics Module for CBT-Rec Layer 5 ML.
Computes:
- Precision@K
- Recall@K
- NDCG@K (Normalized Discounted Cumulative Gain)
- HitRate@K
- MRR (Mean Reciprocal Rank)

Explicitly handles empty ground-truth sets (|T(u)| == 0) and ties in candidate ranking.
"""

import math
from typing import List, Set, Dict, Any, Optional
import numpy as np

def compute_precision_at_k(recommended: List[str], ground_truth: Set[str], k: int) -> float:
    if k <= 0 or not ground_truth:
        return 0.0
    rec_k = recommended[:k]
    hits = sum(1 for item in rec_k if item in ground_truth)
    return hits / float(k)

def compute_recall_at_k(recommended: List[str], ground_truth: Set[str], k: int) -> float:
    if not ground_truth:
        return 0.0
    rec_k = recommended[:k]
    hits = sum(1 for item in rec_k if item in ground_truth)
    return hits / float(len(ground_truth))

def compute_dcg_at_k(recommended: List[str], ground_truth: Set[str], k: int) -> float:
    dcg = 0.0
    for idx, item in enumerate(recommended[:k], start=1):
        if item in ground_truth:
            dcg += 1.0 / math.log2(idx + 1)
    return dcg

def compute_idcg_at_k(ground_truth: Set[str], k: int) -> float:
    n_pos = min(len(ground_truth), k)
    if n_pos == 0:
        return 0.0
    idcg = 0.0
    for idx in range(1, n_pos + 1):
        idcg += 1.0 / math.log2(idx + 1)
    return idcg

def compute_ndcg_at_k(recommended: List[str], ground_truth: Set[str], k: int) -> float:
    if not ground_truth:
        return 0.0
    idcg = compute_idcg_at_k(ground_truth, k)
    if idcg <= 0.0:
        return 0.0
    dcg = compute_dcg_at_k(recommended, ground_truth, k)
    return dcg / idcg

def compute_hitrate_at_k(recommended: List[str], ground_truth: Set[str], k: int) -> float:
    if not ground_truth:
        return 0.0
    rec_k = recommended[:k]
    return 1.0 if any(item in ground_truth for item in rec_k) else 0.0

def compute_mrr(recommended: List[str], ground_truth: Set[str]) -> float:
    if not ground_truth:
        return 0.0
    for idx, item in enumerate(recommended, start=1):
        if item in ground_truth:
            return 1.0 / float(idx)
    return 0.0

def evaluate_user_ranking(
    recommended: List[str],
    ground_truth: Set[str],
    k_list: List[int] = (5, 10)
) -> Optional[Dict[str, float]]:
    """
    Evaluates ranking for a single target user.
    Returns None if ground_truth is empty (user has no held-out test positives).
    """
    if not ground_truth:
        return None

    results = {
        'num_test_positives': len(ground_truth),
        'mrr': compute_mrr(recommended, ground_truth)
    }

    for k in k_list:
        results[f'precision@{k}'] = compute_precision_at_k(recommended, ground_truth, k)
        results[f'recall@{k}'] = compute_recall_at_k(recommended, ground_truth, k)
        results[f'ndcg@{k}'] = compute_ndcg_at_k(recommended, ground_truth, k)
        results[f'hitrate@{k}'] = compute_hitrate_at_k(recommended, ground_truth, k)

    return results

def aggregate_ranking_metrics(
    per_user_metrics: List[Dict[str, float]]
) -> Dict[str, Any]:
    """
    Aggregates per-user metrics into mean and standard error.
    """
    if not per_user_metrics:
        return {
            'evaluated_users_count': 0,
            'summary': {}
        }

    keys = [k for k in per_user_metrics[0].keys() if k != 'num_test_positives']
    summary = {}
    n = len(per_user_metrics)

    for k in keys:
        vals = [u[k] for u in per_user_metrics]
        mean_v = float(np.mean(vals))
        std_err = float(np.std(vals) / np.sqrt(n)) if n > 1 else 0.0
        summary[k] = {
            'mean': round(mean_v, 6),
            'std_error': round(std_err, 6)
        }

    total_positives = sum(u.get('num_test_positives', 0) for u in per_user_metrics)

    return {
        'evaluated_users_count': n,
        'total_test_positives': total_positives,
        'aggregation_method': 'macro_averaged_per_user',
        'summary': summary
    }

