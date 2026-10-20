"""
Regression test suite for CBT-Rec Layers 1-4.
Protects validated baseline counts, MCDM weights, trust scores, and referential integrity.
"""
import os
import sqlite3
import unittest
import numpy as np
import pandas as pd

class TestLayers1to4Regression(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.db_path = os.path.join(
            os.path.dirname(__file__), "..", "data", "processed", "mastodon", "cbt_rec_dataset.db"
        )
        if not os.path.exists(cls.db_path):
            raise FileNotFoundError(f"Database not found at {cls.db_path}")
        cls.conn = sqlite3.connect(cls.db_path)

    @classmethod
    def tearDownClass(cls):
        cls.conn.close()

    def test_layer1_entity_counts(self):
        cursor = self.conn.cursor()
        users_count = cursor.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        self.assertEqual(users_count, 270, "Total users must be 270")

        stubs_count = cursor.execute("SELECT COUNT(*) FROM users WHERE is_stub = 1").fetchone()[0]
        self.assertEqual(stubs_count, 65, "Stub users must be 65")

        complete_count = cursor.execute("SELECT COUNT(*) FROM users WHERE is_stub = 0").fetchone()[0]
        self.assertEqual(complete_count, 205, "Complete users must be 205")

        rels_count = cursor.execute("SELECT COUNT(*) FROM relationships").fetchone()[0]
        self.assertEqual(rels_count, 214, "Relationships must be 214")

        statuses_count = cursor.execute("SELECT COUNT(*) FROM statuses").fetchone()[0]
        self.assertEqual(statuses_count, 120, "Statuses must be 120")

        interactions_count = cursor.execute("SELECT COUNT(*) FROM interactions").fetchone()[0]
        self.assertEqual(interactions_count, 128, "Interactions must be 128")

    def test_referential_integrity(self):
        cursor = self.conn.cursor()
        orphan_rels = cursor.execute("""
            SELECT COUNT(*) FROM relationships 
            WHERE source_canonical NOT IN (SELECT canonical_acct FROM users)
               OR target_canonical NOT IN (SELECT canonical_acct FROM users)
        """).fetchone()[0]
        self.assertEqual(orphan_rels, 0, "No orphan relationships allowed")

        orphan_ints = cursor.execute("""
            SELECT COUNT(*) FROM interactions 
            WHERE source_canonical NOT IN (SELECT canonical_acct FROM users)
               OR target_canonical NOT IN (SELECT canonical_acct FROM users)
        """).fetchone()[0]
        self.assertEqual(orphan_ints, 0, "No orphan interactions allowed")

    def test_layer2_graph_metrics(self):
        df_metrics = pd.read_sql("SELECT * FROM graph_metrics", self.conn)
        self.assertEqual(len(df_metrics), 270, "graph_metrics must cover all 270 users")
        
        # Check Louvain communities
        num_communities = df_metrics['community_id'].nunique()
        self.assertGreaterEqual(num_communities, 3, "At least 3 communities must be detected")
        
        # Check PageRank bounds
        self.assertTrue((df_metrics['pagerank'] > 0).all(), "All PageRank values must be > 0")

    def test_layer3_features(self):
        df_feat = pd.read_sql("SELECT * FROM user_features", self.conn)
        self.assertEqual(len(df_feat), 270, "user_features must cover all 270 users")

        # Complete vs Stubs
        complete_mask = df_feat['features_complete'] == 1
        self.assertEqual(complete_mask.sum(), 205)
        self.assertEqual((~complete_mask).sum(), 65)

        # Stubs must have NULLs for non-influence features
        stubs = df_feat[~complete_mask]
        for col in ['activity', 'popularity', 'community_participation', 'reciprocity', 'reputation', 'behaviour_score']:
            self.assertTrue(stubs[col].isna().all(), f"Stubs must have NaN in {col}")

        # Complete users must have no NaNs in normalized criteria
        complete = df_feat[complete_mask]
        for col in ['activity', 'popularity', 'influence', 'community_participation', 'reciprocity', 'reputation']:
            self.assertFalse(complete[col].isna().any(), f"Complete users must not have NaN in {col}")
            self.assertTrue((complete[col] >= 0.0).all() and (complete[col] <= 1.0).all(), f"{col} must be in [0, 1]")

    def test_layer4_mcdm_weights_and_scores(self):
        df_weights = pd.read_sql("SELECT * FROM mcdm_weights", self.conn)
        weights_dict = dict(zip(df_weights['criterion'], df_weights['weight']))

        expected_weights = {
            'reciprocity': 0.269061,
            'activity': 0.243698,
            'community_participation': 0.171058,
            'popularity': 0.157369,
            'influence': 0.132751,
            'reputation': 0.026063
        }

        for criterion, expected_w in expected_weights.items():
            self.assertIn(criterion, weights_dict)
            self.assertAlmostEqual(weights_dict[criterion], expected_w, places=5, 
                                   msg=f"Weight mismatch for {criterion}")

        weight_sum = sum(weights_dict.values())
        self.assertAlmostEqual(weight_sum, 1.0, places=5, msg="MCDM weights must sum to 1.0")

        df_trust = pd.read_sql("SELECT * FROM user_trust", self.conn)
        self.assertEqual(len(df_trust), 270)

        # Check top user
        top_user = df_trust.sort_values(by='trust_score', ascending=False).iloc[0]
        self.assertEqual(top_user['canonical_acct'], 'Mastodon@mastodon.social')
        self.assertAlmostEqual(top_user['trust_score'], 0.728894, places=5)

        # Check stubs have NULL trust score
        stubs_trust = df_trust[df_trust['is_stub'] == 1]
        self.assertEqual(len(stubs_trust), 65)
        self.assertTrue(stubs_trust['trust_score'].isna().all(), "All stubs must have NULL trust score")

if __name__ == '__main__':
    unittest.main()
