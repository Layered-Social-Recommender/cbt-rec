"""
Integration test for Recommendation Engine (Layer 5 & Layer 6).
Verifies end-to-end execution, database persistence, and API compatibility.
"""
import os
import sqlite3
import unittest
import json
from src.recommendation_layer.engine import CBTRecommendationEngine

class TestRecommendationIntegration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.engine = CBTRecommendationEngine()

    def test_end_to_end_recommendation_top_user(self):
        target = "Mastodon@mastodon.social"
        res = self.engine.recommend(
            target_acct=target,
            diversity_lambda=0.30,
            top_k=5
        )

        self.assertEqual(res['status'], 'success')
        self.assertEqual(res['target_acct'], target)
        self.assertEqual(len(res['recommendations']), 5)

        for rec in res['recommendations']:
            self.assertIn('candidate_acct', rec)
            self.assertIn('overall_score', rec)
            self.assertIn('scores', rec)
            self.assertIn('explanation', rec)
            self.assertNotEqual(rec['candidate_acct'], target)

    def test_database_persistence(self):
        db_path = self.engine.db_path
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Check user_recommendations table exists and has rows
        table_exists = cursor.execute(
            "SELECT count(*) FROM sqlite_master WHERE type='table' AND name='user_recommendations'"
        ).fetchone()[0]
        self.assertEqual(table_exists, 1, "user_recommendations table must exist")

        row_count = cursor.execute("SELECT count(*) FROM user_recommendations").fetchone()[0]
        self.assertGreater(row_count, 0, "user_recommendations table must have rows")

        # Verify columns and data integrity
        sample = cursor.execute("""
            SELECT target_canonical, candidate_canonical, rank, overall_score, 
                   relevance_score, trust_score, context_score, behaviour_score, explanation_json
            FROM user_recommendations LIMIT 1
        """).fetchone()

        self.assertIsNotNone(sample)
        explanation = json.loads(sample[8])
        self.assertIn('primary_reason', explanation)
        self.assertIn('scientific_disclaimer', explanation)

        conn.close()

if __name__ == '__main__':
    unittest.main()
