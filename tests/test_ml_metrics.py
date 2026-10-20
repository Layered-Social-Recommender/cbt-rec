"""
Unit tests for ML Ranking Evaluation Metrics (Precision@K, Recall@K, NDCG@K, MRR).
"""
import unittest
from src.recommendation_layer.ml.metrics import (
    compute_precision_at_k,
    compute_recall_at_k,
    compute_dcg_at_k,
    compute_idcg_at_k,
    compute_ndcg_at_k,
    compute_mrr,
    evaluate_user_ranking,
    aggregate_ranking_metrics
)

class TestMLMetrics(unittest.TestCase):
    def test_precision_recall_known_case(self):
        # Recommended: [A, B, C, D, E], Ground Truth: {B, D, F} (3 positives)
        recommended = ['A', 'B', 'C', 'D', 'E']
        ground_truth = {'B', 'D', 'F'}

        # At K=2: top 2 is [A, B], 1 hit (B)
        p2 = compute_precision_at_k(recommended, ground_truth, 2)
        r2 = compute_recall_at_k(recommended, ground_truth, 2)
        self.assertAlmostEqual(p2, 1.0 / 2.0)
        self.assertAlmostEqual(r2, 1.0 / 3.0)

        # At K=4: top 4 is [A, B, C, D], 2 hits (B, D)
        p4 = compute_precision_at_k(recommended, ground_truth, 4)
        r4 = compute_recall_at_k(recommended, ground_truth, 4)
        self.assertAlmostEqual(p4, 2.0 / 4.0)
        self.assertAlmostEqual(r4, 2.0 / 3.0)

        # At K=5: top 5 is [A, B, C, D, E], 2 hits
        p5 = compute_precision_at_k(recommended, ground_truth, 5)
        r5 = compute_recall_at_k(recommended, ground_truth, 5)
        self.assertAlmostEqual(p5, 2.0 / 5.0)
        self.assertAlmostEqual(r5, 2.0 / 3.0)

    def test_ndcg_known_case(self):
        # Recommended: [A, B, C, D], Ground Truth: {B} (1 positive, ranked at pos 2)
        recommended = ['A', 'B', 'C', 'D']
        ground_truth = {'B'}

        # DCG@2 = 0 + 1 / log2(2 + 1) = 1 / log2(3) = 0.63092975
        # IDCG@2 = 1 / log2(1 + 1) = 1 / 1 = 1.0
        # NDCG@2 = 0.63092975 / 1.0 = 0.63092975
        ndcg2 = compute_ndcg_at_k(recommended, ground_truth, 2)
        import math
        expected_ndcg2 = (1.0 / math.log2(3)) / (1.0 / math.log2(2))
        self.assertAlmostEqual(ndcg2, expected_ndcg2, places=5)

        # If positive is at rank 1: [B, A], NDCG must be 1.0
        ndcg_perfect = compute_ndcg_at_k(['B', 'A'], ground_truth, 2)
        self.assertAlmostEqual(ndcg_perfect, 1.0, places=5)

    def test_mrr_known_case(self):
        # First hit at position 2 -> MRR = 0.5
        mrr = compute_mrr(['A', 'B', 'C'], {'B'})
        self.assertAlmostEqual(mrr, 0.5)

        # First hit at position 1 -> MRR = 1.0
        mrr1 = compute_mrr(['B', 'A'], {'B'})
        self.assertAlmostEqual(mrr1, 1.0)

        # No hit -> MRR = 0.0
        mrr0 = compute_mrr(['A', 'C'], {'B'})
        self.assertAlmostEqual(mrr0, 0.0)

    def test_empty_ground_truth_handling(self):
        # When a user has 0 test positives, evaluate_user_ranking must return None explicitly
        res = evaluate_user_ranking(['A', 'B'], set(), k_list=[5, 10])
        self.assertIsNone(res)

        # Precision/recall with empty ground truth return 0.0 safely
        self.assertEqual(compute_precision_at_k(['A'], set(), 5), 0.0)
        self.assertEqual(compute_recall_at_k(['A'], set(), 5), 0.0)
        self.assertEqual(compute_ndcg_at_k(['A'], set(), 5), 0.0)

    def test_aggregation(self):
        user1 = {'num_test_positives': 2, 'precision@5': 0.4, 'recall@5': 1.0, 'ndcg@5': 0.8, 'hitrate@5': 1.0, 'mrr': 0.5}
        user2 = {'num_test_positives': 1, 'precision@5': 0.2, 'recall@5': 1.0, 'ndcg@5': 0.6, 'hitrate@5': 1.0, 'mrr': 0.333333}

        agg = aggregate_ranking_metrics([user1, user2])
        self.assertEqual(agg['evaluated_users_count'], 2)
        self.assertEqual(agg['total_test_positives'], 3)
        self.assertEqual(agg['aggregation_method'], 'macro_averaged_per_user')
        self.assertAlmostEqual(agg['summary']['precision@5']['mean'], 0.3)
        self.assertAlmostEqual(agg['summary']['recall@5']['mean'], 1.0)


if __name__ == '__main__':
    unittest.main()
