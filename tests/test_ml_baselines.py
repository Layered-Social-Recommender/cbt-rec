"""
Unit tests for ML Link-Prediction Baselines (Popularity, CN, AA, JC, BPR-MF).
"""
import unittest
import numpy as np
import networkx as nx

from src.recommendation_layer.ml.dataset_split import DirectedEdgeSplit
from src.recommendation_layer.ml.baselines import (
    InDegreePopularityBaseline,
    CommonNeighboursBaseline,
    AdamicAdarBaseline,
    JaccardBaseline,
    BPRMatrixFactorization
)

class TestMLBaselines(unittest.TestCase):
    def setUp(self):
        # Create a controlled toy directed graph:
        # u -> w1, u -> w2
        # w1 -> v1, w2 -> v1 (v1 has 2 directed 2-hop paths from u: via w1 and w2)
        # w1 -> v2 (v2 has 1 directed 2-hop path from u: via w1)
        # w1 also -> v3 (so w1 out-degree is 2: to v1 and v2, plus v3 = 3)
        # w2 out-degree is 1: to v1
        # target u has out-degree 2: to w1, w2
        train_edges = [
            ('u', 'w1'),
            ('u', 'w2'),
            ('w1', 'v1'),
            ('w2', 'v1'),
            ('w1', 'v2'),
            ('w1', 'v3')
        ]
        warm_test_edges = [('u', 'v1')]  # ground truth test edge
        cold_test_edges = [('isolated_cold', 'v1')]
        all_nodes = ['u', 'w1', 'w2', 'v1', 'v2', 'v3', 'isolated_cold']

        self.toy_split = DirectedEdgeSplit(
            train_edges=train_edges,
            warm_test_edges=warm_test_edges,
            cold_test_edges=cold_test_edges,
            all_nodes=all_nodes,
            seed=42
        )

    def test_in_degree_popularity(self):
        model = InDegreePopularityBaseline().fit(self.toy_split)
        # In G_train:
        # in-degree of v1: from w1 and w2 = 2
        # in-degree of w1: from u = 1
        # in-degree of v2: from w1 = 1
        # in-degree of v3: from w1 = 1
        # in-degree of u: 0
        scores = model.score_candidates('u', ['v1', 'v2', 'v3', 'isolated_cold'])
        self.assertEqual(scores['v1'], 2.0)
        self.assertEqual(scores['v2'], 1.0)
        self.assertEqual(scores['v3'], 1.0)
        self.assertEqual(scores['isolated_cold'], 0.0)

        # Ranking
        ranked = model.rank_candidates('u', ['v2', 'v1', 'isolated_cold'])
        self.assertEqual(ranked[0], 'v1')

    def test_directed_common_neighbours(self):
        model = CommonNeighboursBaseline().fit(self.toy_split)
        # Target u follows w1, w2.
        # Who follows v1? w1 and w2. Intermediaries: {w1, w2} -> count = 2.
        # Who follows v2? w1. Intermediaries: {w1} -> count = 1.
        # Who follows isolated_cold? None -> count = 0.
        scores = model.score_candidates('u', ['v1', 'v2', 'isolated_cold'])
        self.assertEqual(scores['v1'], 2.0)
        self.assertEqual(scores['v2'], 1.0)
        self.assertEqual(scores['isolated_cold'], 0.0)

        # Cold-start node with 0 outgoing training edges gets 0 scores safely
        cold_scores = model.score_candidates('isolated_cold', ['v1', 'v2'])
        self.assertEqual(cold_scores['v1'], 0.0)

    def test_directed_adamic_adar(self):
        model = AdamicAdarBaseline().fit(self.toy_split)
        # Intermediaries for v1: w1 and w2
        # w1 out-degree in G_train: 3 (to v1, v2, v3) -> weight = 1 / log(1 + 3) = 1 / log(4)
        # w2 out-degree in G_train: 1 (to v1) -> weight = 1 / log(1 + 1) = 1 / log(2)
        import math
        expected_aa_v1 = (1.0 / math.log(4.0)) + (1.0 / math.log(2.0))
        expected_aa_v2 = 1.0 / math.log(4.0)

        scores = model.score_candidates('u', ['v1', 'v2', 'isolated_cold'])
        self.assertAlmostEqual(scores['v1'], expected_aa_v1, places=5)
        self.assertAlmostEqual(scores['v2'], expected_aa_v2, places=5)
        self.assertEqual(scores['isolated_cold'], 0.0)

    def test_directed_jaccard(self):
        model = JaccardBaseline().fit(self.toy_split)
        # N_out(u) = {w1, w2} (size 2)
        # N_in(v1) = {w1, w2} (size 2)
        # Intersection = {w1, w2} (size 2), Union = {w1, w2} (size 2)
        # JC(u, v1) = 2 / 2 = 1.0
        # N_in(v2) = {w1} (size 1)
        # Intersection = {w1} (size 1), Union = {w1, w2} (size 2)
        # JC(u, v2) = 1 / 2 = 0.5
        scores = model.score_candidates('u', ['v1', 'v2', 'isolated_cold'])
        self.assertAlmostEqual(scores['v1'], 1.0, places=5)
        self.assertAlmostEqual(scores['v2'], 0.5, places=5)
        self.assertEqual(scores['isolated_cold'], 0.0)

    def test_bpr_matrix_factorization_training(self):
        bpr = BPRMatrixFactorization(embedding_dim=8, learning_rate=0.1, reg_lambda=0.01, epochs=30, seed=42)
        bpr.fit(self.toy_split)

        self.assertIsNotNone(bpr.W_out)
        self.assertIsNotNone(bpr.W_in)
        self.assertEqual(len(bpr.loss_history), 30)

        # Loss should generally decrease or remain stable
        self.assertGreater(bpr.loss_history[0], 0.0)
        self.assertLess(bpr.loss_history[-1], bpr.loss_history[0] * 1.5)

        # Predicted scores must be valid probabilities in (0, 1)
        scores = bpr.score_candidates('u', ['v1', 'v2', 'v3', 'isolated_cold'])
        for c, s in scores.items():
            self.assertGreaterEqual(s, 0.0)
            self.assertLessEqual(s, 1.0)

    def test_deterministic_tie_breaking(self):
        """Regression test: verifies deterministic alphabetical tie-breaking when candidate scores are equal."""
        model = InDegreePopularityBaseline().fit(self.toy_split)
        # v2 and v3 have the exact same in-degree of 1.0 in G_train
        ranked = model.rank_candidates('u', ['v3', 'v2'])
        self.assertEqual(ranked, ['v2', 'v3'], "Expected v2 before v3 due to alphabetical tie-breaking")

    def test_baseline_get_params(self):
        """Regression test: verifies get_params returns proper configuration."""
        pop = InDegreePopularityBaseline()
        self.assertEqual(pop.get_params(), {})

        bpr = BPRMatrixFactorization(embedding_dim=16, learning_rate=0.03, reg_lambda=0.05, epochs=10, seed=123)
        params = bpr.get_params()
        self.assertEqual(params['embedding_dim'], 16)
        self.assertEqual(params['learning_rate'], 0.03)
        self.assertEqual(params['reg_lambda'], 0.05)
        self.assertEqual(params['epochs'], 10)
        self.assertEqual(params['seed'], 123)

    def test_cold_start_w_out_unmodified_in_bpr(self):
        """
        Regression test: mathematically verifies that for a user with 0 training edges,
        W_out is never updated by BPR-MF SGD and remains at initial values.
        """
        rng = np.random.default_rng(42)
        scale = 1.0 / np.sqrt(8)
        num_users = len(self.toy_split.all_nodes)
        expected_w_out = rng.normal(0.0, scale, (num_users, 8)).astype(np.float64)

        bpr = BPRMatrixFactorization(embedding_dim=8, learning_rate=0.05, reg_lambda=0.01, epochs=20, seed=42)
        bpr.fit(self.toy_split)

        cold_idx = bpr.user_to_idx['isolated_cold']
        actual_w_cold = bpr.W_out[cold_idx]
        expected_w_cold = expected_w_out[cold_idx]
        np.testing.assert_allclose(actual_w_cold, expected_w_cold, atol=1e-12)



if __name__ == '__main__':
    unittest.main()

