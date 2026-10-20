"""
CBT-Rec Layer 5 Engine Orchestrator.
Integrates:
- Candidate Generation
- Multi-Signal Scoring (Relevance, Context, Behaviour, Trust)
- Diversity-Aware Reranking (MMR with Community Spread)
- Layer 6 Explainability
- Persistence to user_recommendations table in SQLite
- Dynamic CLI and API invocation support
"""

import os
import sys
import json
import sqlite3
import argparse
import logging
from datetime import datetime, timezone
import uuid
from typing import Dict, List, Any, Optional

import pandas as pd
import networkx as nx

# Local imports
from src.recommendation_layer.candidate_generator import generate_candidates
from src.recommendation_layer.scorer import compute_candidate_scores, DEFAULT_WEIGHTS
from src.recommendation_layer.hybrid_scorer import compute_hybrid_candidate_scores, DEFAULT_HYBRID_WEIGHTS
from src.recommendation_layer.ml.lightgcn import DirectedLightGCN
from src.recommendation_layer.reranker import rerank_with_diversity
from src.explainability_layer.explainer import generate_explanation

logger = logging.getLogger(__name__)

ALGORITHM_VERSION_HEURISTIC = "CBT-Rec-v1.0-Hybrid-MMR"
ALGORITHM_VERSION_LIGHTGCN = "CBT-Rec-v1.1-Hybrid-LightGCN-MMR"
ALGORITHM_VERSION = ALGORITHM_VERSION_HEURISTIC

class CBTRecommendationEngine:
    def __init__(self, db_path: Optional[str] = None):
        if db_path is None:
            base_dir = os.path.dirname(__file__)
            db_path = os.path.abspath(os.path.join(
                base_dir, '..', '..', 'data', 'processed', 'mastodon', 'cbt_rec_dataset.db'
            ))
        self.db_path = db_path
        self.lightgcn_model: Optional[DirectedLightGCN] = None
        self._load_data()

    def _load_data(self):
        if not os.path.exists(self.db_path):
            raise FileNotFoundError(f"Database not found at {self.db_path}")

        conn = sqlite3.connect(self.db_path)
        self.users_df = pd.read_sql("SELECT * FROM users", conn)
        self.rels_df = pd.read_sql("SELECT source_canonical, target_canonical, type FROM relationships WHERE type='follows'", conn)
        self.features_df = pd.read_sql("SELECT * FROM user_features", conn)
        self.trust_df = pd.read_sql("SELECT * FROM user_trust", conn)
        self.metrics_df = pd.read_sql("SELECT * FROM graph_metrics", conn)
        conn.close()

        # Build follow graph
        self.G_follow = nx.DiGraph()
        for _, row in self.users_df.iterrows():
            self.G_follow.add_node(row['canonical_acct'], is_stub=bool(row.get('is_stub', False)))
        for _, row in self.rels_df.iterrows():
            self.G_follow.add_edge(row['source_canonical'], row['target_canonical'])

    def get_or_train_lightgcn(
        self,
        embedding_dim: int = 32,
        num_layers: int = 2,
        epochs: int = 60,
        seed: int = 42
    ) -> DirectedLightGCN:
        """
        Lazily trains and caches a DirectedLightGCN model on the full observed follow graph
        for production inference.
        """
        if self.lightgcn_model is not None:
            return self.lightgcn_model

        from src.recommendation_layer.ml.dataset_split import DirectedEdgeSplit
        all_nodes = sorted(self.users_df['canonical_acct'].unique().tolist())
        train_edges = [
            (str(row['source_canonical']), str(row['target_canonical']))
            for _, row in self.rels_df.iterrows()
            if row.get('type', 'follows') == 'follows'
        ]
        split = DirectedEdgeSplit(
            all_nodes=all_nodes,
            train_edges=train_edges,
            warm_test_edges=[],
            cold_test_edges=[],
            seed=seed
        )
        model = DirectedLightGCN(
            embedding_dim=embedding_dim,
            num_layers=num_layers,
            learning_rate=0.01,
            reg_lambda=0.01,
            epochs=epochs,
            optimizer='adam',
            seed=seed
        )
        model.fit(split)
        self.lightgcn_model = model
        return self.lightgcn_model

    def recommend(
        self,
        target_acct: str,
        weights: Optional[Dict[str, float]] = None,
        diversity_lambda: float = 0.30,
        top_k: int = 10,
        exploration_ratio: float = 0.30,
        max_candidates: int = 50,
        scoring_mode: str = 'heuristic',
        lightgcn_model: Optional[DirectedLightGCN] = None
    ) -> Dict[str, Any]:
        """
        Generate top-k recommendations with explanations for target_acct.
        Args:
            scoring_mode: 'heuristic' (Layer 5 heuristic proximity baseline) or
                          'hybrid_lightgcn' (Stage 3 Directed LightGCN + MCDM Trust).
        """
        # ISO-8601 UTC timestamp formatted cleanly for JavaScript Date.parse()
        run_timestamp = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        algo_version = (
            ALGORITHM_VERSION_LIGHTGCN if scoring_mode == 'hybrid_lightgcn'
            else ALGORITHM_VERSION_HEURISTIC
        )
        default_w = (
            DEFAULT_HYBRID_WEIGHTS if scoring_mode == 'hybrid_lightgcn'
            else DEFAULT_WEIGHTS
        )
        active_weights = weights or default_w
        
        # 1. Candidate Generation (filters self and existing followees)
        candidates, cand_meta = generate_candidates(
            target_acct=target_acct,
            G_follow=self.G_follow,
            users_df=self.users_df,
            metrics_df=self.metrics_df,
            exploration_ratio=exploration_ratio,
            max_candidates=max_candidates
        )

        if not candidates:
            return {
                'target_acct': target_acct,
                'status': 'no_candidates',
                'message': 'No candidates could be generated for this account.',
                'meta': cand_meta,
                'recommendations': [],
                'weights': active_weights,
                'scoring_mode': scoring_mode,
                'diversity_lambda': diversity_lambda,
                'algorithm_version': algo_version,
                'timestamp': run_timestamp
            }

        # 2. Multi-Signal Scoring
        if scoring_mode == 'hybrid_lightgcn':
            if lightgcn_model is None:
                lightgcn_model = self.get_or_train_lightgcn()
            scored = compute_hybrid_candidate_scores(
                target_acct=target_acct,
                candidates=candidates,
                features_df=self.features_df,
                trust_df=self.trust_df,
                metrics_df=self.metrics_df,
                lightgcn_model=lightgcn_model,
                weights=active_weights
            )
        else:
            scored = compute_candidate_scores(
                target_acct=target_acct,
                candidates=candidates,
                features_df=self.features_df,
                trust_df=self.trust_df,
                metrics_df=self.metrics_df,
                weights=active_weights
            )

        # 3. Diversity Reranking
        reranked = rerank_with_diversity(
            scored_candidates=scored,
            top_k=top_k,
            diversity_lambda=diversity_lambda
        )

        # 4. Attach Layer 6 Explanations
        final_recommendations = []
        for rec in reranked:
            explanation = generate_explanation(target_acct, rec)
            rec['explanation'] = explanation
            final_recommendations.append(rec)

        return {
            'target_acct': target_acct,
            'status': 'success',
            'scoring_mode': scoring_mode,
            'target_community': cand_meta.get('target_community', -1),
            'candidate_generation_meta': cand_meta,
            'weights': active_weights,
            'diversity_lambda': diversity_lambda,
            'top_k': top_k,
            'total_candidates_evaluated': len(candidates),
            'recommendations': final_recommendations,
            'algorithm_version': algo_version,
            'timestamp': run_timestamp
        }

    def save_recommendations_to_db(self, all_results: List[Dict[str, Any]], run_id: Optional[str] = None):
        """
        Persist recommendation outputs to SQLite table user_recommendations.
        """
        if run_id is None:
            run_id = str(uuid.uuid4())

        records = []
        for res in all_results:
            target = res['target_acct']
            for rec in res.get('recommendations', []):
                records.append({
                    'run_id': run_id,
                    'target_canonical': target,
                    'candidate_canonical': rec['candidate_acct'],
                    'rank': rec['rank'],
                    'overall_score': rec['overall_score'],
                    'relevance_score': rec['scores']['relevance'],
                    'trust_score': rec['scores']['trust'],
                    'context_score': rec['scores']['context'],
                    'behaviour_score': rec['scores']['behaviour'],
                    'target_community': rec['target_community'],
                    'candidate_community': rec['candidate_community'],
                    'is_exploration': int(rec.get('is_exploration', False)),
                    'source_type': rec.get('source_type', 'unknown'),
                    'missing_flags': json.dumps(rec.get('missing_flags', {})),
                    'explanation_json': json.dumps(rec.get('explanation', {})),
                    'algorithm_version': ALGORITHM_VERSION,
                    'created_at': res.get('timestamp')
                })

        if not records:
            return

        df_out = pd.DataFrame(records)
        conn = sqlite3.connect(self.db_path)
        
        # Ensure schema
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_recommendations (
                run_id TEXT,
                target_canonical TEXT,
                candidate_canonical TEXT,
                rank INTEGER,
                overall_score REAL,
                relevance_score REAL,
                trust_score REAL,
                context_score REAL,
                behaviour_score REAL,
                target_community INTEGER,
                candidate_community INTEGER,
                is_exploration INTEGER,
                source_type TEXT,
                missing_flags TEXT,
                explanation_json TEXT,
                algorithm_version TEXT,
                created_at TEXT,
                PRIMARY KEY (run_id, target_canonical, rank)
            )
        """)
        conn.commit()

        df_out.to_sql('user_recommendations', conn, if_exists='append', index=False)
        conn.close()
        logger.info(f"Persisted {len(records)} recommendations to user_recommendations table (run_id={run_id}).")

    def precompute_all(self, top_k: int = 10, diversity_lambda: float = 0.30):
        """
        Precompute recommendations for all complete users (205 accounts)
        and persist them into the user_recommendations table.
        """
        logger.info(f"Precomputing recommendations for all users (top_k={top_k}, lambda={diversity_lambda})...")
        complete_users = self.users_df[self.users_df['is_stub'] == 0]['canonical_acct'].tolist()
        
        all_results = []
        for acct in complete_users:
            res = self.recommend(
                target_acct=acct,
                diversity_lambda=diversity_lambda,
                top_k=top_k
            )
            if res.get('status') == 'success' and len(res.get('recommendations', [])) > 0:
                all_results.append(res)

        run_id = f"precompute_{int(datetime.now(timezone.utc).timestamp())}"
        self.save_recommendations_to_db(all_results, run_id=run_id)
        logger.info(f"Successfully precomputed recommendations for {len(all_results)} complete users.")
        return len(all_results)

def main():
    parser = argparse.ArgumentParser(description="CBT-Rec Recommendation Engine CLI")
    parser.add_argument("--target", type=str, help="Target canonical account ID")
    parser.add_argument("--top_k", type=int, default=10, help="Number of recommendations")
    parser.add_argument("--lambda_div", type=float, default=0.30, help="Diversity weight in [0, 1]")
    parser.add_argument("--w_rel", type=float, default=0.40, help="Relevance weight")
    parser.add_argument("--w_trust", type=float, default=0.30, help="Trust weight")
    parser.add_argument("--w_ctx", type=float, default=0.15, help="Context weight")
    parser.add_argument("--w_beh", type=float, default=0.15, help="Behaviour weight")
    parser.add_argument("--scoring_mode", type=str, default="heuristic", choices=["heuristic", "hybrid_lightgcn"],
                        help="Scoring mode: heuristic (Layer 5 baseline) or hybrid_lightgcn (Stage 3 LightGCN + MCDM Trust)")
    parser.add_argument("--w_gcn", type=float, default=0.35, help="LightGCN weight (for hybrid_lightgcn mode)")
    parser.add_argument("--w_prox", type=float, default=0.10, help="Proximity weight (for hybrid_lightgcn mode)")
    parser.add_argument("--precompute", action="store_true", help="Precompute for all complete users")
    parser.add_argument("--json", action="store_true", help="Output JSON only")
    
    args = parser.parse_args()

    engine = CBTRecommendationEngine()

    if args.precompute:
        count = engine.precompute_all(top_k=args.top_k, diversity_lambda=args.lambda_div)
        print(f"Precomputed recommendations for {count} users.")
        return

    target = args.target or "Mastodon@mastodon.social"
    if args.scoring_mode == 'hybrid_lightgcn':
        custom_weights = {
            'gcn': args.w_gcn,
            'trust': args.w_trust,
            'proximity': args.w_prox,
            'context': args.w_ctx,
            'behaviour': args.w_beh
        }
    else:
        custom_weights = {
            'relevance': args.w_rel,
            'trust': args.w_trust,
            'context': args.w_ctx,
            'behaviour': args.w_beh
        }

    res = engine.recommend(
        target_acct=target,
        weights=custom_weights,
        diversity_lambda=args.lambda_div,
        top_k=args.top_k,
        scoring_mode=args.scoring_mode
    )

    if args.json:
        print(json.dumps(res, indent=2))
    else:
        print(f"=== RECOMMENDATIONS FOR: {res['target_acct']} (Mode: {res.get('scoring_mode', 'heuristic')}, Community #{res.get('target_community')}) ===")
        print(f"Algorithm version: {res.get('algorithm_version')}")
        print(f"Evaluated {res.get('total_candidates_evaluated')} candidates. Top {len(res.get('recommendations', []))} shown:\n")
        for rec in res.get('recommendations', []):
            print(f"#{rec['rank']} | {rec['candidate_acct']} | Overall: {rec['overall_score']:.4f}")
            scores = rec['scores']
            if rec.get('scoring_mode') == 'hybrid_lightgcn':
                print(f"    Sub-scores: GCN={scores.get('gcn', 0.0):.3f}, Trust={scores.get('trust', 0.0):.3f}, Prox={scores.get('proximity', 0.0):.3f}, Ctx={scores.get('context', 0.0):.3f}, Beh={scores.get('behaviour', 0.0):.3f}")
            else:
                print(f"    Sub-scores: Rel={scores.get('relevance', 0.0):.3f}, Trust={scores.get('trust', 0.0):.3f}, Ctx={scores.get('context', 0.0):.3f}, Beh={scores.get('behaviour', 0.0):.3f}")
            print(f"    Community: #{rec['candidate_community']} (Exploration: {rec['is_exploration']}) | Source: {rec['source_type']}")
            print(f"    Reason: {rec['explanation']['primary_reason']}")
            for b in rec['explanation']['evidence_bullets']:
                print(f"      * {b}")
            if rec['explanation'].get('missing_data_notice'):
                print(f"      [Notice] {rec['explanation']['missing_data_notice']}")
            print()

if __name__ == '__main__':
    main()
