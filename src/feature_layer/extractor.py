import os
import sqlite3
import pandas as pd
import numpy as np
import json
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def normalize(series, clip_max=None):
    if clip_max is not None:
        series = series.clip(upper=clip_max)
    vmin = series.min()
    vmax = series.max()
    if vmax == vmin:
        # Avoid division by zero, return 0 for all non-NaNs
        return pd.Series(0.0, index=series.index).where(series.notna(), np.nan)
    return (series - vmin) / (vmax - vmin + 1e-8)

def load_data(db_path):
    conn = sqlite3.connect(db_path)
    users_df = pd.read_sql_query("SELECT * FROM users", conn)
    statuses_df = pd.read_sql_query("SELECT * FROM statuses", conn)
    rels_df = pd.read_sql_query("SELECT * FROM relationships", conn)
    ints_df = pd.read_sql_query("SELECT * FROM interactions", conn)
    metrics_df = pd.read_sql_query("SELECT * FROM graph_metrics", conn)
    conn.close()
    return users_df, statuses_df, rels_df, ints_df, metrics_df

def extract_features(users_df, statuses_df, rels_df, ints_df, metrics_df):
    logger.info("Extracting features...")
    
    # 1. Base DataFrame
    df = users_df[['canonical_acct', 'is_stub', 'bot']].copy()
    df.rename(columns={'bot': 'is_bot'}, inplace=True)
    df['is_bot'] = df['is_bot'].fillna(0).astype(bool)
    df['features_complete'] = ~df['is_stub'].astype(bool)
    
    # Set index for easy joining
    df.set_index('canonical_acct', inplace=True)
    metrics_df.set_index('canonical_acct', inplace=True)
    users_df.set_index('canonical_acct', inplace=True)
    
    # 2. Activity components
    status_counts = statuses_df.groupby('account_canonical').size()
    df['collected_status_count'] = status_counts.reindex(df.index).fillna(0)
    df['total_interaction_weight_out'] = metrics_df['total_interaction_weight_out']
    
    df['activity_raw'] = 0.5 * normalize(df['collected_status_count']) + 0.5 * normalize(df['total_interaction_weight_out'])
    
    # 3. Popularity components
    df['in_degree'] = metrics_df['in_degree']
    avg_eng = statuses_df.groupby('account_canonical')[['reblogs_count', 'favourites_count']].mean()
    df['avg_reblogs'] = avg_eng['reblogs_count'].reindex(df.index).fillna(0)
    df['avg_favourites'] = avg_eng['favourites_count'].reindex(df.index).fillna(0)
    
    df['popularity_raw'] = 0.6 * normalize(df['in_degree']) + 0.2 * normalize(df['avg_reblogs']) + 0.2 * normalize(df['avg_favourites'])
    
    # 4. Influence
    df['influence_raw'] = metrics_df['pagerank']
    
    # 5. Community Participation
    df['clustering_coefficient'] = metrics_df['clustering_coefficient']
    
    ints_comm = ints_df.merge(metrics_df[['community_id']], left_on='target_canonical', right_index=True, how='left')
    dist_comm = ints_comm.groupby('source_canonical')['community_id'].nunique()
    df['distinct_communities_interacted'] = dist_comm.reindex(df.index).fillna(0)
    
    df['community_participation_raw'] = 0.5 * normalize(df['clustering_coefficient']) + 0.5 * normalize(df['distinct_communities_interacted'])
    
    # 6. Reciprocity
    follows_out = rels_df[rels_df['type'] == 'follows'].groupby('source_canonical')['target_canonical'].apply(set)
    follows_in = rels_df[rels_df['type'] == 'follows'].groupby('target_canonical')['source_canonical'].apply(set)
    
    reciprocity_raw = pd.Series(index=df.index, dtype=float)
    for u in df.index:
        f_out = follows_out.get(u, set())
        f_in = follows_in.get(u, set())
        mutual = len(f_out.intersection(f_in))
        reciprocity_raw[u] = mutual / max(1, len(f_out))
        
    df['reciprocity_raw'] = reciprocity_raw
    
    # 7. Reputation
    all_dates = pd.to_datetime(users_df['created_at'], errors='coerce')
    max_date = pd.to_datetime(statuses_df['created_at'], errors='coerce').max()
    if pd.isna(max_date):
        max_date = pd.Timestamp.utcnow()
        
    age_days = (max_date - all_dates).dt.days.clip(lower=1)
    df['account_age_days'] = age_days
    
    f_to_f = pd.to_numeric(users_df['followers_count'], errors='coerce').fillna(0) / pd.to_numeric(users_df['following_count'], errors='coerce').clip(lower=1).fillna(1)
    df['follower_to_following_ratio'] = f_to_f
    
    log_status = np.log1p(pd.to_numeric(users_df['statuses_count'], errors='coerce').fillna(0))
    df['log_statuses_count'] = log_status
    
    df['reputation_raw'] = (
        0.4 * normalize(df['account_age_days']) + 
        0.3 * normalize(df['follower_to_following_ratio'], clip_max=10) + 
        0.3 * normalize(df['log_statuses_count'])
    )
    
    # 8. Behaviour Score
    df['reply_ratio'] = metrics_df['reply_weight_out'] / df['collected_status_count'].clip(lower=1)
    df['reblog_ratio'] = metrics_df['reblog_weight_out'] / df['collected_status_count'].clip(lower=1)
    df['mention_ratio'] = metrics_df['mention_weight_out'] / df['collected_status_count'].clip(lower=1)
    
    # posting regularity
    reg = pd.Series(0.0, index=df.index)
    statuses_df['created_dt'] = pd.to_datetime(statuses_df['created_at'], errors='coerce')
    for u, group in statuses_df.dropna(subset=['created_dt']).groupby('account_canonical'):
        n = len(group)
        if n < 2:
            continue
        dates = group['created_dt'].dt.date
        active_days = dates.nunique()
        window = (dates.max() - dates.min()).days + 1
        if window >= 2:
            reg[u] = active_days / window
            
    df['posting_regularity'] = reg
    
    w1, w2, w3, w4 = 0.3, 0.25, 0.2, 0.25
    df['behaviour_score_raw'] = (
        w1 * normalize(df['reply_ratio']) + 
        w2 * normalize(df['reblog_ratio']) + 
        w3 * normalize(df['mention_ratio']) + 
        w4 * df['posting_regularity'] # already bounded
    )
    
    # 9. Context Profile
    lang = statuses_df.groupby('account_canonical')['language'].agg(lambda x: x.mode()[0] if not x.mode().empty else None)
    df['primary_language'] = lang.reindex(df.index)
    
    def get_top_tags(tags_series):
        all_tags = []
        for tags_json in tags_series.dropna():
            try:
                tags = json.loads(tags_json)
                all_tags.extend(tags)
            except:
                pass
        if not all_tags:
            return json.dumps([])
        return json.dumps(pd.Series(all_tags).value_counts().head(5).index.tolist())
        
    tags = statuses_df.groupby('account_canonical')['hashtags'].agg(get_top_tags)
    df['top_hashtags'] = tags.reindex(df.index).fillna('[]')
    
    recent_cutoff = max_date - pd.Timedelta(days=30)
    recent_statuses = statuses_df[statuses_df['created_dt'] >= recent_cutoff].groupby('account_canonical').size()
    df['recent_activity_score'] = (recent_statuses / df['collected_status_count'].clip(lower=1)).reindex(df.index).fillna(0.0)
    
    ints_df['timestamp_dt'] = pd.to_datetime(ints_df['timestamp'], errors='coerce')
    recent_ints = ints_df[ints_df['timestamp_dt'] >= recent_cutoff].groupby('source_canonical').size()
    total_ints = ints_df.groupby('source_canonical').size()
    df['interaction_recency_score'] = (recent_ints / total_ints.clip(lower=1)).reindex(df.index).fillna(0.0)
    
    # Handle Stubs
    stub_mask = ~df['features_complete']
    cols_to_null = [
        'activity_raw', 'popularity_raw', 'community_participation_raw', 'reciprocity_raw', 
        'reputation_raw', 'behaviour_score_raw', 'primary_language', 'top_hashtags', 
        'recent_activity_score', 'interaction_recency_score'
    ]
    for col in cols_to_null:
        df.loc[stub_mask, col] = np.nan
        
    # Normalize features
    features_to_norm = [
        'activity', 'popularity', 'influence', 'community_participation', 
        'reciprocity', 'reputation', 'behaviour_score'
    ]
    for f in features_to_norm:
        raw_col = f + '_raw'
        df[f] = normalize(df[raw_col])
        # Re-apply stub mask
        if f != 'influence':
            df.loc[stub_mask, f] = np.nan
        
    # Select columns to save
    final_cols = [
        'is_stub', 'features_complete', 'is_bot',
        'activity_raw', 'activity',
        'popularity_raw', 'popularity',
        'influence_raw', 'influence',
        'community_participation_raw', 'community_participation',
        'reciprocity_raw', 'reciprocity',
        'reputation_raw', 'reputation',
        'behaviour_score_raw', 'behaviour_score',
        'primary_language', 'top_hashtags', 'recent_activity_score', 'interaction_recency_score'
    ]
    
    return df[final_cols].reset_index()

def run_layer3():
    base_dir = os.path.dirname(__file__)
    db_path = os.path.join(base_dir, '..', '..', 'data', 'processed', 'mastodon', 'cbt_rec_dataset.db')
    
    if not os.path.exists(db_path):
        logger.error("Database not found.")
        return
        
    users_df, statuses_df, rels_df, ints_df, metrics_df = load_data(db_path)
    features_df = extract_features(users_df, statuses_df, rels_df, ints_df, metrics_df)
    
    conn = sqlite3.connect(db_path)
    features_df.to_sql('user_features', conn, if_exists='replace', index=False)
    conn.close()
    
    logger.info("Saved user_features table.")
    
if __name__ == "__main__":
    run_layer3()
