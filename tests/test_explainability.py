"""
Unit tests for Explainability Layer (Layer 6).
"""
import unittest
from src.explainability_layer.explainer import generate_explanation

class TestExplainability(unittest.TestCase):
    def test_2_hop_explanation_contains_connectors(self):
        candidate_record = {
            'candidate_acct': 'test_cand@mastodon.social',
            'source_type': '2_hop',
            'common_connectors': ['friend1@mastodon.social', 'friend2@mastodon.social'],
            'candidate_community': 1,
            'target_community': 1,
            'is_exploration': False,
            'is_stub': False,
            'scores': {'trust': 0.35, 'relevance': 0.70, 'context': 0.50, 'behaviour': 0.05, 'composite': 0.55},
            'missing_flags': {'is_stub': False, 'hashtags_missing': True, 'language_missing': False, 'behaviour_missing': False, 'trust_missing': False},
            'candidate_language': 'en',
            'target_language': 'en'
        }
        expl = generate_explanation('target@mastodon.social', candidate_record)
        
        self.assertIn('primary_reason', expl)
        self.assertIn('evidence_bullets', expl)
        self.assertIn('scientific_disclaimer', expl)

        bullets_text = " ".join(expl['evidence_bullets'])
        self.assertIn("friend1@mastodon.social", bullets_text)
        self.assertIn("friend2@mastodon.social", bullets_text)
        self.assertIn("0.3500", bullets_text)
        self.assertIn("(EN)", bullets_text.upper())
        self.assertIn("status hashtags", expl['missing_data_notice'])

    def test_exploration_explanation_highlights_community(self):
        candidate_record = {
            'candidate_acct': 'outside_cand@mastodon.social',
            'source_type': 'community_exploration',
            'common_connectors': [],
            'candidate_community': 4,
            'target_community': 1,
            'is_exploration': True,
            'is_stub': False,
            'scores': {'trust': 0.20, 'relevance': 0.40, 'context': 0.50, 'behaviour': 0.01, 'composite': 0.35},
            'missing_flags': {'is_stub': False, 'hashtags_missing': True, 'language_missing': True, 'behaviour_missing': True, 'trust_missing': False}
        }
        expl = generate_explanation('target@mastodon.social', candidate_record)
        
        self.assertIn("Community #4", expl['primary_reason'])
        bullets_text = " ".join(expl['evidence_bullets'])
        self.assertIn("Community #4", bullets_text)
        self.assertIn("Community #1", bullets_text)

    def test_stub_account_explains_missing_trust(self):
        candidate_record = {
            'candidate_acct': 'stub_cand@mastodon.social',
            'source_type': '2_hop',
            'common_connectors': ['friend1@mastodon.social'],
            'candidate_community': 1,
            'target_community': 1,
            'is_exploration': False,
            'is_stub': True,
            'scores': {'trust': 0.025, 'relevance': 0.60, 'context': 0.35, 'behaviour': 0.012, 'composite': 0.40},
            'missing_flags': {'is_stub': True, 'hashtags_missing': True, 'language_missing': True, 'behaviour_missing': True, 'trust_missing': True}
        }
        expl = generate_explanation('target@mastodon.social', candidate_record)
        bullets_text = " ".join(expl['evidence_bullets'])
        self.assertIn("stub account", bullets_text.lower())
        self.assertIn("stub account", expl['missing_data_notice'].lower())

if __name__ == '__main__':
    unittest.main()
