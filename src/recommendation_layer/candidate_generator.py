"""
Candidate Generation Module for CBT-Rec Layer 5.
Generates account recommendation candidates for a target user using:
1. 2-hop follow graph neighbours (structural proximity)
2. Co-following/in-hop graph peers
3. Cross-community exploration candidates (diversity & discovery)
Filters self-recommendations, already-followed accounts, and tracks common connectors.
"""

import logging
import networkx as nx
import pandas as pd
from typing import Dict, List, Set, Any, Tuple

logger = logging.getLogger(__name__)

def generate_candidates(
    target_acct: str,
    G_follow: nx.DiGraph,
    users_df: pd.DataFrame,
    metrics_df: pd.DataFrame,
    exploration_ratio: float = 0.3,
    max_candidates: int = 50
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Generate candidates for the target account.
    Returns:
        candidates: List of candidate dictionaries with metadata.
        meta: Diagnostic metadata about the candidate generation run.
    """
    if target_acct not in G_follow:
        logger.warning(f"Target account {target_acct} not found in follow graph.")
        return [], {"status": "user_not_in_graph", "target_acct": target_acct}

    # Set up index lookups
    metrics_map = metrics_df.set_index('canonical_acct').to_dict('index') if 'canonical_acct' in metrics_df.columns else {}
    users_map = users_df.set_index('canonical_acct').to_dict('index') if 'canonical_acct' in users_df.columns else {}

    target_community = metrics_map.get(target_acct, {}).get('community_id', -1)
    
    # 1. Accounts already followed by target (direct successors in directed follow graph)
    already_followed = set(G_follow.successors(target_acct))
    excluded = already_followed | {target_acct}

    candidates_dict: Dict[str, Dict[str, Any]] = {}
    
    # 2. Structural Candidates: 2-hop follow neighbours
    # target -> intermediate -> candidate
    two_hop_connectors: Dict[str, List[str]] = {}
    for intermediate in already_followed:
        for candidate in G_follow.successors(intermediate):
            if candidate not in excluded:
                two_hop_connectors.setdefault(candidate, []).append(intermediate)

    for cand_acct, connectors in two_hop_connectors.items():
        cand_comm = metrics_map.get(cand_acct, {}).get('community_id', -1)
        is_stub = bool(users_map.get(cand_acct, {}).get('is_stub', False))
        candidates_dict[cand_acct] = {
            'candidate_acct': cand_acct,
            'source_type': '2_hop',
            'common_connectors': connectors,
            'hop_distance': 2,
            'target_community': target_community,
            'candidate_community': cand_comm,
            'is_exploration': (cand_comm != target_community and cand_comm != -1),
            'is_stub': is_stub
        }

    # 3. Secondary Structural Candidates: Co-following / Shared in-degree peers
    # If 2-hop candidates are fewer than max_candidates * (1 - exploration_ratio)
    target_two_hop_need = int(max_candidates * (1.0 - exploration_ratio))
    if len(candidates_dict) < target_two_hop_need:
        # Predecessors of target's follows: users who follow the same accounts target follows
        for followed in already_followed:
            for peer in G_follow.predecessors(followed):
                if peer not in excluded and peer not in candidates_dict:
                    cand_comm = metrics_map.get(peer, {}).get('community_id', -1)
                    is_stub = bool(users_map.get(peer, {}).get('is_stub', False))
                    candidates_dict[peer] = {
                        'candidate_acct': peer,
                        'source_type': 'co_following',
                        'common_connectors': [followed],
                        'hop_distance': 2,
                        'target_community': target_community,
                        'candidate_community': cand_comm,
                        'is_exploration': (cand_comm != target_community and cand_comm != -1),
                        'is_stub': is_stub
                    }
                if len(candidates_dict) >= target_two_hop_need * 2:
                    break

    # 4. Cross-Community Exploration Candidates
    # Specifically introduce candidates from outside communities C' != C(target)
    exploration_candidates_needed = max(5, int(max_candidates * exploration_ratio))
    
    # Identify outside communities
    all_communities = set(metrics_df['community_id'].unique()) - {target_community, -1}
    
    # Sort accounts by PageRank/Influence inside outside communities to pick representative accounts
    outside_accounts = []
    for node in G_follow.nodes():
        if node not in excluded and node not in candidates_dict:
            node_comm = metrics_map.get(node, {}).get('community_id', -1)
            if node_comm in all_communities:
                pr = metrics_map.get(node, {}).get('pagerank', 0.0)
                is_stub = bool(users_map.get(node, {}).get('is_stub', False))
                # Prefer non-stubs for exploration
                priority = (not is_stub, pr)
                outside_accounts.append((node, node_comm, priority, is_stub))

    # Sort by priority (complete first, then higher PageRank)
    outside_accounts.sort(key=lambda x: x[2], reverse=True)

    added_exploration = 0
    # Distribute across distinct communities
    seen_outside_comms: Set[int] = set()
    
    # Pass 1: one from each distinct outside community
    for node, comm, _, is_stub in outside_accounts:
        if comm not in seen_outside_comms:
            seen_outside_comms.add(comm)
            candidates_dict[node] = {
                'candidate_acct': node,
                'source_type': 'community_exploration',
                'common_connectors': [],
                'hop_distance': 99,  # Graph exploration
                'target_community': target_community,
                'candidate_community': comm,
                'is_exploration': True,
                'is_stub': is_stub
            }
            added_exploration += 1
            if added_exploration >= exploration_candidates_needed:
                break

    # Pass 2: fill remaining exploration slots if needed
    if added_exploration < exploration_candidates_needed:
        for node, comm, _, is_stub in outside_accounts:
            if node not in candidates_dict:
                candidates_dict[node] = {
                    'candidate_acct': node,
                    'source_type': 'community_exploration',
                    'common_connectors': [],
                    'hop_distance': 99,
                    'target_community': target_community,
                    'candidate_community': comm,
                    'is_exploration': True,
                    'is_stub': is_stub
                }
                added_exploration += 1
                if added_exploration >= exploration_candidates_needed:
                    break

    # 5. Cold-start / Disconnected Handling
    is_cold_start = (len(already_followed) == 0)
    if len(candidates_dict) == 0:
        logger.info(f"Target {target_acct} has no follow connections; using global discovery candidates.")
        all_nodes = [
            n for n in G_follow.nodes() 
            if n not in excluded
        ]
        # Sort by PageRank and complete status
        sorted_nodes = sorted(
            all_nodes, 
            key=lambda n: (not bool(users_map.get(n, {}).get('is_stub', False)), metrics_map.get(n, {}).get('pagerank', 0.0)),
            reverse=True
        )[:max_candidates]
        for n in sorted_nodes:
            cand_comm = metrics_map.get(n, {}).get('community_id', -1)
            candidates_dict[n] = {
                'candidate_acct': n,
                'source_type': 'global_discovery',
                'common_connectors': [],
                'hop_distance': 99,
                'target_community': target_community,
                'candidate_community': cand_comm,
                'is_exploration': True,
                'is_stub': bool(users_map.get(n, {}).get('is_stub', False))
            }

    candidate_list = list(candidates_dict.values())[:max_candidates]

    meta = {
        'status': 'success',
        'target_acct': target_acct,
        'target_community': target_community,
        'already_followed_count': len(already_followed),
        'total_candidates_generated': len(candidate_list),
        'two_hop_candidates': sum(1 for c in candidate_list if c['source_type'] == '2_hop'),
        'co_following_candidates': sum(1 for c in candidate_list if c['source_type'] == 'co_following'),
        'exploration_candidates': sum(1 for c in candidate_list if c['is_exploration']),
        'stub_candidates': sum(1 for c in candidate_list if c['is_stub']),
        'is_cold_start': is_cold_start
    }

    return candidate_list, meta
