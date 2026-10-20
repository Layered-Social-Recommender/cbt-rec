"""
Unit tests for Diversity-Aware Reranking (Layer 5).
"""
import unittest
from src.recommendation_layer.reranker import rerank_with_diversity

class TestDiversity(unittest.TestCase):
    def setUp(self):
        # Create a controlled synthetic pool of candidates with known communities and scores
        self.mock_candidates = [
            {
                'candidate_acct': 'user_A',
                'candidate_community': 1,
                'is_exploration': False,
                'scores': {'composite': 0.90, 'relevance': 0.90, 'trust': 0.90, 'context': 0.90, 'behaviour': 0.90}
            },
            {
                'candidate_acct': 'user_B',
                'candidate_community': 1,
                'is_exploration': False,
                'scores': {'composite': 0.88, 'relevance': 0.88, 'trust': 0.88, 'context': 0.88, 'behaviour': 0.88}
            },
            {
                'candidate_acct': 'user_C',
                'candidate_community': 1,
                'is_exploration': False,
                'scores': {'composite': 0.85, 'relevance': 0.85, 'trust': 0.85, 'context': 0.85, 'behaviour': 0.85}
            },
            {
                'candidate_acct': 'user_D',
                'candidate_community': 2,
                'is_exploration': True,
                'scores': {'composite': 0.82, 'relevance': 0.82, 'trust': 0.82, 'context': 0.82, 'behaviour': 0.82}
            },
            {
                'candidate_acct': 'user_E',
                'candidate_community': 3,
                'is_exploration': True,
                'scores': {'composite': 0.80, 'relevance': 0.80, 'trust': 0.80, 'context': 0.80, 'behaviour': 0.80}
            }
        ]

    def test_lambda_zero_preserves_pure_score_order(self):
        reranked = rerank_with_diversity(self.mock_candidates, top_k=5, diversity_lambda=0.0)
        ordered_accts = [c['candidate_acct'] for c in reranked]
        self.assertEqual(ordered_accts, ['user_A', 'user_B', 'user_C', 'user_D', 'user_E'])

    def test_positive_lambda_promotes_outside_communities(self):
        # With high diversity lambda, user_D (comm 2) or user_E (comm 3) should be boosted above user_B or user_C (comm 1)
        reranked = rerank_with_diversity(self.mock_candidates, top_k=3, diversity_lambda=0.40)
        communities = [c['candidate_community'] for c in reranked]
        
        # In the top 3 with lambda=0.40, we should see at least 2 distinct communities instead of all 3 being comm 1
        unique_comms = len(set(communities))
        self.assertGreaterEqual(unique_comms, 2, "Diversity reranking must promote multi-community representation in top-k")

    def test_top_k_bounds_and_ranks(self):
        reranked = rerank_with_diversity(self.mock_candidates, top_k=3, diversity_lambda=0.30)
        self.assertEqual(len(reranked), 3)
        for i, c in enumerate(reranked, 1):
            self.assertEqual(c['rank'], i)
            self.assertIn('overall_score', c)
            self.assertIn('diversity_contribution', c)

if __name__ == '__main__':
    unittest.main()
