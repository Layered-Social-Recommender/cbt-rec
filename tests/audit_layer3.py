import sqlite3
import pandas as pd
import json

DB_PATH = 'data/processed/mastodon/cbt_rec_dataset.db'
conn = sqlite3.connect(DB_PATH)

def format_perc(v):
    return f"{v*100:.1f}%" if pd.notnull(v) else "—"

users_df = pd.read_sql_query("SELECT * FROM users", conn)
features_df = pd.read_sql_query("SELECT * FROM user_features", conn)
statuses_df = pd.read_sql_query("SELECT * FROM statuses", conn)
ints_df = pd.read_sql_query("SELECT * FROM interactions", conn)
rels_df = pd.read_sql_query("SELECT * FROM relationships", conn)
metrics_df = pd.read_sql_query("SELECT * FROM graph_metrics", conn)

complete_accts = features_df[features_df['is_stub'] == 0]['canonical_acct'].tolist()
print("3. EXACT COUNTS FOR COMPLETE USERS")
print(f"Total complete users: {len(complete_accts)}")

# Count collected statuses
statuses_counts = statuses_df.groupby('account_canonical').size()
comp_with_stat = sum(1 for a in complete_accts if statuses_counts.get(a, 0) > 0)
comp_no_stat = len(complete_accts) - comp_with_stat
print(f"Complete users with collected statuses > 0: {comp_with_stat}")
print(f"Complete users with collected statuses = 0: {comp_no_stat}")

# Count outgoing interactions
ints_counts = ints_df.groupby('source_canonical').size()
comp_with_ints = sum(1 for a in complete_accts if ints_counts.get(a, 0) > 0)
comp_no_ints = len(complete_accts) - comp_with_ints
print(f"Complete users with outgoing interactions > 0: {comp_with_ints}")
print(f"Complete users with outgoing interactions = 0: {comp_no_ints}")

# Non-empty context (primary_language or top_hashtags != '[]')
def has_ctx(a):
    row = features_df[features_df['canonical_acct'] == a].iloc[0]
    return pd.notnull(row['primary_language']) or (row['top_hashtags'] != '[]' and row['top_hashtags'] != 'null')

comp_with_ctx = sum(1 for a in complete_accts if has_ctx(a))
print(f"Complete users with non-empty context: {comp_with_ctx}")

# Behaviour Score > 0
comp_bs_gt0 = sum(1 for a in complete_accts if features_df[features_df['canonical_acct']==a]['behaviour_score_raw'].iloc[0] > 0)
print(f"Complete users with Behaviour Score > 0: {comp_bs_gt0}")
print(f"Complete users with Behaviour Score = 0: {len(complete_accts) - comp_bs_gt0}")

print("\n--- MCDM Features for COMPLETE users ---")
for f in ['activity', 'popularity', 'influence', 'community_participation', 'reciprocity', 'reputation']:
    raw_col = f + "_raw"
    if f == 'influence':
        raw_col = 'influence_raw' # is pagerank
    
    comp_df = features_df[features_df['is_stub'] == 0]
    
    raw_0 = (comp_df[raw_col] == 0).sum()
    norm_0 = (comp_df[f] == 0).sum()
    raw_gt0 = (comp_df[raw_col] > 0).sum()
    norm_gt0 = (comp_df[f] > 0).sum()
    
    print(f"{f}: raw=0: {raw_0}, norm=0: {norm_0}, raw>0: {raw_gt0}, norm>0: {norm_gt0}")


print("\n4. REPRESENTATIVE USERS")
test_accts = [
    'iftas@mastodon.iftas.org',
    'Mastodon@mastodon.social',
    'NGIZero@mastodon.xyz',
    'dianaro@mastodon.social',
    'revjohnnypipps@mastodon.social',
    'toklumpp@mastodon.social',
    'arabis@mastodon.social',
    'FinistereSud@mastodon.social',
    'aslakr@mastodon.social',
    # Middle/bottom ones
    'mccaffertym@mastodon.social',
    'ZhiYuan@mastodon.social',
    'zerok@mastodon.social',
    'zeegers@mastodon.social',
    'zbigniew@mastodon.social',
    'zack@mastodon.social',
    'Yngve@mastodon.social',
    'Yev@mastodon.social',
    'yes_this_is_steve@mastodon.social',
    'Yaron@mastodon.social'
]

for a in test_accts:
    if a not in features_df['canonical_acct'].values:
        print(f"User {a} not found in DB.")
        continue
    f_row = features_df[features_df['canonical_acct'] == a].iloc[0]
    u_row = users_df[users_df['canonical_acct'] == a].iloc[0]
    m_row = metrics_df[metrics_df['canonical_acct'] == a].iloc[0]
    
    prof_status = u_row['statuses_count']
    coll_status = statuses_counts.get(a, 0)
    out_ints = ints_counts.get(a, 0)
    
    follows_out = rels_df[(rels_df['source_canonical'] == a) & (rels_df['type'] == 'follows')]
    follows_in = rels_df[(rels_df['target_canonical'] == a) & (rels_df['type'] == 'follows')]
    
    print(f"\n--- {a} ---")
    print(f"is_stub: {f_row['is_stub']}, prof_statuses: {prof_status}, coll_statuses: {coll_status}, out_ints: {out_ints}, in_follows: {len(follows_in)}, out_follows: {len(follows_out)}")
    print(f"Activity: raw={f_row['activity_raw']:.6f} / norm={f_row['activity']:.6f}")
    print(f"Popularity: raw={f_row['popularity_raw']:.6f} / norm={f_row['popularity']:.6f}")
    print(f"Influence (PageRank): raw={f_row['influence_raw']:.6f} / norm={f_row['influence']:.6f}")
    print(f"CommPart: raw={f_row['community_participation_raw']:.6f} / norm={f_row['community_participation']:.6f}")
    print(f"Reciprocity: raw={f_row['reciprocity_raw']:.6f} / norm={f_row['reciprocity']:.6f}")
    print(f"Reputation: raw={f_row['reputation_raw']:.6f} / norm={f_row['reputation']:.6f}")
    print(f"Behaviour: raw={f_row['behaviour_score_raw']:.6f} / norm={f_row['behaviour_score']:.6f}")
    print(f"Context: lang={f_row['primary_language']}, tags={f_row['top_hashtags']}, rec_act={f_row['recent_activity_score']}, int_rec={f_row['interaction_recency_score']}")

    # Let's compute behaviour components to see what API would do
    reply_ratio = m_row['reply_weight_out'] / max(1, coll_status)
    reblog_ratio = m_row['reblog_weight_out'] / max(1, coll_status)
    mention_ratio = m_row['mention_weight_out'] / max(1, coll_status)
    print(f"Behaviour Components: rep={reply_ratio}, reb={reblog_ratio}, men={mention_ratio}")

conn.close()
