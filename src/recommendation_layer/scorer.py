"""
Multi-Signal Scoring Module for CBT-Rec Layer 5.
Computes:
1. Relevance Score (Graph structural proximity + observed hashtag similarity)
2. Context Score (Language compatibility + observed recent activity)
3. Behaviour Score (Observable behaviour score with explicit missing-data policy)
4. Trust Score (Continuous MCDM trustworthiness estimate with fallback for stubs)
Combines signals using configurable weights into a composite ranking score.
"""

import json
import logging
from typing import Dict, List, Any, Optional
import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

DEFAULT_WEIGHTS = {
    'relevance': 0.40,
    'trust': 0.30,
    'context': 0.15,
    'behaviour': 0.15
}

def parse_hashtags(tags_val: Any) -> List[str]:
    """Safely parse hashtags from JSON string or list."""
    if not tags_val or pd.isna(tags_val):
        return []
    if isinstance(tags_val, list):
        return tags_val
    if isinstance(tags_val, str):
        try:
            parsed = json.loads(tags_val)
            if isinstance(parsed, list):
                return [str(t).lower() for t in parsed]
        except Exception:
            return []
    return []

def compute_candidate_scores(
    target_acct: str,
    candidates: List[Dict[str, Any]],
    features_df: pd.DataFrame,
    trust_df: pd.DataFrame,
    metrics_df: pd.DataFrame,
    weights: Optional[Dict[str, float]] = None
) -> List[Dict[str, Any]]:
    """
    Score each candidate using multi-signal framework.
    """
    if not candidates:
        return []

    if weights is None:
        weights = DEFAULT_WEIGHTS.copy()
    else:
        # Normalize weights to sum to 1.0
        w_sum = sum(weights.values())
        if w_sum > 0:
            weights = {k: v / w_sum for k, v in weights.items()}
        else:
            weights = DEFAULT_WEIGHTS.copy()

    # Create fast lookups
    feat_map = features_df.set_index('canonical_acct').to_dict('index') if 'canonical_acct' in features_df.columns else {}
    trust_map = trust_df.set_index('canonical_acct').to_dict('index') if 'canonical_acct' in trust_df.columns else {}
    metrics_map = metrics_df.set_index('canonical_acct').to_dict('index') if 'canonical_acct' in metrics_df.columns else {}

    # Target user features
    target_feat = feat_map.get(target_acct, {})
    target_lang = target_feat.get('primary_language')
    target_tags = parse_hashtags(target_feat.get('top_hashtags'))

    # Max PageRank for scaling
    max_pr = metrics_df['pagerank'].max() if 'pagerank' in metrics_df.columns and len(metrics_df) > 0 else 1.0
    if max_pr <= 0:
        max_pr = 1.0

    scored_candidates = []

    for cand in candidates:
        cand_acct = cand['candidate_acct']
        cand_feat = feat_map.get(cand_acct, {})
        cand_trust = trust_map.get(cand_acct, {})
        cand_metrics = metrics_map.get(cand_acct, {})
        is_stub = cand.get('is_stub', False)

        missing_flags = {
            'is_stub': is_stub,
            'hashtags_missing': False,
            'language_missing': False,
            'recent_activity_missing': False,
            'behaviour_missing': False,
            'trust_missing': False
        }

        # -------------------------------------------------------------
        # 1. RELEVANCE SIGNAL S_rel
        # -------------------------------------------------------------
        # 1a. Graph proximity component
        connectors = cand.get('common_connectors', [])
        cand_pr = cand_metrics.get('pagerank', 0.0)
        norm_pr = min(1.0, cand_pr / max_pr)

        if cand.get('source_type') == '2_hop':
            # Base proximity from 2-hop connection + bonus for multiple common connectors
            conn_factor = min(1.0, len(connectors) / 3.0)
            s_graph = 0.50 + 0.30 * conn_factor + 0.20 * norm_pr
        elif cand.get('source_type') == 'co_following':
            s_graph = 0.40 + 0.30 * norm_pr
        else:
            # Exploration candidates
            s_graph = 0.20 + 0.40 * norm_pr

        s_graph = float(np.clip(s_graph, 0.0, 1.0))

        # 1b. Content / Hashtags similarity component
        cand_tags = parse_hashtags(cand_feat.get('top_hashtags'))
        if len(target_tags) > 0 and len(cand_tags) > 0:
            set_u = set(target_tags)
            set_c = set(cand_tags)
            jaccard = len(set_u & set_c) / len(set_u | set_c)
            s_rel = 0.60 * s_graph + 0.40 * jaccard
            shared_interests = list(set_u & set_c)
        else:
            missing_flags['hashtags_missing'] = True
            s_rel = s_graph
            shared_interests = []

        s_rel = float(np.clip(s_rel, 0.0, 1.0))

        # -------------------------------------------------------------
        # 2. CONTEXT SIGNAL S_ctx
        # -------------------------------------------------------------
        cand_lang = cand_feat.get('primary_language')
        if pd.notna(target_lang) and pd.notna(cand_lang) and target_lang and cand_lang:
            lang_score = 1.0 if target_lang.lower() == cand_lang.lower() else 0.25
        else:
            missing_flags['language_missing'] = True
            lang_score = 0.50  # Neutral fallback for unobserved language

        cand_recent = cand_feat.get('recent_activity_score')
        if pd.notna(cand_recent) and cand_recent is not None:
            recent_score = float(cand_recent)
        else:
            missing_flags['recent_activity_missing'] = True
            recent_score = 0.20  # Neutral fallback for missing recent activity

        s_ctx = float(np.clip(0.50 * lang_score + 0.50 * recent_score, 0.0, 1.0))

        # -------------------------------------------------------------
        # 3. BEHAVIOUR SIGNAL S_beh
        # -------------------------------------------------------------
        raw_beh = cand_feat.get('behaviour_score')
        if pd.notna(raw_beh) and raw_beh is not None:
            s_beh = float(raw_beh)
        else:
            missing_flags['behaviour_missing'] = True
            # Explicit policy: Stub or uncollected statuses get neutral imputation (median of complete accounts ~ 0.012)
            # Not penalized as bad behaviour
            s_beh = 0.012

        s_beh = float(np.clip(s_beh, 0.0, 1.0))

        # -------------------------------------------------------------
        # 4. TRUST SIGNAL S_trust
        # -------------------------------------------------------------
        raw_trust = cand_trust.get('trust_score')
        if pd.notna(raw_trust) and raw_trust is not None:
            s_trust = float(raw_trust)
        else:
            missing_flags['trust_missing'] = True
            # Explicit policy: Stub accounts have NULL trust; neutral baseline is dataset mean ~ 0.025
            s_trust = 0.025

        s_trust = float(np.clip(s_trust, 0.0, 1.0))

        # -------------------------------------------------------------
        # COMPOSITE SCORE (Linear Combination)
        # -------------------------------------------------------------
        composite_score = (
            weights['relevance'] * s_rel +
            weights['trust'] * s_trust +
            weights['context'] * s_ctx +
            weights['behaviour'] * s_beh
        )
        composite_score = float(np.clip(composite_score, 0.0, 1.0))

        scored_item = {
            **cand,
            'scores': {
                'relevance': round(s_rel, 6),
                'trust': round(s_trust, 6),
                'context': round(s_ctx, 6),
                'behaviour': round(s_beh, 6),
                'composite': round(composite_score, 6)
            },
            'weights': {k: round(v, 4) for k, v in weights.items()},
            'missing_flags': missing_flags,
            'shared_interests': shared_interests,
            'candidate_language': cand_lang if pd.notna(cand_lang) else None,
            'target_language': target_lang if pd.notna(target_lang) else None
        }
        scored_candidates.append(scored_item)

    # Sort descending by composite score
    scored_candidates.sort(key=lambda x: x['scores']['composite'], reverse=True)

    return scored_candidates
