import sqlite3
import pandas as pd

conn = sqlite3.connect('data/processed/mastodon/cbt_rec_dataset.db')
c = conn.cursor()

def get_count(table):
    c.execute(f"SELECT count(*) FROM {table}")
    return c.fetchone()[0]

stats = {
    "unique_users": get_count("users"),
    "relationships": get_count("relationships"),
    "statuses": get_count("statuses"),
    "interactions": get_count("interactions")
}

# Orphans in relationships
c.execute("""
    SELECT count(*) FROM relationships r
    LEFT JOIN users u1 ON r.source_canonical = u1.canonical_acct
    LEFT JOIN users u2 ON r.target_canonical = u2.canonical_acct
    WHERE u1.canonical_acct IS NULL OR u2.canonical_acct IS NULL
""")
rel_orphans = c.fetchone()[0]

# Orphans in interactions
c.execute("""
    SELECT count(*) FROM interactions i
    LEFT JOIN users u1 ON i.source_canonical = u1.canonical_acct
    LEFT JOIN users u2 ON i.target_canonical = u2.canonical_acct
    WHERE u1.canonical_acct IS NULL OR u2.canonical_acct IS NULL
""")
int_orphans = c.fetchone()[0]

# Local vs Remote
c.execute("SELECT count(*) FROM users WHERE canonical_acct LIKE '%@%' AND canonical_acct NOT LIKE '%@mastodon.social'")
remote_count = c.fetchone()[0]
c.execute("SELECT count(*) FROM users WHERE canonical_acct LIKE '%@mastodon.social'")
local_count = c.fetchone()[0]

print("--- FINAL VALIDATION STATS ---")
print(f"Unique Users: {stats['unique_users']}")
print(f"Relationships: {stats['relationships']}")
print(f"Statuses: {stats['statuses']}")
print(f"Interactions: {stats['interactions']}")
print(f"Orphan Relationship References: {rel_orphans}")
print(f"Orphan Interaction References: {int_orphans}")
print(f"Local Accounts (mastodon.social): {local_count}")
print(f"Remote Accounts: {remote_count}")

# Print Schema
print("\n--- SQLITE SCHEMA ---")
c.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
for row in c.fetchall():
    print(row[0] + "\n")
