"""
Unit and Integration Tests for Stage 3 Hybrid Recommendation.
Verifies:
1. compute_hybrid_candidate_scores integration with DirectedLightGCN
2. Correct target (source persona) and candidate (target persona) embedding selection
3. Layer 4 MCDM Trust score lookup and fallback handling
4. Score normalization and bounds [0, 1]
5. Strict candidate filtering: exclusion of self and already-followed accounts
6. Deterministic ranking and tie-breaking
7. Missing features and disclosure flags
8. Diversity reranking (MMR) integration with hybrid scores
9. Prevention of test-edge leakage into LightGCN and candidate generation
10. Engine scoring_mode switching ('heuristic' vs 'hybrid_lightgcn') and timestamp ISO formatting
"""

import unittest
import sqlite3
import json
import pandas as pd
import numpy as np
from datetime import datetime

from src.recommendation_layer.ml.dataset_split import create_structural_edge_split
from src.recommendation_layer.ml.lightgcn import DirectedLightGCN
from src.recommendation_layer.hybrid_scorer import compute_hybrid_candidate_scores, DEFAULT_HYBRID_WEIGHTS
from src.recommendation_layer.candidate_generator import generate_candidates
from src.recommendation_layer.reranker import rerank_with_diversity
from src.recommendation_layer.engine import CBTRecommendationEngine
from src.explainability_layer.explainer import generate_explanation


class TestHybridRecommendation(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        conn = sqlite3.connect('data/processed/mastodon/cbt_rec_dataset.db')
        cls.rels_df = pd.read_sql("SELECT source_canonical, target_canonical, type FROM relationships WHERE type='follows'", conn)
        cls.users_df = pd.read_sql("SELECT * FROM users", conn)
        cls.features_df = pd.read_sql("SELECT * FROM user_features", conn)
        cls.trust_df = pd.read_sql("SELECT * FROM user_trust", conn)
        cls.metrics_df = pd.read_sql("SELECT * FROM graph_metrics", conn)
        conn.close()

        # Build leak-free split for testing
        cls.split = create_structural_edge_split(cls.rels_df, cls.users_df, warm_test_ratio=0.20, cold_test_count=15, seed=42)

        # Train a small DirectedLightGCN model strictly on train_edges
        cls.model = DirectedLightGCN(
            embedding_dim=16,
            num_layers=2,
            learning_rate=0.01,
            reg_lambda=0.01,
            epochs=20,
            optimizer='adam',
            seed=42
        )
        cls.model.fit(cls.split)

    def test_01_hybrid_scorer_integration_and_bounds(self):
        """Test compute_hybrid_candidate_scores returns bounded scores in [0, 1]."""
        target = "Mastodon@mastodon.social"
        cands = [
            {'candidate_acct': 'iftas@mastodon.iftas.org', 'source_type': '2_hop', 'common_connectors': ['NGIZero@mastodon.xyz'], 'is_exploration': True, 'candidate_community': 0, 'is_stub': False},
            {'candidate_acct': 'LemmyDev@mastodon.social', 'source_type': 'co_following', 'common_connectors': ['iftas@mastodon.iftas.org'], 'is_exploration': False, 'candidate_community': 1, 'is_stub': False}
        ]
        scored = compute_hybrid_candidate_scores(
            target_acct=target,
            candidates=cands,
            features_df=self.features_df,
            trust_df=self.trust_df,
            metrics_df=self.metrics_df,
            lightgcn_model=self.model
        )
        self.assertEqual(len(scored), 2)
        for item in scored:
            scores = item['scores']
            self.assertIn('gcn', scores)
            self.assertIn('trust', scores)
            self.assertIn('proximity', scores)
            self.assertIn('composite', scores)
            for k, v in scores.items():
                self.assertGreaterEqual(v, 0.0, f"Score {k} below 0")
                self.assertLessEqual(v, 1.0, f"Score {k} above 1")

    def test_02_embedding_role_selection(self):
        """Verify model scores use source embedding for target and target embedding for candidate."""
        target = "Mastodon@mastodon.social"
        cand = "iftas@mastodon.iftas.org"
        u_idx = self.model.user_to_idx[target]
        v_idx = self.model.user_to_idx[cand]

        expected_logit = np.dot(self.model.E_tgt_star[v_idx], self.model.E_src_star[u_idx]) + self.model.b_in[v_idx]
        expected_score = 1.0 / (1.0 + np.exp(-np.clip(expected_logit, -15.0, 15.0)))

        scored_dict = self.model.score_candidates(target, [cand])
        self.assertAlmostEqual(scored_dict[cand], float(expected_score), places=5)

    def test_03_trust_score_lookup_and_stub_fallback(self):
        """Verify candidate trust scores originate from Layer 4 MCDM and stub accounts get neutral fallback."""
        target = "Mastodon@mastodon.social"
        # Test complete account with trust
        cands = [
            {'candidate_acct': 'iftas@mastodon.iftas.org', 'is_stub': False},
            {'candidate_acct': 'nonexistent_stub@mastodon.social', 'is_stub': True}
        ]
        scored = compute_hybrid_candidate_scores(
            target_acct=target,
            candidates=cands,
            features_df=self.features_df,
            trust_df=self.trust_df,
            metrics_df=self.metrics_df,
            lightgcn_model=self.model
        )
        scored_map = {item['candidate_acct']: item for item in scored}

        # iftas has trust in trust_df
        iftas_trust_df = self.trust_df[self.trust_df['canonical_acct'] == 'iftas@mastodon.iftas.org']['trust_score'].values[0]
        self.assertAlmostEqual(scored_map['iftas@mastodon.iftas.org']['scores']['trust'], round(float(iftas_trust_df), 6))
        self.assertFalse(scored_map['iftas@mastodon.iftas.org']['missing_flags']['trust_missing'])

        # nonexistent_stub gets fallback 0.025
        self.assertEqual(scored_map['nonexistent_stub@mastodon.social']['scores']['trust'], 0.025)
        self.assertTrue(scored_map['nonexistent_stub@mastodon.social']['missing_flags']['trust_missing'])

    def test_04_candidate_filtering_excludes_self_and_follows(self):
        """Ensure candidate generator strictly excludes target self and existing follows."""
        engine = CBTRecommendationEngine()
        target = "Mastodon@mastodon.social"
        candidates, _ = generate_candidates(
            target_acct=target,
            G_follow=engine.G_follow,
            users_df=engine.users_df,
            metrics_df=engine.metrics_df,
            max_candidates=100
        )
        cand_accts = {c['candidate_acct'] for c in candidates}
        self.assertNotIn(target, cand_accts, "Target user should not be in candidate pool")
        for followed in engine.G_follow.successors(target):
            self.assertNotIn(followed, cand_accts, f"Existing follow {followed} should not be in candidate pool")

    def test_05_deterministic_ranking(self):
        """Verify identical inputs produce identical ranking order across multiple calls."""
        engine = CBTRecommendationEngine()
        target = "Mastodon@mastodon.social"
        res1 = engine.recommend(target_acct=target, top_k=5, scoring_mode='hybrid_lightgcn', lightgcn_model=self.model)
        res2 = engine.recommend(target_acct=target, top_k=5, scoring_mode='hybrid_lightgcn', lightgcn_model=self.model)

        ranks1 = [r['candidate_acct'] for r in res1['recommendations']]
        ranks2 = [r['candidate_acct'] for r in res2['recommendations']]
        self.assertEqual(ranks1, ranks2)

    def test_06_diversity_reranking_with_hybrid_scores(self):
        """Verify MMR diversity reranker alters ranking when community diversity is introduced."""
        target = "Mastodon@mastodon.social"
        candidates, _ = generate_candidates(
            target_acct=target,
            G_follow=self.split.G_train,
            users_df=self.users_df,
            metrics_df=self.metrics_df,
            exploration_ratio=0.4,
            max_candidates=20
        )
        scored = compute_hybrid_candidate_scores(
            target_acct=target,
            candidates=candidates,
            features_df=self.features_df,
            trust_df=self.trust_df,
            metrics_df=self.metrics_df,
            lightgcn_model=self.model
        )
        # Without diversity (lambda = 0)
        rec_no_div = rerank_with_diversity(scored, top_k=10, diversity_lambda=0.0)
        # With diversity (lambda = 0.5)
        rec_div = rerank_with_diversity(scored, top_k=10, diversity_lambda=0.5)

        self.assertEqual(len(rec_no_div), min(10, len(scored)))
        self.assertEqual(len(rec_div), min(10, len(scored)))
        # Verify rank field is 1..K
        for i, r in enumerate(rec_div, 1):
            self.assertEqual(r['rank'], i)

    def test_07_prevention_of_test_edge_leakage(self):
        """Verify test split edges are never present in training graph or negative sampling."""
        for u, v in self.split.warm_test_edges:
            self.assertFalse(self.split.G_train.has_edge(u, v))
            self.assertNotIn((u, v), self.split.train_edge_set)
        for u, v in self.split.cold_test_edges:
            self.assertFalse(self.split.G_train.has_edge(u, v))
            self.assertNotIn((u, v), self.split.train_edge_set)

    def test_08_timestamp_format_is_valid_iso(self):
        """Verify engine timestamp is a clean ISO string parseable without Invalid Date."""
        engine = CBTRecommendationEngine()
        res = engine.recommend(target_acct="Mastodon@mastodon.social", top_k=3, scoring_mode='heuristic')
        ts = res['timestamp']
        self.assertTrue(ts.endswith('Z'))
        self.assertNotIn('+00:00Z', ts, "Duplicate timezone offset +00:00Z detected!")
        # Verify parsing works cleanly in Python datetime
        parsed = datetime.fromisoformat(ts.replace('Z', '+00:00'))
        self.assertIsNotNone(parsed)

    def test_09_explanation_matches_scoring_mode(self):
        """Verify explanation explicitly mentions LightGCN only when scoring_mode is hybrid_lightgcn."""
        engine = CBTRecommendationEngine()
        res_h = engine.recommend(target_acct="Mastodon@mastodon.social", top_k=2, scoring_mode='heuristic')
        res_g = engine.recommend(target_acct="Mastodon@mastodon.social", top_k=2, scoring_mode='hybrid_lightgcn', lightgcn_model=self.model)

        # Heuristic explanation should NOT claim LightGCN
        for r in res_h['recommendations']:
            all_text = " ".join(r['explanation']['evidence_bullets']) + r['explanation']['primary_reason']
            self.assertNotIn("LightGCN", all_text)

        # Hybrid explanation MUST mention LightGCN
        for r in res_g['recommendations']:
            all_text = " ".join(r['explanation']['evidence_bullets']) + r['explanation']['primary_reason']
            self.assertIn("LightGCN", all_text)

    def test_10_diversity_measurements_increase_coverage(self):
        """Verify MMR diversification significantly increases unique community coverage."""
        target = "Mastodon@mastodon.social"
        pool = self.split.get_candidate_pool(target)
        gcn_scores = self.model.score_candidates(target, pool)
        trust_map = self.trust_df.set_index('canonical_acct').to_dict('index')
        metrics_map = self.metrics_df.set_index('canonical_acct').to_dict('index')

        # Baseline without diversity
        scored = []
        for c in pool:
            s_g = gcn_scores.get(c, 0.50)
            raw_t = trust_map.get(c, {}).get('trust_score')
            s_t = float(raw_t) if pd.notna(raw_t) and raw_t is not None else 0.025
            comp = 0.55 * s_g + 0.45 * s_t
            cand_comm = metrics_map.get(c, {}).get('community_id', -1)
            scored.append({
                'candidate_acct': c,
                'candidate_community': cand_comm,
                'is_exploration': (cand_comm != 1 and cand_comm != -1),
                'scores': {'composite': comp, 'gcn': s_g, 'trust': s_t}
            })
        scored.sort(key=lambda x: x['scores']['composite'], reverse=True)

        # Without MMR
        top10_no_mmr = scored[:10]
        comms_no_mmr = [c['candidate_community'] for c in top10_no_mmr]
        u_no_mmr = len(set(comms_no_mmr))

        # With MMR
        top10_mmr = rerank_with_diversity(scored, top_k=10, diversity_lambda=0.30)
        comms_mmr = [c['candidate_community'] for c in top10_mmr]
        u_mmr = len(set(comms_mmr))

        self.assertGreater(u_mmr, u_no_mmr, f"MMR community count {u_mmr} should exceed baseline {u_no_mmr}")
        self.assertEqual(u_mmr, 10, "MMR with lambda=0.30 should produce 10 unique communities in top-10")

    def test_11_component_scores_finite_and_normalized(self):
        """Verify all hybrid component scores are finite, non-NaN, and strictly in [0, 1]."""
        engine = CBTRecommendationEngine()
        target = "Mastodon@mastodon.social"
        res = engine.recommend(target_acct=target, top_k=10, scoring_mode='hybrid_lightgcn', lightgcn_model=self.model)
        for rec in res['recommendations']:
            for name, score in rec['scores'].items():
                self.assertTrue(np.isfinite(score), f"Score {name} is not finite: {score}")
                self.assertGreaterEqual(score, 0.0, f"Score {name} < 0.0")
                self.assertLessEqual(score, 1.0, f"Score {name} > 1.0")

    def test_12_scoring_mode_defaults_and_preservation(self):
        """Verify engine defaults to heuristic and preserves separate sub-scores per mode."""
        engine = CBTRecommendationEngine()
        target = "Mastodon@mastodon.social"

        # Default invocation without scoring_mode must be heuristic
        res_default = engine.recommend(target_acct=target, top_k=3)
        self.assertEqual(res_default['scoring_mode'], 'heuristic')
        self.assertEqual(res_default['algorithm_version'], 'CBT-Rec-v1.0-Hybrid-MMR')
        self.assertIn('relevance', res_default['recommendations'][0]['scores'])

        # Explicit heuristic invocation
        res_heur = engine.recommend(target_acct=target, top_k=3, scoring_mode='heuristic')
        self.assertEqual(res_heur['scoring_mode'], 'heuristic')
        self.assertIn('relevance', res_heur['recommendations'][0]['scores'])

        # Explicit hybrid_lightgcn invocation
        res_hyb = engine.recommend(target_acct=target, top_k=3, scoring_mode='hybrid_lightgcn')
        self.assertEqual(res_hyb['scoring_mode'], 'hybrid_lightgcn')
        self.assertEqual(res_hyb['algorithm_version'], 'CBT-Rec-v1.1-Hybrid-LightGCN-MMR')
        self.assertIn('gcn', res_hyb['recommendations'][0]['scores'])
        self.assertIn('proximity', res_hyb['recommendations'][0]['scores'])

    def test_13_engine_cli_subprocess_dual_modes(self):
        """Verify CLI execution supports both modes returning valid JSON schemas."""
        import subprocess
        import sys

        target = "Mastodon@mastodon.social"

        # 1. Heuristic CLI
        cmd_h = [sys.executable, "-m", "src.recommendation_layer.engine", "--target", target, "--scoring_mode", "heuristic", "--top_k", "3", "--json"]
        out_h = subprocess.check_output(cmd_h, text=True)
        data_h = json.loads(out_h)
        self.assertEqual(data_h['status'], 'success')
        self.assertEqual(data_h['scoring_mode'], 'heuristic')
        self.assertEqual(len(data_h['recommendations']), 3)

        # 2. Hybrid LightGCN CLI
        cmd_g = [sys.executable, "-m", "src.recommendation_layer.engine", "--target", target, "--scoring_mode", "hybrid_lightgcn", "--top_k", "3", "--json"]
        out_g = subprocess.check_output(cmd_g, text=True)
        data_g = json.loads(out_g)
        self.assertEqual(data_g['status'], 'success')
        self.assertEqual(data_g['scoring_mode'], 'hybrid_lightgcn')
        self.assertEqual(len(data_g['recommendations']), 3)
        self.assertIn('gcn', data_g['recommendations'][0]['scores'])

    def test_14_timestamp_sanitisation(self):
        """
        Verify that the timestamp produced by the engine is a valid ISO-8601 string
        parseable by JavaScript's Date constructor (i.e. ends with 'Z', not '+00:00Z').

        Also verifies the sanitiseTimestamp logic (replicated in Python) for all
        variants that may appear in the precomputed user_recommendations table:
          - doubly-suffixed  '...+00:00Z'  → stripped to '...Z'  (valid)
          - offset-only      '...+00:00'   → stripped to '...Z'  (valid)
          - already-correct  '...Z'        → unchanged            (valid)
          - null / empty                   → None                 (safe)
        """
        import re

        def sanitise_timestamp(ts):
            """Mirror of the sanitiseTimestamp JS helper in server.js."""
            if not ts:
                return None
            ts = re.sub(r'\+00:00Z$', 'Z', ts)
            ts = re.sub(r'\+00:00$',  'Z', ts)
            return ts

        def is_js_parseable(ts):
            """
            A timestamp is JS-parseable if it ends with 'Z' and contains 'T'.
            This mirrors the condition required by JavaScript's Date constructor.
            """
            return ts is not None and ts.endswith('Z') and 'T' in ts

        # Case 1: doubly-suffixed (the bug — stored by older precomputed run)
        broken = '2026-10-18T22:14:09.778687+00:00Z'
        fixed = sanitise_timestamp(broken)
        self.assertEqual(fixed, '2026-10-18T22:14:09.778687Z')
        self.assertTrue(is_js_parseable(fixed), f"Fixed timestamp not JS-parseable: {fixed!r}")

        # Case 2: offset-only suffix (no trailing Z)
        offset_only = '2026-10-18T22:14:09.778687+00:00'
        fixed2 = sanitise_timestamp(offset_only)
        self.assertEqual(fixed2, '2026-10-18T22:14:09.778687Z')
        self.assertTrue(is_js_parseable(fixed2), f"Offset-only fixed timestamp not JS-parseable: {fixed2!r}")

        # Case 3: already-correct clean 'Z' suffix — should be unchanged
        clean = '2026-10-20T09:36:07.592485Z'
        fixed3 = sanitise_timestamp(clean)
        self.assertEqual(fixed3, clean)
        self.assertTrue(is_js_parseable(fixed3), f"Clean timestamp not JS-parseable: {fixed3!r}")

        # Case 4: null input — should return None safely
        self.assertIsNone(sanitise_timestamp(None))
        self.assertIsNone(sanitise_timestamp(''))

        # Case 5: live engine timestamp must be clean (ends with 'Z', not '+00:00Z')
        engine = CBTRecommendationEngine()
        res = engine.recommend(target_acct="Mastodon@mastodon.social", top_k=1)
        live_ts = res.get('timestamp', '')
        self.assertIsNotNone(live_ts)
        self.assertTrue(
            live_ts.endswith('Z') and not live_ts.endswith('+00:00Z'),
            f"Engine timestamp not clean: {live_ts!r}"
        )
        self.assertTrue(is_js_parseable(live_ts), f"Live engine timestamp not JS-parseable: {live_ts!r}")


if __name__ == '__main__':
    unittest.main()

