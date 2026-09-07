import sqlite3
conn = sqlite3.connect('data/processed/mastodon/cbt_rec_dataset.db')
c = conn.cursor()

c.execute('SELECT COUNT(*) FROM users')
print('DB total:', c.fetchone()[0])

c.execute('SELECT COUNT(*) FROM users WHERE is_stub=1')
print('DB stubs:', c.fetchone()[0])

c.execute('SELECT COUNT(*) FROM users WHERE is_stub=0')
print('DB complete:', c.fetchone()[0])

c.execute('SELECT COUNT(*) FROM users WHERE bot=1')
print('DB bots:', c.fetchone()[0])

c.execute("SELECT canonical_acct, bot, is_stub FROM users WHERE canonical_acct='lobsters@mastodon.social'")
print('lobsters row:', c.fetchone())

c.execute('SELECT COUNT(*) FROM relationships')
print('DB relationships:', c.fetchone()[0])

c.execute('SELECT COUNT(*) FROM statuses')
print('DB statuses:', c.fetchone()[0])

c.execute('SELECT COUNT(*) FROM interactions')
print('DB interactions:', c.fetchone()[0])

# Show the last 5 users alphabetically to check ordering
c.execute('SELECT canonical_acct, bot, is_stub FROM users ORDER BY canonical_acct LIMIT 5')
print('First 5 users (alpha):', c.fetchall())
c.execute('SELECT canonical_acct, bot, is_stub FROM users ORDER BY canonical_acct DESC LIMIT 5')
print('Last 5 users (alpha desc):', c.fetchall())

conn.close()
