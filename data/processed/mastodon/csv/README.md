# CBT-Rec Mastodon Dataset — CSV Exports

These CSV files are direct exports of the validated Mastodon dataset used by the **CBT-Rec Layered Social Recommender** final year project.

## Files

| File | Table | Rows | Description |
|---|---|---|---|
| `mastodon_users.csv` | `users` | 270 | All observed Mastodon accounts (205 complete + 65 stubs) |
| `mastodon_relationships.csv` | `relationships` | 214 | Directed follow relationships between observed accounts |
| `mastodon_statuses.csv` | `statuses` | 120 | Collected statuses from seed accounts (max 40 per seed) |
| `mastodon_interactions.csv` | `interactions` | 128 | Derived interactions: replies, reblogs, mentions |

## Source of Truth

The **SQLite database** at `data/processed/mastodon/cbt_rec_dataset.db` is the authoritative source of truth for all CBT-Rec Layer 1–4 computations. These CSVs are read-only exports for inspection, demonstration, and reproducibility verification only.

## Data Collection

- Data was collected from the **Mastodon REST API** (mastodon.social and federated instances).
- Collection used a **bounded snowball sampling strategy** starting from 3 seed accounts.
- Maximum limits: 40 followers, 40 following, 40 statuses per account.
- Collection was performed under the CBT-Rec research methodology (Layer 1).

## Important Notes

- This is a **bounded research snapshot**, not a complete Mastodon network crawl.
- Account identities use `canonical_acct` format: `username@instance` (e.g., `iftas@mastodon.iftas.org`).
- Stub accounts (65 of 270) have profile data only — statuses/interactions were not collected for them.
- Missing values appear as empty fields (not zero), preserving the distinction between "zero observed" and "not collected".
- No personally identifiable information beyond public Mastodon profile data is included.
- All collected data was publicly available via the Mastodon API at time of collection.

## Validation

Row counts verified against SQLite at export time:
- users: **270** ✓
- relationships: **214** ✓
- statuses: **120** ✓
- interactions: **128** ✓
