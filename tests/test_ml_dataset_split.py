"""
Unit tests for Structural Edge-Splitting and Leakage Prevention.
"""
import os
import sqlite3
import unittest
import numpy as np
import pandas as pd

from src.recommendation_layer.ml.dataset_split import create_structural_edge_split

class TestMLDatasetSplit(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        db_path = os.path.join(
            os.path.dirname(__file__), "..", "data", "processed", "mastodon", "cbt_rec_dataset.db"
        )
        conn = sqlite3.connect(db_path)
        cls.rels_df = pd.read_sql("SELECT source_canonical, target_canonical, type FROM relationships WHERE type='follows'", conn)
        cls.users_df = pd.read_sql("SELECT canonical_acct, is_stub FROM users", conn)
        conn.close()

    def test_split_sizes_and_disjointness(self):
        split = create_structural_edge_split(
            rels_df=self.rels_df,
            users_df=self.users_df,
            warm_test_ratio=0.20,
            cold_test_count=15,
            seed=42
        )

        total_original_edges = len(self.rels_df)
        self.assertEqual(total_original_edges, 214)

        train_count = len(split.train_edges)
        warm_test_count = len(split.warm_test_edges)
        cold_test_count = len(split.cold_test_edges)

        # 1. Edge conservation
        self.assertEqual(train_count + warm_test_count + cold_test_count, total_original_edges)

        # 2. Strict disjointness (Zero Leakage)
        train_set = set(split.train_edges)
        warm_set = set(split.warm_test_edges)
        cold_set = set(split.cold_test_edges)

        self.assertEqual(len(train_set & warm_set), 0, "Leakage: Train and warm-test overlap!")
        self.assertEqual(len(train_set & cold_set), 0, "Leakage: Train and cold-test overlap!")
        self.assertEqual(len(warm_set & cold_set), 0, "Warm-test and cold-test overlap!")

        # 3. G_train contains strictly E_train edges
        self.assertEqual(split.G_train.number_of_edges(), train_count)
        for u, v in split.train_edges:
            self.assertTrue(split.G_train.has_edge(u, v))
        for u, v in split.warm_test_edges:
            self.assertFalse(split.G_train.has_edge(u, v), "Leakage: Test edge found in G_train!")
        for u, v in split.cold_test_edges:
            self.assertFalse(split.G_train.has_edge(u, v), "Leakage: Cold test edge found in G_train!")

    def test_warm_start_vs_cold_start_distinction(self):
        split = create_structural_edge_split(
            rels_df=self.rels_df,
            users_df=self.users_df,
            warm_test_ratio=0.20,
            cold_test_count=15,
            seed=42
        )

        # Every warm-start test user MUST retain at least 1 outgoing edge in G_train
        for u in split.warm_test_ground_truth.keys():
            train_out_deg = split.G_train.out_degree(u)
            self.assertGreaterEqual(
                train_out_deg, 1,
                f"Warm-start user {u} has 0 training edges! Violates warm-start definition."
            )

        # Every cold-start test user MUST have exactly 0 outgoing edges in G_train
        for u in split.cold_test_ground_truth.keys():
            train_out_deg = split.G_train.out_degree(u)
            self.assertEqual(
                train_out_deg, 0,
                f"Cold-start user {u} has training edges! Violates cold-start definition."
            )

    def test_candidate_pool_leakage_safety(self):
        split = create_structural_edge_split(
            rels_df=self.rels_df,
            users_df=self.users_df,
            warm_test_ratio=0.20,
            cold_test_count=15,
            seed=42
        )

        for u, test_targets in split.warm_test_ground_truth.items():
            candidate_pool = split.get_candidate_pool(u)

            # Target user must never be in candidate pool
            self.assertNotIn(u, candidate_pool)

            # Training follows must be filtered out
            for v_train in split.G_train.successors(u):
                self.assertNotIn(v_train, candidate_pool)

            # Held-out test positives MUST remain in the candidate pool so model can predict them!
            for v_test in test_targets:
                self.assertIn(
                    v_test, candidate_pool,
                    f"Test target {v_test} was accidentally excluded from candidate pool for {u}!"
                )

    def test_negative_sampling_never_samples_positive(self):
        split = create_structural_edge_split(
            rels_df=self.rels_df,
            users_df=self.users_df,
            seed=42
        )
        rng = np.random.default_rng(123)

        for u in split.warm_test_ground_truth.keys():
            for _ in range(50):
                neg = split.sample_negative(u, rng)
                self.assertNotEqual(neg, u)
                self.assertNotIn((u, neg), split.all_positive_set, "Sampled a true positive as negative!")

    def test_reproducibility_with_seed(self):
        split1 = create_structural_edge_split(self.rels_df, self.users_df, seed=99)
        split2 = create_structural_edge_split(self.rels_df, self.users_df, seed=99)

        self.assertEqual(split1.train_edges, split2.train_edges)
        self.assertEqual(split1.warm_test_edges, split2.warm_test_edges)
        self.assertEqual(split1.cold_test_edges, split2.cold_test_edges)

if __name__ == '__main__':
    unittest.main()
