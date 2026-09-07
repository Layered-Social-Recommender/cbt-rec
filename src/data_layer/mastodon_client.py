import requests
import time
import logging
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

class MastodonClient:
    def __init__(self, instance_url="mastodon.social", rate_limit=1.0, max_retries=3):
        # Ensure instance_url is clean
        self.instance = instance_url.replace('https://', '').replace('http://', '').strip('/')
        self.base_url = f"https://{self.instance}"
        self.rate_limit = rate_limit
        self.max_retries = max_retries
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "CBT-Rec-Research-Bot/1.0"
        })

    def _sleep_for_rate_limit(self, response=None):
        if response and 'X-RateLimit-Remaining' in response.headers:
            remaining = int(response.headers['X-RateLimit-Remaining'])
            if remaining < 5:
                # If we're running low on limits, parse reset time if available, or just sleep
                reset = response.headers.get('X-RateLimit-Reset')
                if reset:
                    # simplistic approach: sleep until reset or a fixed penalty
                    logger.info(f"Rate limit approaching. Remaining: {remaining}. Sleeping for 5s.")
                    time.sleep(5)
                else:
                    time.sleep(self.rate_limit)
        else:
            time.sleep(self.rate_limit)

    def _make_request(self, method, endpoint, params=None):
        url = f"{self.base_url}{endpoint}"
        retries = 0
        
        while retries <= self.max_retries:
            try:
                response = self.session.request(method, url, params=params, timeout=10)
                
                # Check for rate limiting headers and sleep if necessary
                self._sleep_for_rate_limit(response)

                # Handle specific HTTP codes
                if response.status_code == 200:
                    return response
                elif response.status_code in [401, 403]:
                    logger.warning(f"Access forbidden/unauthorized for {url} (status {response.status_code}). Skipping.")
                    return None
                elif response.status_code == 404:
                    logger.warning(f"Resource not found: {url}. Skipping.")
                    return None
                elif response.status_code == 429:
                    logger.warning(f"Rate limited on {url}. Sleeping for 30s before retry.")
                    time.sleep(30)
                    retries += 1
                    continue
                else:
                    logger.warning(f"Unexpected status code {response.status_code} for {url}.")
                    response.raise_for_status()

            except requests.exceptions.RequestException as e:
                logger.error(f"Network error on {url}: {e}")
                retries += 1
                time.sleep(2 ** retries) # Exponential backoff
                
        logger.error(f"Max retries exceeded for {url}.")
        return None

    def lookup_account(self, acct):
        """Lookup an account by acct (username or username@domain)."""
        response = self._make_request('GET', '/api/v1/accounts/lookup', params={'acct': acct})
        if response:
            return response.json()
        return None

    def get_account(self, account_id):
        """Get account profile by local ID."""
        response = self._make_request('GET', f'/api/v1/accounts/{account_id}')
        if response:
            return response.json()
        return None

    def get_account_relationships(self, account_id, rel_type="following", max_items=200):
        """Fetch following or followers with pagination."""
        endpoint = f'/api/v1/accounts/{account_id}/{rel_type}'
        items = []
        params = {'limit': 80} # Max allowed by Mastodon per page usually
        
        while len(items) < max_items:
            response = self._make_request('GET', endpoint, params=params)
            if not response:
                break
                
            page_data = response.json()
            if not page_data:
                break
                
            items.extend(page_data)
            
            # Pagination using Link header
            if 'Link' in response.headers:
                links = response.headers['Link'].split(', ')
                next_url = None
                for link in links:
                    if 'rel="next"' in link:
                        next_url = link[link.index('<')+1 : link.index('>')]
                        break
                
                if next_url:
                    # Parse params from next_url
                    parsed_url = urlparse(next_url)
                    from urllib.parse import parse_qs
                    query_params = parse_qs(parsed_url.query)
                    
                    # Update params for next request, using max_id
                    if 'max_id' in query_params:
                        params = {'limit': 80, 'max_id': query_params['max_id'][0]}
                    else:
                        break
                else:
                    break
            else:
                break
                
        return items[:max_items]

    def get_account_statuses(self, account_id, max_items=100):
        """Fetch statuses (posts, replies, reblogs) with pagination."""
        endpoint = f'/api/v1/accounts/{account_id}/statuses'
        items = []
        params = {'limit': 40} 
        
        while len(items) < max_items:
            response = self._make_request('GET', endpoint, params=params)
            if not response:
                break
                
            page_data = response.json()
            if not page_data:
                break
                
            items.extend(page_data)
            
            if 'Link' in response.headers:
                links = response.headers['Link'].split(', ')
                next_url = None
                for link in links:
                    if 'rel="next"' in link:
                        next_url = link[link.index('<')+1 : link.index('>')]
                        break
                
                if next_url:
                    parsed_url = urlparse(next_url)
                    from urllib.parse import parse_qs
                    query_params = parse_qs(parsed_url.query)
                    if 'max_id' in query_params:
                        params = {'limit': 40, 'max_id': query_params['max_id'][0]}
                    else:
                        break
                else:
                    break
            else:
                break
                
        return items[:max_items]
