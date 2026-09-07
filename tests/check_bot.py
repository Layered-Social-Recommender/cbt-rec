import sqlite3
conn = sqlite3.connect('data/processed/mastodon/cbt_rec_dataset.db')
c = conn.cursor()
c.execute('SELECT canonical_acct, bot, is_stub FROM users WHERE bot=1')
print('Bot accounts:', c.fetchall())
c.execute('SELECT COUNT(*) FROM users WHERE bot=0 AND is_stub=1')
print('bot=0 and is_stub=1:', c.fetchone()[0])
# Also check: the /api/users endpoint merges users with user_features.is_stub
# It uses: stubMap[canonical_acct] = is_stub from user_features
# Make sure bot flag in users table flows correctly to frontend
c.execute('SELECT u.canonical_acct, u.bot, uf.is_stub FROM users u LEFT JOIN user_features uf ON u.canonical_acct = uf.canonical_acct WHERE u.bot=1')
print('Bot account cross-check:', c.fetchall())
