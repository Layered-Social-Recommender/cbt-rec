"""
Hybrid Scoring Module for CBT-Rec Stage 3.
Combines:
1. Directed LightGCN Link-Prediction Affinity (dual-persona embeddings)
2. Layer 4 MCDM Trust Score (continuous trustworthiness from user_trust)
3. Social Proximity (2-hop structural connectors & normalized PageRank)
4. Contextual Compatibility (primary language match & recent activity)
5. Behavioural Score (observable status interactions with neutral imputation for missing data)

Scoring Equation:
S_hybrid(u, v) = w_gcn * S_gcn(u, v) + w_trust * S_trust(v) + w_prox * S_prox(u, v) + w_ctx * S_ctx(u, v) + w_beh * S_beh(v)
where weights are normalized to sum to 1.0.
"""

import json
import logging
from typing import Dict, List, Any, Optional
import numpy as np
import pandas as pd

from src.recommendation_layer.ml.lightgcn import DirectedLightGCN
from src.recommendation_layer.scorer import parse_hashtags

logger = logging.getLogger(__name__)

DEFAULT_HYBRID_WEIGHTS = {
    'gcn': 0.35,
    'trust': 0.30,
    'proximity': 0.10,
    'context': 0.15,
    'behaviour': 0.10
}


def compute_hybrid_candidate_scores(
    target_acct: str,
    candidates: List[Dict[str, Any]],
    features_df: pd.DataFrame,
    trust_df: pd.DataFrame,
    metrics_df: pd.DataFrame,
    lightgcn_model: Optional[DirectedLightGCN] = None,
    weights: Optional[Dict[str, float]] = None
) -> List[Dict[str, Any]]:
    """
    Score candidates using Directed LightGCN affinity hybridized with Layer 4 MCDM Trust
    and contextual / behavioural / proximity signals.
    """
    if not candidates:
        return []

    if weights is None:
        weights = DEFAULT_HYBRID_WEIGHTS.copy()
    else:
        # Normalize weights to sum to 1.0
        w_sum = sum(weights.values())
        if w_sum > 0:
            weights = {k: v / w_sum for k, v in weights.items()}
        else:
            weights = DEFAULT_HYBRID_WEIGHTS.copy()

    # Fast indexed lookups
    feat_map = features_df.set_index('canonical_acct').to_dict('index') if 'canonical_acct' in features_df.columns else {}
    trust_map = trust_df.set_index('canonical_acct').to_dict('index') if 'canonical_acct' in trust_df.columns else {}
    metrics_map = metrics_df.set_index('canonical_acct').to_dict('index') if 'canonical_acct' in metrics_df.columns else {}

    # Target features
    target_feat = feat_map.get(target_acct, {})
    target_lang = target_feat.get('primary_language')
    target_tags = parse_hashtags(target_feat.get('top_hashtags'))

    # Maximum PageRank for scaling proximity
    max_pr = metrics_df['pagerank'].max() if 'pagerank' in metrics_df.columns and len(metrics_df) > 0 else 1.0
    if max_pr <= 0:
        max_pr = 1.0

    # 1. Compute LightGCN affinities in batch for all candidate accounts
    cand_accts = [c['candidate_acct'] for c in candidates]
    gcn_scores: Dict[str, float] = {}
    is_cold_start = False

    if lightgcn_model is not None:
        gcn_scores = lightgcn_model.score_candidates(target_acct, cand_accts)
        if target_acct in lightgcn_model.user_to_idx:
            u_idx = lightgcn_model.user_to_idx[target_acct]
            # Check if target had 0 out-degree in model's training graph
            if hasattr(lightgcn_model, 'A_norm') and lightgcn_model.A_norm is not None:
                is_cold_start = (lightgcn_model.A_norm.getrow(u_idx).nnz == 0)
    else:
        # Fallback if no LightGCN model provided: neutral baseline
        gcn_scores = {c: 0.50 for c in cand_accts}

    scored_candidates = []

    for cand in candidates:
        cand_acct = cand['candidate_acct']
        cand_feat = feat_map.get(cand_acct, {})
        cand_trust = trust_map.get(cand_acct, {})
        cand_metrics = metrics_map.get(cand_acct, {})
        is_stub = cand.get('is_stub', False)

        missing_flags = {
            'is_stub': is_stub,
            'gcn_missing': (lightgcn_model is None or cand_acct not in gcn_scores),
            'hashtags_missing': False,
            'language_missing': False,
            'recent_activity_missing': False,
            'behaviour_missing': False,
            'trust_missing': False
        }

        # -------------------------------------------------------------
        # SIGNAL 1: Directed LightGCN Predicted Link Affinity (S_gcn)
        # -------------------------------------------------------------
        s_gcn = float(gcn_scores.get(cand_acct, 0.50))
        s_gcn = float(np.clip(s_gcn, 0.0, 1.0))

        # -------------------------------------------------------------
        # SIGNAL 2: Layer 4 MCDM Trust Score (S_trust)
        # -------------------------------------------------------------
        raw_trust = cand_trust.get('trust_score')
        if pd.notna(raw_trust) and raw_trust is not None:
            s_trust = float(raw_trust)
        else:
            missing_flags['trust_missing'] = True
            # Neutral baseline for stub accounts (dataset mean ~ 0.025)
            s_trust = 0.025
        s_trust = float(np.clip(s_trust, 0.0, 1.0))

        # -------------------------------------------------------------
        # SIGNAL 3: Social Proximity (S_prox)
        # -------------------------------------------------------------
        connectors = cand.get('common_connectors', [])
        cand_pr = cand_metrics.get('pagerank', 0.0)
        norm_pr = min(1.0, cand_pr / max_pr)

        if cand.get('source_type') == '2_hop':
            conn_factor = min(1.0, len(connectors) / 3.0)
            s_prox = 0.50 + 0.30 * conn_factor + 0.20 * norm_pr
        elif cand.get('source_type') == 'co_following':
            s_prox = 0.40 + 0.30 * norm_pr
        else:
            # Exploration
            s_prox = 0.20 + 0.40 * norm_pr
        s_prox = float(np.clip(s_prox, 0.0, 1.0))

        # -------------------------------------------------------------
        # SIGNAL 4: Contextual Compatibility (S_ctx)
        # -------------------------------------------------------------
        cand_lang = cand_feat.get('primary_language')
        if pd.notna(target_lang) and pd.notna(cand_lang) and target_lang and cand_lang:
            lang_score = 1.0 if str(target_lang).lower() == str(cand_lang).lower() else 0.25
        else:
            missing_flags['language_missing'] = True
            lang_score = 0.50

        cand_recent = cand_feat.get('recent_activity_score')
        if pd.notna(cand_recent) and cand_recent is not None:
            recent_score = float(cand_recent)
        else:
            missing_flags['recent_activity_missing'] = True
            recent_score = 0.20

        s_ctx = float(np.clip(0.50 * lang_score + 0.50 * recent_score, 0.0, 1.0))

        # -------------------------------------------------------------
        # SIGNAL 5: Observable Behaviour (S_beh)
        # -------------------------------------------------------------
        raw_beh = cand_feat.get('behaviour_score')
        if pd.notna(raw_beh) and raw_beh is not None:
            s_beh = float(raw_beh)
        else:
            missing_flags['behaviour_missing'] = True
            s_beh = 0.012
        s_beh = float(np.clip(s_beh, 0.0, 1.0))

        # -------------------------------------------------------------
        # Shared Interests
        # -------------------------------------------------------------
        cand_tags = parse_hashtags(cand_feat.get('top_hashtags'))
        shared_interests = list(set(target_tags) & set(cand_tags)) if target_tags and cand_tags else []
        if not cand_tags or not target_tags:
            missing_flags['hashtags_missing'] = True

        # -------------------------------------------------------------
        # HYBRID COMPOSITE SCORE (Linear Combination)
        # -------------------------------------------------------------
        composite_score = (
            weights.get('gcn', 0.35) * s_gcn +
            weights.get('trust', 0.30) * s_trust +
            weights.get('proximity', 0.10) * s_prox +
            weights.get('context', 0.15) * s_ctx +
            weights.get('behaviour', 0.10) * s_beh
        )
        composite_score = float(np.clip(composite_score, 0.0, 1.0))

        scored_item = {
            **cand,
            'scoring_mode': 'hybrid_lightgcn',
            'is_cold_start_source': is_cold_start,
            'scores': {
                'gcn': round(s_gcn, 6),
                'relevance': round(s_gcn, 6),  # Aliased to relevance for UI compatibility
                'trust': round(s_trust, 6),
                'proximity': round(s_prox, 6),
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
