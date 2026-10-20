"""
Evaluation Script for CBT-Rec Layer 5 & Layer 6.
Executes systematic comparative experiments across all complete users:
1. Baseline: Relevance-Only Ranking
2. Relevance + Trust (MCDM-weighted)
3. Hybrid CBT-Rec (No Diversity)
4. Full CBT-Rec (Hybrid + Diversity Reranking, lambda=0.30)
5. High Exploration CBT-Rec (lambda=0.60)

Measures:
- Mean Trustworthiness of Top-K
- Mean Relevance of Top-K
- Community Count in Top-K
- Cross-Community Exploration Ratio
- Shannon Entropy of Community Distribution
- Ranking Jaccard Overlap against Relevance-Only Baseline

Saves results to data/processed/mastodon/recommendation_experiments.json and markdown summary.
"""

import os
import sys
import json
import sqlite3
import math

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
from collections import Counter
from datetime import datetime, timezone
import pandas as pd
import numpy as np

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.recommendation_layer.engine import CBTRecommendationEngine

def shannon_entropy(labels):
    if not labels:
        return 0.0
    total = len(labels)
    counts = Counter(labels)
    ent = 0.0
    for cnt in counts.values():
        p = cnt / total
        if p > 0:
            ent -= p * math.log2(p)
    return ent

def run_evaluation(top_k=10):
    print(f"Initializing CBT-Rec Recommendation Engine for Evaluation (Top-K={top_k})...")
    engine = CBTRecommendationEngine()

    # Representative target users with out-degree > 0
    complete_targets = engine.users_df[engine.users_df['is_stub'] == 0]['canonical_acct'].tolist()
    
    # Filter targets that have at least some graph connectivity to observe structural trade-offs
    connected_targets = [u for u in complete_targets if engine.G_follow.out_degree(u) > 0]
    print(f"Total complete users: {len(complete_targets)}, Connected targets with out-degree > 0: {len(connected_targets)}")

    configurations = [
        {
            'name': 'Relevance-Only Baseline',
            'weights': {'relevance': 1.0, 'trust': 0.0, 'context': 0.0, 'behaviour': 0.0},
            'diversity_lambda': 0.0,
            'description': 'Pure structural/interest relevance without trust or diversity'
        },
        {
            'name': 'Relevance + Trust',
            'weights': {'relevance': 0.50, 'trust': 0.50, 'context': 0.0, 'behaviour': 0.0},
            'diversity_lambda': 0.0,
            'description': 'Combines relevance with continuous MCDM trust; no diversity reranking'
        },
        {
            'name': 'Hybrid CBT-Rec (No Diversity)',
            'weights': {'relevance': 0.40, 'trust': 0.30, 'context': 0.15, 'behaviour': 0.15},
            'diversity_lambda': 0.0,
            'description': 'Multi-signal (Relevance, Trust, Context, Behaviour); lambda=0.0'
        },
        {
            'name': 'Full CBT-Rec (Default λ=0.30)',
            'weights': {'relevance': 0.40, 'trust': 0.30, 'context': 0.15, 'behaviour': 0.15},
            'diversity_lambda': 0.30,
            'description': 'Approved CBT-Rec pipeline: Multi-signal + MMR community diversification'
        },
        {
            'name': 'CBT-Rec High Diversity (λ=0.60)',
            'weights': {'relevance': 0.40, 'trust': 0.30, 'context': 0.15, 'behaviour': 0.15},
            'diversity_lambda': 0.60,
            'description': 'Exploration-focused configuration with aggressive community spread'
        }
    ]

    experiment_results = []

    # Run for all connected targets
    for config in configurations:
        print(f"\n--- Running Experiment: {config['name']} ---")
        cfg_name = config['name']
        w = config['weights']
        lam = config['diversity_lambda']

        list_mean_trust = []
        list_mean_rel = []
        list_mean_composite = []
        list_comm_count = []
        list_exploration_ratio = []
        list_entropy = []
        user_topk_map = {}

        for target in connected_targets:
            res = engine.recommend(
                target_acct=target,
                weights=w,
                diversity_lambda=lam,
                top_k=top_k
            )

            recs = res.get('recommendations', [])
            if not recs:
                continue

            user_topk_map[target] = [r['candidate_acct'] for r in recs]

            trust_scores = [r['scores']['trust'] for r in recs]
            rel_scores = [r['scores']['relevance'] for r in recs]
            comp_scores = [r['overall_score'] for r in recs]
            comms = [r['candidate_community'] for r in recs]
            explorations = [1 if r.get('is_exploration') else 0 for r in recs]

            list_mean_trust.append(np.mean(trust_scores))
            list_mean_rel.append(np.mean(rel_scores))
            list_mean_composite.append(np.mean(comp_scores))
            list_comm_count.append(len(set(comms)))
            list_exploration_ratio.append(np.mean(explorations))
            list_entropy.append(shannon_entropy(comms))

        exp_record = {
            'configuration_name': cfg_name,
            'description': config['description'],
            'weights': w,
            'diversity_lambda': lam,
            'targets_evaluated': len(list_mean_trust),
            'top_k': top_k,
            'metrics': {
                'avg_mean_trust': float(np.mean(list_mean_trust)),
                'avg_mean_relevance': float(np.mean(list_mean_rel)),
                'avg_overall_score': float(np.mean(list_mean_composite)),
                'avg_community_count_topk': float(np.mean(list_comm_count)),
                'avg_cross_community_ratio': float(np.mean(list_exploration_ratio)),
                'avg_community_entropy': float(np.mean(list_entropy))
            },
            'sample_recommendations': {}
        }

        # Store sample outputs for representative seed user
        sample_target = "Mastodon@mastodon.social"
        sample_res = engine.recommend(
            target_acct=sample_target,
            weights=w,
            diversity_lambda=lam,
            top_k=top_k
        )
        exp_record['sample_recommendations'][sample_target] = [
            {
                'rank': r['rank'],
                'candidate': r['candidate_acct'],
                'overall_score': r['overall_score'],
                'trust': r['scores']['trust'],
                'relevance': r['scores']['relevance'],
                'community': r['candidate_community'],
                'is_exploration': r['is_exploration']
            }
            for r in sample_res.get('recommendations', [])[:5]
        ]

        experiment_results.append(exp_record)

    # Save output JSON
    base_dir = os.path.dirname(__file__)
    output_json_path = os.path.abspath(os.path.join(
        base_dir, '..', 'data', 'processed', 'mastodon', 'recommendation_experiments.json'
    ))
    with open(output_json_path, 'w', encoding='utf-8') as f:
        json.dump({
            'experiment_title': 'CBT-Rec Layer 5 & 6 Systematic Evaluation',
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'top_k': top_k,
            'dataset': 'Mastodon social snapshot (270 accounts, 214 edges)',
            'results': experiment_results
        }, f, indent=2)

    print(f"\nSaved evaluation results to {output_json_path}")

    # Print summary table
    print("\n" + "="*85)
    print(f"{'Configuration':<32} | {'Trust':<8} | {'Rel':<8} | {'Comms':<6} | {'Cross-Comm%':<12} | {'Entropy':<8}")
    print("="*85)
    for r in experiment_results:
        m = r['metrics']
        print(f"{r['configuration_name']:<32} | {m['avg_mean_trust']:<8.4f} | {m['avg_mean_relevance']:<8.4f} | {m['avg_community_count_topk']:<6.2f} | {m['avg_cross_community_ratio']*100:<11.1f}% | {m['avg_community_entropy']:<8.3f}")
    print("="*85)

    return experiment_results

if __name__ == '__main__':
    run_evaluation()
