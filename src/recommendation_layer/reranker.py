"""
Diversity-Aware Reranker Module for CBT-Rec Layer 5.
Implements greedy list-level diversification (Maximal Marginal Relevance with Community Spread)
to introduce candidates from outside communities and mitigate echo-chamber effects.
"""

import logging
from typing import Dict, List, Any

logger = logging.getLogger(__name__)

def rerank_with_diversity(
    scored_candidates: List[Dict[str, Any]],
    top_k: int = 10,
    diversity_lambda: float = 0.30
) -> List[Dict[str, Any]]:
    """
    Rerank scored candidates using MMR-based community diversification.
    Args:
        scored_candidates: Pre-scored candidate list, sorted descending by composite score.
        top_k: Number of final recommendations to return.
        diversity_lambda: Weight in [0, 1] balancing score quality (1 - lambda) vs community novelty (lambda).
    Returns:
        List of top_k reranked candidates with assigned rank, rerank_score, and diversity metadata.
    """
    if not scored_candidates:
        return []

    # Assign initial baseline ranks
    for idx, c in enumerate(scored_candidates):
        c['initial_rank'] = idx + 1

    # If lambda is 0 or pool <= 1, return top_k as-is
    if diversity_lambda <= 0.0 or len(scored_candidates) <= 1:
        result = []
        for rank, c in enumerate(scored_candidates[:top_k], 1):
            res_item = {
                **c,
                'rank': rank,
                'overall_score': c['scores']['composite'],
                'diversity_penalty': 0.0,
                'diversity_contribution': 0.0,
                'community_occurrences_in_topk': 0
            }
            result.append(res_item)
        return result

    pool = [dict(c) for c in scored_candidates]
    selected: List[Dict[str, Any]] = []
    selected_communities: Dict[int, int] = {}

    while len(selected) < min(top_k, len(pool)):
        best_candidate = None
        best_rerank_score = -1e9
        best_novelty = 0.0
        best_idx = -1

        for idx, cand in enumerate(pool):
            comm = cand.get('candidate_community', -1)
            quality_score = cand['scores']['composite']

            # Calculate community novelty relative to candidates already selected
            count_in_selected = selected_communities.get(comm, 0)
            if comm == -1:
                # Unknown/isolated community receives neutral novelty
                novelty = 0.5
            elif count_in_selected == 0:
                # Brand new community in recommendation list
                novelty = 1.0
            else:
                # Diminishing novelty for already-represented community
                novelty = 1.0 / (1.0 + count_in_selected)

            # Modest bonus for true cross-community discovery (outside target's community)
            if cand.get('is_exploration', False):
                novelty = min(1.0, novelty + 0.10)

            # Combined MMR Rerank Score
            rerank_score = (1.0 - diversity_lambda) * quality_score + diversity_lambda * novelty

            if rerank_score > best_rerank_score:
                best_rerank_score = rerank_score
                best_candidate = cand
                best_novelty = novelty
                best_idx = idx

        if best_candidate is not None and best_idx >= 0:
            comm = best_candidate.get('candidate_community', -1)
            selected_communities[comm] = selected_communities.get(comm, 0) + 1
            
            rank = len(selected) + 1
            best_candidate['rank'] = rank
            best_candidate['overall_score'] = round(best_rerank_score, 6)
            best_candidate['diversity_contribution'] = round(best_novelty, 4)
            best_candidate['community_occurrences_in_topk'] = selected_communities[comm]
            best_candidate['rank_delta'] = best_candidate['initial_rank'] - rank  # positive means moved up

            selected.append(best_candidate)
            pool.pop(best_idx)
        else:
            break

    return selected
