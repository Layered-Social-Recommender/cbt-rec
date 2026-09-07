import json
import os
import time
import logging
from datetime import datetime
from collections import deque
from mastodon_client import MastodonClient

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def load_config():
    config_path = os.path.join(os.path.dirname(__file__), '..', '..', 'config', 'config.json')
    with open(config_path, 'r') as f:
        return json.load(f)

def save_raw_json(data, folder, filename):
    base_path = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'raw', 'mastodon', folder)
    os.makedirs(base_path, exist_ok=True)
    file_path = os.path.join(base_path, filename)
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def run_collection():
    config = load_config()
    instance = config.get("mastodon_instance", "mastodon.social")
    seed_acct = config.get("seed_account")
    limits = config.get("collection_limits", {})
    max_accounts = limits.get("max_accounts_explored", 50)
    max_followers = limits.get("max_followers_per_account", 200)
    max_following = limits.get("max_following_per_account", 200)
    max_statuses = limits.get("max_statuses_per_account", 100)
    
    rate_limits = config.get("rate_limit", {})
    client = MastodonClient(
        instance_url=instance, 
        rate_limit=rate_limits.get("requests_per_second", 1.0),
        max_retries=rate_limits.get("max_retries", 3)
    )

    logger.info(f"Resolving seed account: {seed_acct} on {instance}")
    seed_account_data = client.lookup_account(seed_acct)
    
    if not seed_account_data:
        logger.error("Failed to resolve seed account. Exiting.")
        return

    seed_id = seed_account_data['id']
    logger.info(f"Seed account resolved to ID: {seed_id}")

    queue = deque([seed_id])
    explored = set()
    accounts_collected = 0
    relationships_collected = 0
    statuses_collected = 0

    run_id = f"run_{int(time.time())}"
    
    metadata = {
        "collection_timestamp": datetime.now().isoformat(),
        "mastodon_instance": instance,
        "seed_account": seed_acct,
        "seed_id": seed_id,
        "collection_limits": limits,
        "api_endpoints_used": ["/api/v1/accounts/lookup", "/api/v1/accounts/:id", "/api/v1/accounts/:id/following", "/api/v1/accounts/:id/followers", "/api/v1/accounts/:id/statuses"],
        "run_identifier": run_id,
        "stats": {}
    }

    while queue and accounts_collected < max_accounts:
        current_id = queue.popleft()
        if current_id in explored:
            continue
            
        explored.add(current_id)
        logger.info(f"Processing account {current_id} ({accounts_collected + 1}/{max_accounts})")
        
        # 1. Fetch/Save Account Profile
        if current_id == seed_id:
            account_data = seed_account_data
        else:
            account_data = client.get_account(current_id)
            
        if not account_data:
            continue
            
        save_raw_json(account_data, 'accounts', f"{current_id}.json")
        accounts_collected += 1
        
        # 2. Fetch/Save Following
        following = client.get_account_relationships(current_id, rel_type="following", max_items=max_following)
        if following:
            save_raw_json(following, 'following', f"{current_id}.json")
            relationships_collected += len(following)
            # Add to queue for BFS (only if it's a local instance to simplify for now, or just add all IDs)
            for f in following:
                if f['id'] not in explored:
                    queue.append(f['id'])
                    
        # 3. Fetch/Save Followers
        followers = client.get_account_relationships(current_id, rel_type="followers", max_items=max_followers)
        if followers:
            save_raw_json(followers, 'followers', f"{current_id}.json")
            relationships_collected += len(followers)
            for f in followers:
                if f['id'] not in explored:
                    queue.append(f['id'])

        # 4. Fetch/Save Statuses
        statuses = client.get_account_statuses(current_id, max_items=max_statuses)
        if statuses:
            save_raw_json(statuses, 'statuses', f"{current_id}.json")
            statuses_collected += len(statuses)
            
    # Save Metadata
    metadata['stats'] = {
        "accounts_explored": accounts_collected,
        "relationships_collected": relationships_collected,
        "statuses_collected": statuses_collected
    }
    
    save_raw_json(metadata, 'metadata', f"{run_id}.json")
    logger.info("Collection complete.")
    logger.info(f"Stats: {metadata['stats']}")

if __name__ == "__main__":
    run_collection()
