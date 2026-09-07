import sqlite3
import pandas as pd
import numpy as np

conn = sqlite3.connect('data/processed/mastodon/cbt_rec_dataset.db')
users = pd.read_sql_query("SELECT * FROM user_features", conn)
trust = pd.read_sql_query("SELECT * FROM user_trust", conn)
weights = pd.read_sql_query("SELECT * FROM mcdm_weights", conn)

print("--- LAYER 4 VALIDATION REPORT ---")
complete_count = users['features_complete'].sum()
stub_count = len(users) - complete_count
print(f"Total Users: {len(users)}")
print(f"Complete Users: {complete_count}")
print(f"Stub Users: {stub_count}")

print("\n--- Derived MCDM Weights ---")
for _, r in weights.iterrows():
    print(f"{r['criterion']}: {r['weight']:.6f}")

sum_weights = weights['weight'].sum()
print(f"\nWeight Sum: {sum_weights:.6f}")
if np.isclose(sum_weights, 1.0):
    print("SUCCESS: Weights sum to 1.0")
else:
    print("ERROR: Weights do not sum to 1.0")

valid_scores = trust.dropna(subset=['trust_score'])
print(f"\nUsers receiving trust scores: {len(valid_scores)}")
print(f"Trust Score Range: Min={valid_scores['trust_score'].min():.4f}, Max={valid_scores['trust_score'].max():.4f}, Mean={valid_scores['trust_score'].mean():.4f}")

print("\n--- Top 10 Trust Scores ---")
top = valid_scores.sort_values(by='trust_score', ascending=False).head(10)
print(top[['canonical_acct', 'trust_score']].to_string(index=False))

print("\n--- Worked Example (Top User) ---")
top_user = top.iloc[0]['canonical_acct']
uf = users[users['canonical_acct'] == top_user].iloc[0]
ut = valid_scores[valid_scores['canonical_acct'] == top_user].iloc[0]

criteria = ['activity', 'popularity', 'influence', 'community_participation', 'reciprocity', 'reputation']
w_dict = dict(zip(weights['criterion'], weights['weight']))

print(f"User: {top_user}")
calc_total = 0
for c in criteria:
    feat_val = uf[c]
    w = w_dict[c]
    contrib = ut[f'contrib_{c}']
    calc_total += contrib
    print(f"  {c:25}: Feature={feat_val:.6f} | Weight={w:.6f} | Contrib={contrib:.6f} (check: {feat_val*w:.6f})")

print(f"  Final Trust Score: {ut['trust_score']:.6f} (check sum: {calc_total:.6f})")

print("\n--- Stub User Validation ---")
stubs = trust[trust['is_stub'] == 1]
stub_nulls = stubs['trust_score'].isna().sum()
print(f"Stub users evaluated: {len(stubs)}")
print(f"Stub users with NULL trust score: {stub_nulls}")
if stub_nulls == len(stubs):
    print("SUCCESS: All stub users correctly received NULL trust scores.")
else:
    print("ERROR: Some stub users received non-NULL trust scores.")

conn.close()
