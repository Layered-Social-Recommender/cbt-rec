"""
Explainability Layer (Layer 6) for CBT-Rec.
Generates truthful, evidence-based explanations connecting actual recommendation outputs,
graph connectivity, MCDM trust estimates, community membership, and missing data disclosures.
Avoids unsupported assertions regarding user character or absolute safety.
"""

from typing import Dict, Any, List

def generate_explanation(
    target_acct: str,
    candidate_record: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Generate an evidence-based explanation for a recommended account.
    """
    scores = candidate_record.get('scores', {})
    missing_flags = candidate_record.get('missing_flags', {})
    source_type = candidate_record.get('source_type', 'unknown')
    common_conn = candidate_record.get('common_connectors', [])
    cand_comm = candidate_record.get('candidate_community', -1)
    target_comm = candidate_record.get('target_community', -1)
    is_exploration = candidate_record.get('is_exploration', False)
    shared_interests = candidate_record.get('shared_interests', [])
    cand_acct = candidate_record.get('candidate_acct', '')
    is_stub = candidate_record.get('is_stub', False)

    evidence_bullets: List[str] = []
    
    # 1. Structural Evidence
    scoring_mode = candidate_record.get('scoring_mode', 'heuristic')
    s_gcn = scores.get('gcn')
    is_cold = candidate_record.get('is_cold_start_source', False)

    if scoring_mode == 'hybrid_lightgcn' and s_gcn is not None:
        if is_cold:
            evidence_bullets.append(
                f"Directed LightGCN predicted affinity: {s_gcn:.4f} (Global candidate authority prior; target account has no observed outgoing follows in training graph)."
            )
        else:
            evidence_bullets.append(
                f"Directed LightGCN predicted affinity: {s_gcn:.4f} (Learned user-to-user representation via 2-layer directed graph convolution)."
            )

    if source_type == '2_hop' and common_conn:
        conn_str = ", ".join(common_conn[:2])
        if len(common_conn) > 2:
            conn_str += f" and {len(common_conn) - 2} other(s)"
        evidence_bullets.append(
            f"2-hop network connection: Followed by your connection(s) {conn_str}."
        )
    elif source_type == 'co_following' and common_conn:
        conn_str = ", ".join(common_conn[:2])
        evidence_bullets.append(
            f"Co-following connection: Both follow {conn_str}."
        )
    elif is_exploration:
        evidence_bullets.append(
            f"Community exploration: Discovered from Community #{cand_comm} (outside your primary Community #{target_comm}) to support cross-community viewpoint discovery."
        )
    else:
        evidence_bullets.append(
            "Discovered through structural network proximity in the follow graph."
        )

    # 2. Content / Hashtags Evidence
    if shared_interests:
        tags_str = ", ".join(f"#{t}" for t in shared_interests[:3])
        evidence_bullets.append(
            f"Shared observed topic interest(s): {tags_str}."
        )

    # 3. Trust Evidence (with explicit scientific qualification)
    trust_score = scores.get('trust', 0.0)
    if not missing_flags.get('trust_missing', False):
        if trust_score >= 0.20:
            evidence_bullets.append(
                f"Platform Trustworthiness estimate: {trust_score:.4f} (High relative rank in MCDM evaluation based on observed network reciprocity and activity)."
            )
        elif trust_score >= 0.03:
            evidence_bullets.append(
                f"Platform Trustworthiness estimate: {trust_score:.4f} (Moderate relative rank in MCDM evaluation)."
            )
        else:
            evidence_bullets.append(
                f"Platform Trustworthiness estimate: {trust_score:.4f} (Relative score based on observed network interactions)."
            )
    else:
        evidence_bullets.append(
            "Trustworthiness estimate unavailable for stub account (neutral baseline assigned)."
        )

    # 4. Context / Language Evidence
    cand_lang = candidate_record.get('candidate_language')
    target_lang = candidate_record.get('target_language')
    if cand_lang and target_lang and cand_lang.lower() == target_lang.lower():
        evidence_bullets.append(
            f"Context compatibility: Matching observed language ({cand_lang.upper()})."
        )

    # 5. Missing Data Disclosures
    missing_items = []
    if missing_flags.get('hashtags_missing'):
        missing_items.append("status hashtags")
    if missing_flags.get('language_missing'):
        missing_items.append("primary language")
    if missing_flags.get('behaviour_missing'):
        missing_items.append("status-level behaviour score")
    if missing_flags.get('trust_missing'):
        missing_items.append("MCDM trust score")
    if is_stub:
        missing_items.append("complete profile (stub account)")

    missing_notice = None
    if missing_items:
        missing_notice = (
            f"Data limitation notice: Unobserved {', '.join(missing_items)}; "
            "recommendation relies on available graph structure and platform indicators."
        )

    # Primary headline summary
    if scoring_mode == 'hybrid_lightgcn' and s_gcn is not None:
        trust_val = scores.get('trust', 0.0)
        primary_reason = f"Hybrid recommendation: LightGCN affinity ({s_gcn:.4f}) & Layer 4 MCDM Trust ({trust_val:.4f})"
    elif is_exploration:
        primary_reason = f"Cross-community discovery from Community #{cand_comm} offering viewpoint diversity"
    elif source_type == '2_hop':
        primary_reason = f"Strong 2-hop network proximity via mutual follow connections"
    else:
        primary_reason = f"Relevant candidate with composite recommendation score {candidate_record.get('overall_score', 0.0):.4f}"

    return {
        'candidate_acct': cand_acct,
        'primary_reason': primary_reason,
        'evidence_bullets': evidence_bullets,
        'missing_data_notice': missing_notice,
        'scientific_disclaimer': (
            "Trust scores are relative estimates derived from observed graph metrics and MCDM weighting. "
            "They do not represent moral character or guarantee safety."
        )
    }
