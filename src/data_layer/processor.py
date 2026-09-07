import os
import json
import sqlite3
import logging
import glob
from urllib.parse import urlparse

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def get_instance_from_url(url):
    try:
        parsed = urlparse(url)
        return parsed.netloc
    except:
        return 'unknown'

def derive_canonical_acct(account, default_instance="mastodon.social"):
    acct = account.get('acct', '')
    if '@' in acct:
        return acct
    else:
        # It's a local account on the fetched instance
        # Use URL to figure out the instance if possible, else default
        instance = get_instance_from_url(account.get('url', ''))
        if instance == 'unknown' or not instance:
            instance = default_instance
        return f"{acct}@{instance}"

def init_db(db_path):
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    
    # Enable foreign keys
    c.execute("PRAGMA foreign_keys = ON")
    
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            canonical_acct TEXT PRIMARY KEY,
            original_id TEXT,
            instance TEXT,
            username TEXT,
            original_acct TEXT,
            uri TEXT,
            url TEXT,
            display_name TEXT,
            bot BOOLEAN,
            created_at TEXT,
            followers_count INTEGER,
            following_count INTEGER,
            statuses_count INTEGER,
            is_stub BOOLEAN DEFAULT 0
        )
    ''')
    
    c.execute('''
        CREATE TABLE IF NOT EXISTS relationships (
            source_canonical TEXT,
            target_canonical TEXT,
            type TEXT,
            PRIMARY KEY (source_canonical, target_canonical, type),
            FOREIGN KEY (source_canonical) REFERENCES users(canonical_acct),
            FOREIGN KEY (target_canonical) REFERENCES users(canonical_acct)
        )
    ''')
    
    c.execute('''
        CREATE TABLE IF NOT EXISTS statuses (
            status_id TEXT PRIMARY KEY,
            account_canonical TEXT,
            created_at TEXT,
            in_reply_to_id TEXT,
            in_reply_to_account_id TEXT,
            in_reply_to_account_canonical TEXT,
            language TEXT,
            is_reblog BOOLEAN,
            content TEXT,
            visibility TEXT,
            sensitive BOOLEAN,
            spoiler_text TEXT,
            replies_count INTEGER,
            reblogs_count INTEGER,
            favourites_count INTEGER,
            url TEXT,
            hashtags TEXT,
            FOREIGN KEY (account_canonical) REFERENCES users(canonical_acct),
            FOREIGN KEY (in_reply_to_account_canonical) REFERENCES users(canonical_acct)
        )
    ''')
    
    c.execute('''
        CREATE TABLE IF NOT EXISTS interactions (
            interaction_id TEXT,
            source_canonical TEXT,
            target_canonical TEXT,
            type TEXT,
            source_status_id TEXT,
            target_status_id TEXT,
            timestamp TEXT,
            FOREIGN KEY (source_canonical) REFERENCES users(canonical_acct),
            FOREIGN KEY (target_canonical) REFERENCES users(canonical_acct)
        )
    ''')
    
    conn.commit()
    return conn

def process_accounts(conn, raw_dir, default_instance="mastodon.social"):
    c = conn.cursor()
    account_files = glob.glob(os.path.join(raw_dir, 'accounts', '*.json'))
    
    count = 0
    # Also load accounts from followers and following to populate users table
    all_account_files = account_files + glob.glob(os.path.join(raw_dir, 'followers', '*.json')) + glob.glob(os.path.join(raw_dir, 'following', '*.json'))
    
    seen_canonical = set()
    
    for fpath in all_account_files:
        with open(fpath, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        # following/followers lists contain arrays of accounts
        if isinstance(data, list):
            accounts = data
        else:
            accounts = [data]
            
        for acc in accounts:
            canonical = derive_canonical_acct(acc, default_instance)
            if canonical in seen_canonical:
                continue
            seen_canonical.add(canonical)
            
            instance = get_instance_from_url(acc.get('url', ''))
            
            c.execute('''
                INSERT OR IGNORE INTO users 
                (canonical_acct, original_id, instance, username, original_acct, uri, url, display_name, bot, created_at, followers_count, following_count, statuses_count)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                canonical,
                acc.get('id'),
                instance,
                acc.get('username'),
                acc.get('acct'),
                acc.get('uri'),
                acc.get('url'),
                acc.get('display_name'),
                acc.get('bot', False),
                acc.get('created_at'),
                acc.get('followers_count', 0),
                acc.get('following_count', 0),
                acc.get('statuses_count', 0)
            ))
            count += 1
            
    conn.commit()
    logger.info(f"Processed {count} unique user accounts.")
    return seen_canonical

def build_id_to_canonical_map(conn):
    c = conn.cursor()
    c.execute("SELECT original_id, canonical_acct FROM users")
    return {row[0]: row[1] for row in c.fetchall()}

def ensure_stub_user(c, canonical_acct):
    # Insert a stub user if they don't exist to satisfy foreign key constraints
    c.execute('''
        INSERT OR IGNORE INTO users (canonical_acct, is_stub)
        VALUES (?, 1)
    ''', (canonical_acct,))

def process_relationships(conn, raw_dir, id_map, default_instance="mastodon.social"):
    c = conn.cursor()
    count = 0
    
    # Process following
    following_files = glob.glob(os.path.join(raw_dir, 'following', '*.json'))
    for fpath in following_files:
        source_id = os.path.basename(fpath).replace('.json', '')
        source_canonical = id_map.get(source_id)
        if not source_canonical:
            continue
            
        with open(fpath, 'r', encoding='utf-8') as f:
            targets = json.load(f)
            
        for target in targets:
            target_canonical = derive_canonical_acct(target, default_instance)
            ensure_stub_user(c, source_canonical)
            ensure_stub_user(c, target_canonical)
            c.execute('''
                INSERT OR IGNORE INTO relationships (source_canonical, target_canonical, type)
                VALUES (?, ?, ?)
            ''', (source_canonical, target_canonical, 'follows'))
            count += 1
            
    # Process followers
    followers_files = glob.glob(os.path.join(raw_dir, 'followers', '*.json'))
    for fpath in followers_files:
        target_id = os.path.basename(fpath).replace('.json', '')
        target_canonical = id_map.get(target_id)
        if not target_canonical:
            continue
            
        with open(fpath, 'r', encoding='utf-8') as f:
            sources = json.load(f)
            
        for source in sources:
            source_canonical = derive_canonical_acct(source, default_instance)
            ensure_stub_user(c, source_canonical)
            ensure_stub_user(c, target_canonical)
            c.execute('''
                INSERT OR IGNORE INTO relationships (source_canonical, target_canonical, type)
                VALUES (?, ?, ?)
            ''', (source_canonical, target_canonical, 'follows'))
            count += 1
            
    conn.commit()
    logger.info(f"Processed {count} relationships.")

def process_statuses(conn, raw_dir, id_map, default_instance="mastodon.social"):
    c = conn.cursor()
    status_count = 0
    interaction_count = 0
    
    status_files = glob.glob(os.path.join(raw_dir, 'statuses', '*.json'))
    
    for fpath in status_files:
        # filename is {account_id}.json
        source_id = os.path.basename(fpath).replace('.json', '')
        source_canonical = id_map.get(source_id)
        if not source_canonical:
            continue
            
        with open(fpath, 'r', encoding='utf-8') as f:
            statuses = json.load(f)
            
        for status in statuses:
            status_id = status.get('id')
            is_reblog = status.get('reblog') is not None
            
            # Determine canonical target for replies
            target_canonical_for_reply = None
            reply_account_id = status.get('in_reply_to_account_id')
            if reply_account_id:
                # Primary mapping: use the collected id_map
                target_canonical_for_reply = id_map.get(reply_account_id)
                
                # Fallback mapping: if the account wasn't collected in our bounded set, 
                # we can sometimes recover their canonical acct string from the mentions array
                # of this specific status, since Mastodon includes replied users in mentions.
                if not target_canonical_for_reply:
                    for mention in status.get('mentions', []):
                        if mention.get('id') == reply_account_id:
                            target_canonical_for_reply = derive_canonical_acct(mention, default_instance)
                            break
                            
                # If still unresolved, we could theoretically generate a stub canonical string 
                # like {reply_account_id}@unknown, but it's cleaner to leave it None (null) 
                # or skip the reply edge if we cannot identify the canonical account at all.
                # Here we allow it to be None if completely unresolvable.

            if target_canonical_for_reply:
                ensure_stub_user(c, target_canonical_for_reply)
            ensure_stub_user(c, source_canonical)

            hashtags_json = json.dumps([tag.get('name') for tag in status.get('tags', [])])

            c.execute('''
                INSERT OR IGNORE INTO statuses (
                    status_id, account_canonical, created_at, in_reply_to_id, in_reply_to_account_id, 
                    in_reply_to_account_canonical, language, is_reblog, content, visibility, sensitive, 
                    spoiler_text, replies_count, reblogs_count, favourites_count, url, hashtags
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                status_id,
                source_canonical,
                status.get('created_at'),
                status.get('in_reply_to_id'),
                status.get('in_reply_to_account_id'),
                target_canonical_for_reply,
                status.get('language'),
                is_reblog,
                status.get('content'),
                status.get('visibility'),
                status.get('sensitive'),
                status.get('spoiler_text'),
                status.get('replies_count', 0),
                status.get('reblogs_count', 0),
                status.get('favourites_count', 0),
                status.get('url'),
                hashtags_json
            ))
            status_count += 1
            
            timestamp = status.get('created_at')
            
            # Interaction: Reblog
            if is_reblog:
                reblogged_status = status['reblog']
                reblogged_account = reblogged_status.get('account', {})
                target_canonical = derive_canonical_acct(reblogged_account, default_instance)
                
                ensure_stub_user(c, target_canonical)
                c.execute('''
                    INSERT INTO interactions (interaction_id, source_canonical, target_canonical, type, source_status_id, target_status_id, timestamp)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (f"reblog_{status_id}", source_canonical, target_canonical, 'reblog', status_id, reblogged_status.get('id'), timestamp))
                interaction_count += 1
                
            # Interaction: Reply
            if target_canonical_for_reply:
                c.execute('''
                    INSERT INTO interactions (interaction_id, source_canonical, target_canonical, type, source_status_id, target_status_id, timestamp)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (f"reply_{status_id}", source_canonical, target_canonical_for_reply, 'reply', status_id, status.get('in_reply_to_id'), timestamp))
                interaction_count += 1
                
            # Interaction: Mentions
            for mention in status.get('mentions', []):
                target_canonical = derive_canonical_acct(mention, default_instance)
                ensure_stub_user(c, target_canonical)
                c.execute('''
                    INSERT INTO interactions (interaction_id, source_canonical, target_canonical, type, source_status_id, target_status_id, timestamp)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (f"mention_{status_id}_{mention.get('id')}", source_canonical, target_canonical, 'mention', status_id, None, timestamp))
                interaction_count += 1
            
    conn.commit()
    logger.info(f"Processed {status_count} statuses and extracted {interaction_count} interactions.")

def run_processing():
    base_dir = os.path.dirname(__file__)
    raw_dir = os.path.join(base_dir, '..', '..', 'data', 'raw', 'mastodon')
    processed_dir = os.path.join(base_dir, '..', '..', 'data', 'processed', 'mastodon')
    
    os.makedirs(processed_dir, exist_ok=True)
    db_path = os.path.join(processed_dir, 'cbt_rec_dataset.db')
    
    config_path = os.path.join(base_dir, '..', '..', 'config', 'config.json')
    with open(config_path, 'r') as f:
        config = json.load(f)
        default_instance = config.get('mastodon_instance', 'mastodon.social')
    
    logger.info(f"Initializing database at {db_path}")
    conn = init_db(db_path)
    
    logger.info("Processing accounts...")
    process_accounts(conn, raw_dir, default_instance)
    
    id_map = build_id_to_canonical_map(conn)
    
    logger.info("Processing relationships...")
    process_relationships(conn, raw_dir, id_map, default_instance)
    
    logger.info("Processing statuses & interactions...")
    process_statuses(conn, raw_dir, id_map, default_instance)
    
    conn.close()
    logger.info("Processing complete.")

if __name__ == "__main__":
    run_processing()
