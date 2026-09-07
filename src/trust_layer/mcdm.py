import os
import sqlite3
import pandas as pd
import numpy as np
import logging
import uuid

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def compute_mcdm_weights(df, criteria_cols):
    """
    Implements Probability Distribution Negation and Euclidean Distance
    for deriving objective MCDM weights.
    df: DataFrame containing only complete users.
    criteria_cols: list of column names to use.
    """
    m = len(df)
    n = len(criteria_cols)
    
    weights = {}
    distances = {}
    
    if m <= 1:
        logger.error("Not enough complete users to compute probabilities (need m > 1).")
        return {c: 0.0 for c in criteria_cols}

    eps = 1e-8
    
    for c in criteria_cols:
        # Step 1 & 2: Probabilities
        # Add epsilon to denominator to prevent division by zero for all-zero columns
        col_sum = df[c].sum() + (eps * m)
        if col_sum <= eps * m:
            logger.warning(f"Criterion {c} is essentially zero. Distance will be 0.")
            distances[c] = 0.0
            continue
            
        P_j = (df[c] + eps) / col_sum
        
        # Step 3: Negation
        P_neg_j = (1.0 - P_j) / (m - 1)
        
        # Step 4: Euclidean distance
        D_j = np.sqrt(np.sum((P_j - P_neg_j)**2))
        distances[c] = D_j

    # Step 5: Weight calculation
    sum_D = sum(distances.values())
    
    if sum_D == 0:
        logger.error("Extreme Case: All criteria have zero distance. MCDM invalid.")
        return {c: 0.0 for c in criteria_cols}
        
    for c in criteria_cols:
        weights[c] = distances[c] / sum_D
        
    # Renormalize explicitly (guard against float drift or dropped zeros)
    total_w = sum(weights.values())
    for c in criteria_cols:
        weights[c] = weights[c] / total_w
        
    return weights

def run_layer4():
    base_dir = os.path.dirname(__file__)
    db_path = os.path.join(base_dir, '..', '..', 'data', 'processed', 'mastodon', 'cbt_rec_dataset.db')
    
    if not os.path.exists(db_path):
        logger.error("Database not found.")
        return
        
    conn = sqlite3.connect(db_path)
    df = pd.read_sql_query("SELECT * FROM user_features", conn)
    
    # Exclude stubs for weight derivation (mcdm computation)
    complete_df = df[df['features_complete'] == 1].copy()
    
    criteria = ['activity', 'popularity', 'influence', 'community_participation', 'reciprocity', 'reputation']
    
    # Compute Weights
    weights = compute_mcdm_weights(complete_df, criteria)
    
    # Initialize output structures
    out_df = df[['canonical_acct', 'is_stub']].copy()
    out_df['trust_score'] = np.nan
    for c in criteria:
        out_df[f'contrib_{c}'] = np.nan
        
    valid_weights = sum(weights.values()) > 0
    if valid_weights:
        # Compute SAW for complete users
        for c in criteria:
            complete_df[f'contrib_{c}'] = complete_df[c] * weights[c]
            
        complete_df['trust_score'] = complete_df[[f'contrib_{c}' for c in criteria]].sum(axis=1)
        
        # Update out_df matching on index
        out_df.set_index('canonical_acct', inplace=True)
        complete_df.set_index('canonical_acct', inplace=True)
        
        cols_to_update = ['trust_score'] + [f'contrib_{c}' for c in criteria]
        out_df.update(complete_df[cols_to_update])
        out_df.reset_index(inplace=True)
    else:
        logger.error("MCDM run marked invalid. Returning NULL trust scores for all users.")
        
    # Save outputs
    out_df.to_sql('user_trust', conn, if_exists='replace', index=False)
    
    run_id = str(uuid.uuid4())
    weights_records = [{'run_id': run_id, 'criterion': k, 'weight': v} for k, v in weights.items()]
    pd.DataFrame(weights_records).to_sql('mcdm_weights', conn, if_exists='replace', index=False)
    
    conn.close()
    logger.info("Layer 4 Extractor Complete: Saved user_trust and mcdm_weights tables.")

if __name__ == "__main__":
    run_layer4()
