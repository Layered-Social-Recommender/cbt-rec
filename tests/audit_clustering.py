import sqlite3
import networkx as nx
import pandas as pd

DB_PATH = 'data/processed/mastodon/cbt_rec_dataset.db'
conn = sqlite3.connect(DB_PATH)

# Load users and rels
users_df = pd.read_sql_query("SELECT canonical_acct FROM users", conn)
rels_df = pd.read_sql_query("SELECT source_canonical, target_canonical FROM relationships WHERE type='follows'", conn)

# Build Follow Graph exactly as builder.py does
G_follow = nx.DiGraph()
G_follow.add_nodes_from(users_df['canonical_acct'].tolist())
for _, row in rels_df.iterrows():
    G_follow.add_edge(row['source_canonical'], row['target_canonical'])

# Compute directed clustering
clustering_directed = nx.clustering(G_follow)

# Compute undirected clustering (by converting to undirected first)
G_follow_undirected = G_follow.to_undirected()
clustering_undirected = nx.clustering(G_follow_undirected)

# Fetch from DB
db_metrics = pd.read_sql_query("SELECT canonical_acct, in_degree, out_degree, clustering_coefficient FROM graph_metrics", conn)

print("Total users in G_follow:", G_follow.number_of_nodes())
print("Total edges in G_follow:", G_follow.number_of_edges())

matches_directed = 0
matches_undirected = 0
mismatches_directed = 0
max_diff = 0.0

mismatched_users = []

for _, row in db_metrics.iterrows():
    acct = row['canonical_acct']
    db_c = row['clustering_coefficient']
    
    dir_c = clustering_directed.get(acct, 0.0)
    undir_c = clustering_undirected.get(acct, 0.0)
    
    diff = abs(db_c - dir_c)
    if diff > max_diff:
        max_diff = diff
        
    if diff < 1e-7:
        matches_directed += 1
    else:
        mismatches_directed += 1
        mismatched_users.append((acct, db_c, dir_c))
        
    if abs(db_c - undir_c) < 1e-7:
        matches_undirected += 1

print(f"Exact matches with nx.clustering(DiGraph): {matches_directed}")
print(f"Mismatches with nx.clustering(DiGraph): {mismatches_directed}")
print(f"Max absolute difference: {max_diff}")
print(f"Exact matches with nx.clustering(Graph): {matches_undirected}")

# Check specific cases
for acct in ['julientaq@mastodon.social', 'dianaro@mastodon.social']:
    c_dir = clustering_directed.get(acct, 0.0)
    c_undir = clustering_undirected.get(acct, 0.0)
    in_deg = G_follow.in_degree(acct)
    out_deg = G_follow.out_degree(acct)
    db_val = db_metrics[db_metrics['canonical_acct'] == acct]['clustering_coefficient'].iloc[0]
    print(f"\n{acct}: in={in_deg}, out={out_deg}, DB={db_val}, nx.DiGraph={c_dir}, nx.Graph={c_undir}")
    
    # Let's see neighbors
    preds = list(G_follow.predecessors(acct))
    succs = list(G_follow.successors(acct))
    print(f"  Predecessors: {preds}")
    print(f"  Successors: {succs}")

# Check a non-zero case
non_zero_db = db_metrics[db_metrics['clustering_coefficient'] > 0].iloc[0]
acct_nz = non_zero_db['canonical_acct']
c_dir_nz = clustering_directed.get(acct_nz, 0.0)
c_undir_nz = clustering_undirected.get(acct_nz, 0.0)
print(f"\nNon-zero case: {acct_nz}")
print(f"  DB={non_zero_db['clustering_coefficient']}, nx.DiGraph={c_dir_nz}, nx.Graph={c_undir_nz}")
print(f"  Predecessors: {list(G_follow.predecessors(acct_nz))}")
print(f"  Successors: {list(G_follow.successors(acct_nz))}")
print(f"  Undirected neighbors: {list(G_follow_undirected.neighbors(acct_nz))}")

# Check edges between neighbors
neighbors = list(G_follow_undirected.neighbors(acct_nz))
print("  Edges between neighbors:")
for i in range(len(neighbors)):
    for j in range(i+1, len(neighbors)):
        u = neighbors[i]
        v = neighbors[j]
        if G_follow_undirected.has_edge(u, v):
            print(f"    {u} -- {v}")

# How many non-zero in DiGraph vs Graph?
nz_dir = sum(1 for v in clustering_directed.values() if v > 0)
nz_undir = sum(1 for v in clustering_undirected.values() if v > 0)
print(f"\nNon-zero clustering in nx.DiGraph: {nz_dir}")
print(f"Non-zero clustering in nx.Graph (undirected): {nz_undir}")

conn.close()
