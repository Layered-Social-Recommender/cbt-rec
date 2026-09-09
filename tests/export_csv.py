import sqlite3
import pandas as pd
import os

DB_PATH = 'data/processed/mastodon/cbt_rec_dataset.db'
CSV_DIR = 'data/processed/mastodon/csv'
os.makedirs(CSV_DIR, exist_ok=True)

conn = sqlite3.connect(DB_PATH)

exports = {
    'users': 'mastodon_users.csv',
    'relationships': 'mastodon_relationships.csv',
    'statuses': 'mastodon_statuses.csv',
    'interactions': 'mastodon_interactions.csv',
}

print("Exporting tables from:", DB_PATH)
print()

for table, filename in exports.items():
    df = pd.read_sql_query(f"SELECT * FROM {table}", conn)
    out_path = os.path.join(CSV_DIR, filename)
    df.to_csv(out_path, index=False, encoding='utf-8-sig')  # utf-8-sig for Excel compatibility

    # Validate
    db_count = conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
    csv_df = pd.read_csv(out_path, encoding='utf-8-sig')
    csv_count = len(csv_df)
    match = "OK" if db_count == csv_count else "MISMATCH"
    print(f"{table}: SQLite={db_count}, CSV={csv_count} [{match}]")
    print(f"  Columns: {list(df.columns)}")
    print(f"  Saved to: {out_path}")
    print()

conn.close()
print("All exports complete.")
