"""
Unit tests for Multi-Signal Scoring (Layer 5).
"""
import os
import sqlite3
import unittest
import pandas as pd
import networkx as nx

from src.recommendation_layer.candidate_generator import generate_candidates
from src.recommendation_layer.scorer import compute_candidate_scores

class TestScoring(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        db_path = os.path.join(
            os.path.dirname(__file__), "..", "data", "processed", "mastodon", "cbt_rec_dataset.db"
        )
        conn = sqlite3.connect(db_path)
        cls.users_df = pd.read_sql("SELECT * FROM users", conn)
        cls.rels_df = pd.read_sql("SELECT source_canonical, target_canonical, type FROM relationships WHERE type='follows'", conn)
        cls.features_df = pd.read_sql("SELECT * FROM user_features", conn)
        cls.trust_df = pd.read_sql("SELECT * FROM user_trust", conn)
        cls.metrics_df = pd.read_sql("SELECT * FROM graph_metrics", conn)
        conn.close()

        cls.G_follow = nx.DiGraph()
        for _, row in cls.users_df.iterrows():
            cls.G_follow.add_node(row['canonical_acct'], is_stub=bool(row['is_stub']))
        for _, row in cls.rels_df.iterrows():
            cls.G_follow.add_edge(row['source_canonical'], row['target_canonical'])

    def test_score_bounds_and_structure(self):
        target = "Mastodon@mastodon.social"
        candidates, _ = generate_candidates(
            target_acct=target,
            G_follow=self.G_follow,
            users_df=self.users_df,
            metrics_df=self.metrics_df,
            max_candidates=25
        )
        scored = compute_candidate_scores(
            target_acct=target,
            candidates=candidates,
            features_df=self.features_df,
            trust_df=self.trust_df,
            metrics_df=self.metrics_df
        )

        self.assertEqual(len(scored), len(candidates))
        for item in scored:
            scores = item['scores']
            for sig in ['relevance', 'trust', 'context', 'behaviour', 'composite']:
                self.assertIn(sig, scores)
                val = scores[sig]
                self.assertGreaterEqual(val, 0.0, f"{sig} must be >= 0")
                self.assertLessEqual(val, 1.0, f"{sig} must be <= 1")

    def test_custom_weights_effect(self):
        target = "Mastodon@mastodon.social"
        candidates, _ = generate_candidates(
            target_acct=target,
            G_follow=self.G_follow,
            users_df=self.users_df,
            metrics_df=self.metrics_df,
            max_candidates=15
        )
        # Weight entirely on trust
        trust_heavy = compute_candidate_scores(
            target_acct=target,
            candidates=candidates,
            features_df=self.features_df,
            trust_df=self.trust_df,
            metrics_df=self.metrics_df,
            weights={'relevance': 0.0, 'trust': 1.0, 'context': 0.0, 'behaviour': 0.0}
        )
        for item in trust_heavy:
            self.assertAlmostEqual(item['scores']['composite'], item['scores']['trust'], places=4)

        # Weight entirely on relevance
        rel_heavy = compute_candidate_scores(
            target_acct=target,
            candidates=candidates,
            features_df=self.features_df,
            trust_df=self.trust_df,
            metrics_df=self.metrics_df,
            weights={'relevance': 1.0, 'trust': 0.0, 'context': 0.0, 'behaviour': 0.0}
        )
        for item in rel_heavy:
            self.assertAlmostEqual(item['scores']['composite'], item['scores']['relevance'], places=4)

    def test_missing_data_flags(self):
        target = "Mastodon@mastodon.social"
        candidates, _ = generate_candidates(
            target_acct=target,
            G_follow=self.G_follow,
            users_df=self.users_df,
            metrics_df=self.metrics_df,
            max_candidates=30
        )
        scored = compute_candidate_scores(
            target_acct=target,
            candidates=candidates,
            features_df=self.features_df,
            trust_df=self.trust_df,
            metrics_df=self.metrics_df
        )

        for item in scored:
            flags = item['missing_flags']
            self.assertIn('is_stub', flags)
            self.assertIn('hashtags_missing', flags)
            self.assertIn('language_missing', flags)
            self.assertIn('behaviour_missing', flags)
            self.assertIn('trust_missing', flags)

            if item['is_stub']:
                self.assertTrue(flags['is_stub'])
                self.assertTrue(flags['trust_missing'])

if __name__ == '__main__':
    unittest.main()
