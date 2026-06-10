import json
import logging
from typing import Optional, Dict, Any
from app.config import UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN, SUPABASE_URL, SUPABASE_KEY

logger = logging.getLogger("episteme.cache")

# Local in-memory cache fallback
_local_cache: Dict[str, str] = {}

# Try to setup redis client
redis_client = None
if UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN:
    try:
        from redis import Redis
        # Extract host and port/password from Upstash HTTP url or connect using direct Redis protocol
        # For simplicity, Upstash Redis supports Redis protocol. If URL looks like rediss://..., connect directly.
        # Alternatively, we can use httpx request to Upstash REST API or standard redis client
        # Let's check format:
        if "rediss://" in UPSTASH_REDIS_REST_URL or "redis://" in UPSTASH_REDIS_REST_URL:
            redis_client = Redis.from_url(UPSTASH_REDIS_REST_URL)
        else:
            # Assume it's the REST endpoint. We can connect using standard URL patterns or parse it
            # For robustness, we will use HTTP calls or python redis client if host is parsed.
            # Let's log it.
            logger.info("Upstash Redis REST URL found. Connecting via standard Redis wrapper if URL is parsed.")
    except Exception as e:
        logger.error(f"Failed to connect to Redis: {e}")

# Try to setup Supabase client for database storage
supabase_client = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        from supabase import create_client
        supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
        logger.info("Successfully connected to Supabase Database.")
    except Exception as e:
        logger.error(f"Failed to connect to Supabase: {e}")

def get_cached_analysis(paper_id: str) -> Optional[Dict[str, Any]]:
    """
    Retrieve cached paper analysis.
    Checks Redis, then Supabase, and falls back to local memory.
    """
    # 1. Try Redis cache (Fastest)
    if redis_client:
        try:
            val = redis_client.get(f"paper:{paper_id}")
            if val:
                logger.info(f"Cache HIT (Redis) for paper {paper_id}")
                return json.loads(val)
        except Exception as e:
            logger.error(f"Redis cache get failed: {e}")

    # 2. Try Supabase database (Second level)
    if supabase_client:
        try:
            # We assume a 'paper_cache' table with fields: id (string), analysis (json)
            response = supabase_client.table("paper_cache").select("analysis").eq("id", paper_id).execute()
            if response.data:
                analysis = response.data[0].get("analysis")
                logger.info(f"Cache HIT (Supabase) for paper {paper_id}")
                # Store back in Redis for next time
                if redis_client:
                    try:
                        redis_client.setex(f"paper:{paper_id}", 86400, json.dumps(analysis)) # 24 hrs cache
                    except Exception:
                        pass
                return analysis
        except Exception as e:
            logger.error(f"Supabase cache get failed: {e}")

    # 3. Local fallback
    if paper_id in _local_cache:
        logger.info(f"Cache HIT (Local Memory) for paper {paper_id}")
        return json.loads(_local_cache[paper_id])

    logger.info(f"Cache MISS for paper {paper_id}")
    return None

def cache_analysis(paper_id: str, analysis: Dict[str, Any]):
    """
    Cache paper analysis.
    Saves to Redis, Supabase, and local memory.
    """
    serialized = json.dumps(analysis)
    
    # 1. Cache in local memory
    _local_cache[paper_id] = serialized

    # 2. Cache in Redis
    if redis_client:
        try:
            redis_client.setex(f"paper:{paper_id}", 86400, serialized) # 24 hrs cache
            logger.info(f"Cached paper {paper_id} in Redis.")
        except Exception as e:
            logger.error(f"Redis cache set failed: {e}")

    # 3. Cache in Supabase
    if supabase_client:
        try:
            # Insert or update
            data = {"id": paper_id, "analysis": analysis}
            supabase_client.table("paper_cache").upsert(data).execute()
            logger.info(f"Cached paper {paper_id} in Supabase.")
        except Exception as e:
            logger.error(f"Supabase cache upsert failed: {e}")
