import sqlite3
import pandas as pd
import numpy as np

DB_PATH = 'data/processed/mastodon/cbt_rec_dataset.db'
conn = sqlite3.connect(DB_PATH)

features_df = pd.read_sql_query("SELECT * FROM user_features", conn)
weights_df = pd.read_sql_query("SELECT * FROM mcdm_weights", conn)
trust_df = pd.read_sql_query("SELECT * FROM user_trust", conn)

criteria = ['activity', 'popularity', 'influence', 'community_participation', 'reciprocity', 'reputation']

# 1. & 2. Filter complete users
comp_df = features_df[features_df['is_stub'] == 0].copy()
m = len(comp_df)
print(f"Complete users (m): {m}")
print(f"Stub users: {len(features_df) - m}")

# 3. Decision Matrix
X = comp_df[['canonical_acct'] + criteria].set_index('canonical_acct')

# 4. Probability distribution
col_sums = X.sum(axis=0)
# Handle edge case where sum might be 0 (none are here)
col_sums = col_sums.replace(0, 1e-8)
P = X / col_sums

# 5. Negation
P_neg = (1 - P) / (m - 1)

# 6. Euclidean distance
D = np.sqrt(np.sum((P - P_neg)**2, axis=0))

# 7. Criterion weight
W = D / np.sum(D)

print("\n--- MCDM Weights Comparison ---")
print("Criterion | Recomputed | DB | Match")
db_weights = dict(zip(weights_df['criterion'], weights_df['weight']))
expected_weights = {
    'reciprocity': 0.269061,
    'activity': 0.243698,
    'community_participation': 0.171058,
    'popularity': 0.157369,
    'influence': 0.132751,
    'reputation': 0.026063
}
for c in criteria:
    r_w = W[c]
    d_w = db_weights.get(c, 0.0)
    print(f"{c:25} | {r_w:.6f} | {d_w:.6f} | {'PASS' if abs(r_w - d_w) < 1e-6 else 'FAIL'}")
print(f"Sum of recomputed weights: {W.sum():.6f}")

# 8. Final trustworthiness score
contrib = X.multiply(W)
trust_scores = contrib.sum(axis=1)

print("\n--- Properties Check ---")
print(f"Max trust score (Recomputed): {trust_scores.max():.6f}")
print(f"Mean trust score (Recomputed): {trust_scores.mean():.6f}")

db_trust_scores = trust_df[trust_df['is_stub'] == 0].set_index('canonical_acct')
print(f"Max trust score (DB): {db_trust_scores['trust_score'].max():.6f}")
print(f"Mean trust score (DB): {db_trust_scores['trust_score'].mean():.6f}")

stubs_with_trust = trust_df[(trust_df['is_stub'] == 1) & (trust_df['trust_score'].notnull())]
print(f"Stubs with trust scores: {len(stubs_with_trust)}")
out_of_bounds = (trust_scores < 0) | (trust_scores > 1)
print(f"Trust scores outside [0,1]: {out_of_bounds.sum()}")

print("\n--- Representative Users ---")
test_accts = [
    'Mastodon@mastodon.social',
    'iftas@mastodon.iftas.org',
    'NGIZero@mastodon.xyz',
    'dianaro@mastodon.social',
    'aslakr@mastodon.social'
]

for a in test_accts:
    print(f"\n--- {a} ---")
    if a not in X.index:
        print("Not a complete user or not found.")
        continue
    
    row = X.loc[a]
    print("1. Normalized Input Features:")
    for c in criteria:
        print(f"   {c}: {row[c]:.6f}")
    
    print("\n2. Criterion Weights:")
    for c in criteria:
        print(f"   {c}: {W[c]:.6f}")
        
    print("\n3. Weighted Contributions:")
    c_row = contrib.loc[a]
    for c in criteria:
        print(f"   {c}: {c_row[c]:.6f}")
        
    r_trust = trust_scores[a]
    d_trust = db_trust_scores.loc[a, 'trust_score']
    print(f"\n4. Recomputed Trust Score: {r_trust:.6f}")
    print(f"5. Stored DB Trust Score:  {d_trust:.6f}")
    print(f"6. Absolute Difference:    {abs(r_trust - d_trust):.6e}")
    
    c_sum = db_trust_scores.loc[a, [f'contrib_{c}' for c in criteria]].sum()
    print(f"DB Contribution sum:       {c_sum:.6f} vs DB Trust {d_trust:.6f} (Diff: {abs(c_sum - d_trust):.6e})")

conn.close()
