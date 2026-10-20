"""
Unit and Regression Tests for Directed LightGCN (src/recommendation_layer/ml/lightgcn.py).
"""
import unittest
import numpy as np

from src.recommendation_layer.ml.dataset_split import DirectedEdgeSplit
from src.recommendation_layer.ml.lightgcn import DirectedLightGCN


class TestDirectedLightGCN(unittest.TestCase):
    def setUp(self):
        # Controlled toy directed network:
        # u follows w1 and w2 (d_out(u)=2)
        # w1 follows v1, v2, v3 (d_out(w1)=3, d_in(w1)=1 from u)
        # w2 follows v1 (d_out(w2)=1, d_in(w2)=1 from u)
        # v1 is followed by w1 and w2 (d_in(v1)=2, d_out(v1)=0)
        # isolated_cold has d_out=0, d_in=0
        train_edges = [
            ('u', 'w1'),
            ('u', 'w2'),
            ('w1', 'v1'),
            ('w2', 'v1'),
            ('w1', 'v2'),
            ('w1', 'v3')
        ]
        warm_test_edges = [('u', 'v1')]
        cold_test_edges = [('isolated_cold', 'v1')]
        all_nodes = ['u', 'w1', 'w2', 'v1', 'v2', 'v3', 'isolated_cold']

        self.toy_split = DirectedEdgeSplit(
            train_edges=train_edges,
            warm_test_edges=warm_test_edges,
            cold_test_edges=cold_test_edges,
            all_nodes=all_nodes,
            seed=42
        )

    def test_directed_adjacency_construction_and_normalization(self):
        """Verifies direction and symmetric normalization of adjacency matrix."""
        model = DirectedLightGCN(embedding_dim=8, num_layers=1, seed=42)
        model._build_directed_adjacency(self.toy_split)

        u_idx = model.user_to_idx['u']
        w1_idx = model.user_to_idx['w1']
        v1_idx = model.user_to_idx['v1']
        cold_idx = model.user_to_idx['isolated_cold']

        # u out-degree = 2, in-degree = 0
        self.assertEqual(model.d_out[u_idx], 2)
        self.assertEqual(model.d_in[u_idx], 0)

        # w1 out-degree = 3, in-degree = 1
        self.assertEqual(model.d_out[w1_idx], 3)
        self.assertEqual(model.d_in[w1_idx], 1)

        # Edge u -> w1: normalized weight = 1 / sqrt(d_out(u) * d_in(w1)) = 1 / sqrt(2 * 1) = 1 / sqrt(2)
        expected_weight_u_w1 = 1.0 / np.sqrt(2.0 * 1.0)
        actual_weight_u_w1 = model.A_norm[u_idx, w1_idx]
        self.assertAlmostEqual(actual_weight_u_w1, expected_weight_u_w1, places=6)

        # Edge w1 -> v1: weight = 1 / sqrt(d_out(w1) * d_in(v1)) = 1 / sqrt(3 * 2) = 1 / sqrt(6)
        expected_weight_w1_v1 = 1.0 / np.sqrt(3.0 * 2.0)
        actual_weight_w1_v1 = model.A_norm[w1_idx, v1_idx]
        self.assertAlmostEqual(actual_weight_w1_v1, expected_weight_w1_v1, places=6)

        # Direction check: w1 does NOT follow u, so A_norm[w1, u] must be 0
        self.assertEqual(model.A_norm[w1_idx, u_idx], 0.0)

        # Zero-degree safeguards: isolated node must have all zeros with no NaN or Inf
        self.assertEqual(model.d_out[cold_idx], 0)
        self.assertEqual(model.d_in[cold_idx], 0)
        self.assertEqual(model.A_norm[cold_idx].nnz, 0)
        self.assertFalse(np.isnan(model.A_norm.data).any())
        self.assertFalse(np.isinf(model.A_norm.data).any())

    def test_propagation_dimensions_and_isolation(self):
        """Verifies forward graph convolution dimensions and cold-start zero propagation."""
        model = DirectedLightGCN(embedding_dim=16, num_layers=2, seed=42)
        model._build_directed_adjacency(self.toy_split)

        rng = np.random.default_rng(42)
        E_src_0 = rng.normal(0, 0.1, (len(model.all_nodes), 16))
        E_tgt_0 = rng.normal(0, 0.1, (len(model.all_nodes), 16))

        e_src_star, e_tgt_star, src_layers, tgt_layers = model._propagate(E_src_0, E_tgt_0)

        # Verify shapes
        self.assertEqual(e_src_star.shape, (len(model.all_nodes), 16))
        self.assertEqual(e_tgt_star.shape, (len(model.all_nodes), 16))
        self.assertEqual(len(src_layers), 3)  # layer 0, 1, 2
        self.assertEqual(len(tgt_layers), 3)

        # For isolated_cold (d_out=0), layer 1 and 2 source representations MUST be exactly 0
        cold_idx = model.user_to_idx['isolated_cold']
        np.testing.assert_allclose(src_layers[1][cold_idx], np.zeros(16), atol=1e-12)
        np.testing.assert_allclose(src_layers[2][cold_idx], np.zeros(16), atol=1e-12)

        # Consequently, e_src_star for isolated_cold is strictly alpha_0 * E_src_0
        expected_cold_src = model.alpha[0] * E_src_0[cold_idx]
        np.testing.assert_allclose(e_src_star[cold_idx], expected_cold_src, atol=1e-12)

    def test_cold_start_source_embedding_unmodified_by_training(self):
        """
        Mathematical proof regression test:
        For a cold-start source with out-degree = 0 in G_train, user never appears
        as a source in any training triplet. E_src_0 must undergo zero gradient updates.
        """
        model = DirectedLightGCN(embedding_dim=8, num_layers=2, epochs=15, seed=42)

        rng = np.random.default_rng(42)
        scale = 1.0 / np.sqrt(8)
        expected_init_src = rng.normal(0.0, scale, (len(self.toy_split.all_nodes), 8)).astype(np.float64)

        model.fit(self.toy_split)

        cold_idx = model.user_to_idx['isolated_cold']
        actual_cold_src_0 = model.E_src_0[cold_idx]

        # W_out / E_src_0 at index cold_idx must match the exact initialization
        np.testing.assert_allclose(actual_cold_src_0, expected_init_src[cold_idx], atol=1e-12)

    def test_reproducibility_with_seed(self):
        """Verifies deterministic training across multiple runs with identical seed."""
        model1 = DirectedLightGCN(embedding_dim=8, num_layers=1, epochs=10, seed=123).fit(self.toy_split)
        model2 = DirectedLightGCN(embedding_dim=8, num_layers=1, epochs=10, seed=123).fit(self.toy_split)

        np.testing.assert_allclose(model1.E_src_star, model2.E_src_star, atol=1e-12)
        np.testing.assert_allclose(model1.E_tgt_star, model2.E_tgt_star, atol=1e-12)
        np.testing.assert_allclose(model1.b_in, model2.b_in, atol=1e-12)
        self.assertEqual(model1.loss_history, model2.loss_history)

    def test_loss_decreases_during_training(self):
        """Verifies that optimization reduces the BPR ranking loss over epochs."""
        model = DirectedLightGCN(embedding_dim=16, num_layers=1, learning_rate=0.02, epochs=30, seed=42)
        model.fit(self.toy_split)

        self.assertGreater(len(model.loss_history), 0)
        self.assertLess(model.loss_history[-1], model.loss_history[0])

    def test_scoring_and_deterministic_ranking(self):
        """Verifies candidate scoring in [0, 1] and deterministic ranking."""
        model = DirectedLightGCN(embedding_dim=8, num_layers=1, epochs=10, seed=42).fit(self.toy_split)

        cands = ['v1', 'v2', 'v3', 'isolated_cold']
        scores = model.score_candidates('u', cands)

        # Probabilities must be strictly bounded in [0, 1]
        for c, s in scores.items():
            self.assertGreaterEqual(s, 0.0)
            self.assertLessEqual(s, 1.0)
            self.assertFalse(np.isnan(s))

        # Ranking must be deterministic
        ranked1 = model.rank_candidates('u', cands)
        ranked2 = model.rank_candidates('u', cands)
        self.assertEqual(ranked1, ranked2)

    def test_empty_candidate_pool_handling(self):
        """Verifies graceful handling of empty candidate pools and unknown accounts."""
        model = DirectedLightGCN(embedding_dim=8, num_layers=1, epochs=5, seed=42).fit(self.toy_split)

        self.assertEqual(model.score_candidates('u', []), {})
        self.assertEqual(model.rank_candidates('u', []), [])
        self.assertEqual(model.score_candidates('unknown_acct', ['v1']), {'v1': 0.0})


if __name__ == '__main__':
    unittest.main()
