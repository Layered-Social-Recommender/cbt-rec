r"""
Stage 3 Offline Evaluation Engine:
Evaluates and reconciles:
1. Existing Heuristic Hybrid Ranking (Layer 5 baseline)
2. LightGCN Affinity Alone (Directed LightGCN L=2)
3. LightGCN plus Layer 4 MCDM Trust
4. LightGCN plus MCDM Trust and Diversity-Aware Reranking (MMR lambda=0.30)

Evaluates on the leak-free structural edge split across:
- Warm-Start slice (N=5 users, 21 test positives)
- Cold-Start slice (N=15 users, 15 test positives)
- Combined test set (N=20 users, 36 test positives)

Candidate Eligibility:
- Candidate pool: V \ ({u} U N_out^train(u))
- Target user u is strictly excluded
- Training followees are strictly excluded
- Held-out test followees remain in candidate pool
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

from src.recommendation_layer.ml.dataset_split import create_structural_edge_split, DirectedEdgeSplit
from src.recommendation_layer.ml.lightgcn import DirectedLightGCN
from src.recommendation_layer.scorer import compute_candidate_scores, DEFAULT_WEIGHTS
from src.recommendation_layer.reranker import rerank_with_diversity
from src.recommendation_layer.ml.metrics import evaluate_user_ranking, aggregate_ranking_metrics

logger = logging.getLogger(__name__)


def run_stage3_evaluation(
    db_path: Optional[str] = None,
    warm_test_ratio: float = 0.20,
    cold_test_count: int = 15,
    seed: int = 42,
    output_json_path: Optional[str] = None
) -> Dict[str, Any]:
    """
    Executes leak-free evaluation of Stage 3 Hybrid ranking against baselines.
    """
    if db_path is None:
        base_dir = os.path.dirname(__file__)
        db_path = os.path.abspath(os.path.join(
            base_dir, '..', '..', '..', 'data', 'processed', 'mastodon', 'cbt_rec_dataset.db'
        ))

    conn = sqlite3.connect(db_path)
    rels_df = pd.read_sql("SELECT source_canonical, target_canonical, type FROM relationships WHERE type='follows'", conn)
    users_df = pd.read_sql("SELECT canonical_acct, is_stub FROM users", conn)
    features_df = pd.read_sql("SELECT * FROM user_features", conn)
    trust_df = pd.read_sql("SELECT * FROM user_trust", conn)
    metrics_df = pd.read_sql("SELECT * FROM graph_metrics", conn)
    conn.close()

    # 1. Structural Edge Split (leak-free)
    split = create_structural_edge_split(
        rels_df=rels_df,
        users_df=users_df,
        warm_test_ratio=warm_test_ratio,
        cold_test_count=cold_test_count,
        seed=seed
    )

    # 2. Train Directed LightGCN strictly on E_train
    lightgcn = DirectedLightGCN(
        embedding_dim=32,
        num_layers=2,
        learning_rate=0.01,
        reg_lambda=0.01,
        epochs=60,
        optimizer='adam',
        seed=seed
    )
    lightgcn.fit(split)

    # Trust map for fast lookup
    trust_map = trust_df.set_index('canonical_acct').to_dict('index') if 'canonical_acct' in trust_df.columns else {}
    metrics_map = metrics_df.set_index('canonical_acct').to_dict('index') if 'canonical_acct' in metrics_df.columns else {}
    users_map = users_df.set_index('canonical_acct').to_dict('index') if 'canonical_acct' in users_df.columns else {}

    def get_candidate_records_for_user(target: str, pool: List[str]) -> List[Dict[str, Any]]:
        """Construct candidate metadata strictly from G_train to prevent leakage."""
        target_comm = metrics_map.get(target, {}).get('community_id', -1)
        train_follows = set(split.G_train.successors(target))
        records = []
        for cand in pool:
            cand_comm = metrics_map.get(cand, {}).get('community_id', -1)
            is_stub = bool(users_map.get(cand, {}).get('is_stub', False))
            # 2-hop connectors in G_train
            cand_in = set(split.G_train.predecessors(cand))
            connectors = list(train_follows & cand_in)
            source_type = '2_hop' if len(connectors) > 0 else 'exploration'
            records.append({
                'candidate_acct': cand,
                'source_type': source_type,
                'common_connectors': connectors,
                'target_community': target_comm,
                'candidate_community': cand_comm,
                'is_exploration': (cand_comm != target_comm and cand_comm != -1),
                'is_stub': is_stub
            })
        return records

    # Define the 4 models to evaluate
    model_configs = [
        {
            'name': 'Existing Heuristic Hybrid Ranking',
            'desc': 'Layer 5 Heuristic: 0.40 Rel (Graph prox) + 0.30 Trust + 0.15 Ctx + 0.15 Beh with MMR (lambda=0.30)',
            'type': 'heuristic_hybrid'
        },
        {
            'name': 'LightGCN Affinity Alone',
            'desc': 'Directed LightGCN (L=2) pairwise score s(u, v) = sigmoid(<e_u^src, e_v^tgt> + b_v^in)',
            'type': 'lightgcn_alone'
        },
        {
            'name': 'LightGCN + MCDM Trust',
            'desc': 'Linear combination: 0.55 * LightGCN_Affinity + 0.45 * Layer4_MCDM_Trust',
            'type': 'lightgcn_trust'
        },
        {
            'name': 'LightGCN + Trust + Diversity Reranking',
            'desc': 'LightGCN + MCDM Trust combined score reranked via MMR community novelty (lambda=0.30)',
            'type': 'lightgcn_trust_diversity'
        }
    ]

    all_results = []

    for cfg in model_configs:
        m_type = cfg['type']
        warm_user_metrics = []
        cold_user_metrics = []

        # Evaluate on warm-start and cold-start slices
        for slice_name, gt_dict, dest_list in [
            ('warm', split.warm_test_ground_truth, warm_user_metrics),
            ('cold', split.cold_test_ground_truth, cold_user_metrics)
        ]:
            for target, gt in gt_dict.items():
                pool = split.get_candidate_pool(target)
                if not pool:
                    continue

                if m_type == 'lightgcn_alone':
                    ranked = lightgcn.rank_candidates(target, pool)

                elif m_type == 'heuristic_hybrid':
                    c_records = get_candidate_records_for_user(target, pool)
                    scored = compute_candidate_scores(
                        target_acct=target,
                        candidates=c_records,
                        features_df=features_df,
                        trust_df=trust_df,
                        metrics_df=metrics_df,
                        weights={'relevance': 0.40, 'trust': 0.30, 'context': 0.15, 'behaviour': 0.15}
                    )
                    reranked = rerank_with_diversity(scored, top_k=len(pool), diversity_lambda=0.30)
                    ranked = [r['candidate_acct'] for r in reranked]

                elif m_type == 'lightgcn_trust':
                    gcn_scores = lightgcn.score_candidates(target, pool)
                    scored_items = []
                    for c in pool:
                        s_gcn = gcn_scores.get(c, 0.50)
                        raw_t = trust_map.get(c, {}).get('trust_score')
                        s_trust = float(raw_t) if pd.notna(raw_t) and raw_t is not None else 0.025
                        comp_score = 0.55 * s_gcn + 0.45 * s_trust
                        scored_items.append((c, comp_score))
                    # Sort descending with deterministic alphabetical tie-breaking
                    sorted_items = sorted(scored_items, key=lambda x: (-x[1], x[0]))
                    ranked = [x[0] for x in sorted_items]

                elif m_type == 'lightgcn_trust_diversity':
                    gcn_scores = lightgcn.score_candidates(target, pool)
                    c_records = get_candidate_records_for_user(target, pool)
                    scored_for_mmr = []
                    for c_rec in c_records:
                        c = c_rec['candidate_acct']
                        s_gcn = gcn_scores.get(c, 0.50)
                        raw_t = trust_map.get(c, {}).get('trust_score')
                        s_trust = float(raw_t) if pd.notna(raw_t) and raw_t is not None else 0.025
                        comp_score = 0.55 * s_gcn + 0.45 * s_trust
                        c_copy = dict(c_rec)
                        c_copy['scores'] = {'composite': comp_score, 'gcn': s_gcn, 'trust': s_trust}
                        scored_for_mmr.append(c_copy)
                    # Sort descending
                    scored_for_mmr.sort(key=lambda x: x['scores']['composite'], reverse=True)
                    reranked = rerank_with_diversity(scored_for_mmr, top_k=len(pool), diversity_lambda=0.30)
                    ranked = [r['candidate_acct'] for r in reranked]

                u_m = evaluate_user_ranking(ranked, gt, k_list=[5, 10])
                if u_m is not None:
                    # Diversity Measurements
                    comms5 = [metrics_map.get(c, {}).get('community_id', -1) for c in ranked[:5]]
                    comms10 = [metrics_map.get(c, {}).get('community_id', -1) for c in ranked[:10]]
                    
                    def calc_ild(comms):
                        k = len(comms)
                        if k <= 1:
                            return 0.0
                        diffs = sum(1 for i in range(k) for j in range(k) if i != j and comms[i] != comms[j])
                        return diffs / float(k * (k - 1))

                    u_m['unique_communities@5'] = float(len(set(comms5)))
                    u_m['unique_communities@10'] = float(len(set(comms10)))
                    u_m['ild@5'] = float(calc_ild(comms5))
                    u_m['ild@10'] = float(calc_ild(comms10))
                    dest_list.append(u_m)

        warm_agg = aggregate_ranking_metrics(warm_user_metrics)
        cold_agg = aggregate_ranking_metrics(cold_user_metrics)
        comb_agg = aggregate_ranking_metrics(warm_user_metrics + cold_user_metrics)

        all_results.append({
            'model_name': cfg['name'],
            'model_description': cfg['desc'],
            'warm_start_evaluation': warm_agg,
            'cold_start_evaluation': cold_agg,
            'combined_evaluation': comb_agg
        })

    record = {
        'experiment_title': 'CBT-Rec Stage 3: Hybrid LightGCN + MCDM Trust Ranking Evaluation',
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'dataset_provenance': 'Bounded Mastodon snapshot (270 accounts, 214 follow edges)',
        'split_summary': split.get_summary(),
        'results': all_results
    }

    if output_json_path is None:
        base_dir = os.path.dirname(__file__)
        output_json_path = os.path.abspath(os.path.join(
            base_dir, '..', '..', '..', 'data', 'processed', 'mastodon', 'stage3_hybrid_experiments.json'
        ))

    os.makedirs(os.path.dirname(output_json_path), exist_ok=True)
    with open(output_json_path, 'w', encoding='utf-8') as f:
        json.dump(record, f, indent=2)

    return record


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    res = run_stage3_evaluation()
    print("\n" + "=" * 130)
    print(f"{'Model Name':38s} | {'Slice':8s} | {'NDCG@10':9s} {'MRR':9s} {'Recall@5':9s} {'Comm@5':8s} {'Comm@10':8s} {'ILD@10':8s}")
    print("=" * 130)
    for r in res['results']:
        name = r['model_name']
        for s_name, s_key in [('Warm', 'warm_start_evaluation'), ('Cold', 'cold_start_evaluation'), ('Combined', 'combined_evaluation')]:
            s = r[s_key]['summary']
            ndcg = s['ndcg@10']['mean']
            mrr = s['mrr']['mean']
            r5 = s['recall@5']['mean']
            c5 = s.get('unique_communities@5', {}).get('mean', 0.0)
            c10 = s.get('unique_communities@10', {}).get('mean', 0.0)
            ild10 = s.get('ild@10', {}).get('mean', 0.0)
            print(f"{name:38s} | {s_name:8s} | {ndcg:9.4f} {mrr:9.4f} {r5:9.4f} {c5:8.2f} {c10:8.2f} {ild10:8.4f}")
        print("-" * 130)
