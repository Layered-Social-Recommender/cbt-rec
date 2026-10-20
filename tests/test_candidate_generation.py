"""
Unit tests for Candidate Generation (Layer 5).
"""
import os
import sqlite3
import unittest
import pandas as pd
import networkx as nx

from src.recommendation_layer.candidate_generator import generate_candidates

class TestCandidateGeneration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        db_path = os.path.join(
            os.path.dirname(__file__), "..", "data", "processed", "mastodon", "cbt_rec_dataset.db"
        )
        conn = sqlite3.connect(db_path)
        cls.users_df = pd.read_sql("SELECT * FROM users", conn)
        cls.rels_df = pd.read_sql("SELECT source_canonical, target_canonical, type FROM relationships WHERE type='follows'", conn)
        cls.metrics_df = pd.read_sql("SELECT * FROM graph_metrics", conn)
        conn.close()

        cls.G_follow = nx.DiGraph()
        for _, row in cls.users_df.iterrows():
            cls.G_follow.add_node(row['canonical_acct'], is_stub=bool(row['is_stub']))
        for _, row in cls.rels_df.iterrows():
            cls.G_follow.add_edge(row['source_canonical'], row['target_canonical'])

    def test_no_self_recommendation(self):
        target = "Mastodon@mastodon.social"
        candidates, _ = generate_candidates(
            target_acct=target,
            G_follow=self.G_follow,
            users_df=self.users_df,
            metrics_df=self.metrics_df,
            max_candidates=30
        )
        cand_accts = [c['candidate_acct'] for c in candidates]
        self.assertNotIn(target, cand_accts, "Target must never recommend itself")

    def test_no_already_followed_recommendations(self):
        target = "Mastodon@mastodon.social"
        already_followed = set(self.G_follow.successors(target))
        candidates, _ = generate_candidates(
            target_acct=target,
            G_follow=self.G_follow,
            users_df=self.users_df,
            metrics_df=self.metrics_df,
            max_candidates=30
        )
        cand_accts = [c['candidate_acct'] for c in candidates]
        intersection = already_followed.intersection(set(cand_accts))
        self.assertEqual(len(intersection), 0, f"Already followed accounts cannot be recommended: {intersection}")

    def test_two_hop_candidates_have_connectors(self):
        target = "Mastodon@mastodon.social"
        candidates, _ = generate_candidates(
            target_acct=target,
            G_follow=self.G_follow,
            users_df=self.users_df,
            metrics_df=self.metrics_df,
            max_candidates=30
        )
        two_hop_cands = [c for c in candidates if c['source_type'] == '2_hop']
        self.assertGreater(len(two_hop_cands), 0, "Should generate at least one 2-hop candidate")
        for c in two_hop_cands:
            self.assertGreater(len(c['common_connectors']), 0, "2-hop candidate must have >=1 common connector")
            # Verify common connectors are actually followed by target
            for conn in c['common_connectors']:
                self.assertTrue(self.G_follow.has_edge(target, conn))
                self.assertTrue(self.G_follow.has_edge(conn, c['candidate_acct']))

    def test_exploration_candidates_from_outside_communities(self):
        target = "Mastodon@mastodon.social"
        candidates, meta = generate_candidates(
            target_acct=target,
            G_follow=self.G_follow,
            users_df=self.users_df,
            metrics_df=self.metrics_df,
            exploration_ratio=0.3,
            max_candidates=30
        )
        target_comm = meta['target_community']
        exploration_cands = [c for c in candidates if c['is_exploration']]
        self.assertGreater(len(exploration_cands), 0, "Should have exploration candidates")
        for c in exploration_cands:
            self.assertNotEqual(c['candidate_community'], target_comm, 
                               "Exploration candidate community must differ from target community")

    def test_cold_start_account(self):
        # A user with 0 follows
        zero_out_nodes = [n for n in self.G_follow.nodes if self.G_follow.out_degree(n) == 0]
        self.assertGreater(len(zero_out_nodes), 0)
        target = zero_out_nodes[0]
        candidates, meta = generate_candidates(
            target_acct=target,
            G_follow=self.G_follow,
            users_df=self.users_df,
            metrics_df=self.metrics_df,
            max_candidates=10
        )
        self.assertTrue(meta['is_cold_start'])
        self.assertGreater(len(candidates), 0, "Cold start user must receive discovery candidates")
        self.assertNotIn(target, [c['candidate_acct'] for c in candidates])

if __name__ == '__main__':
    unittest.main()
