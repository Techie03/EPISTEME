import logging
from typing import List, Dict, Any, Optional
from app.config import QDRANT_URL, QDRANT_API_KEY

logger = logging.getLogger("episteme.vector_store")

# In-memory vector database fallback for local development
_local_vector_db: Dict[str, Dict[str, Any]] = {}

# Try to import Qdrant, fallback if not installed yet or not configured
qdrant_client = None
if QDRANT_URL and QDRANT_API_KEY:
    try:
        from qdrant_client import QdrantClient
        from qdrant_client.http import models as qmodels
        qdrant_client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
        logger.info("Successfully connected to Qdrant Cloud.")
    except Exception as e:
        logger.error(f"Failed to initialize QdrantClient: {e}. Falling back to in-memory store.")
else:
    logger.warning("Qdrant credentials missing. Using local in-memory vector store fallback.")

def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    """Helper to compute cosine similarity for mock search"""
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0
    dot_product = sum(a * b for a, b in zip(v1, v2))
    norm_a = sum(a * a for a in v1) ** 0.5
    norm_b = sum(b * b for b in v2) ** 0.5
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return dot_product / (norm_a * norm_b)

async def upsert_paper(paper_id: str, vector: List[float], payload: Dict[str, Any]):
    """
    Upsert a paper vector and metadata.
    """
    if qdrant_client:
        try:
            # We assume collection named 'papers' exists or will be created
            # In production, check collection first
            collection_name = "papers"
            
            # Simple upsert
            qdrant_client.upsert(
                collection_name=collection_name,
                points=[
                    qmodels.PointStruct(
                        id=paper_id,  # UUID or hashed string
                        vector=vector,
                        payload=payload
                    )
                ]
            )
            logger.info(f"Upserted paper {paper_id} to Qdrant Cloud.")
            return
        except Exception as e:
            logger.error(f"Qdrant upsert failed: {e}. Falling back to local store.")

    # Local fallback
    _local_vector_db[paper_id] = {
        "vector": vector,
        "payload": payload
    }
    logger.info(f"Upserted paper {paper_id} to local in-memory vector store. Size: {len(_local_vector_db)}")

async def search_similar(vector: List[float], limit: int = 5) -> List[Dict[str, Any]]:
    """
    Search for similar papers by vector.
    """
    if qdrant_client:
        try:
            results = qdrant_client.search(
                collection_name="papers",
                query_vector=vector,
                limit=limit
            )
            return [{**hit.payload, "score": hit.score} for hit in results]
        except Exception as e:
            logger.error(f"Qdrant search failed: {e}. Falling back to local store.")

    # Local fallback search
    scored_results = []
    for paper_id, data in _local_vector_db.items():
        score = cosine_similarity(vector, data["vector"])
        scored_results.append({**data["payload"], "score": score})
        
    scored_results.sort(key=lambda x: x["score"], reverse=True)
    return scored_results[:limit]

async def clear_all_papers():
    """
    Clears all papers from local in-memory database and Qdrant Cloud.
    """
    global _local_vector_db
    _local_vector_db.clear()
    logger.info("Cleared local in-memory vector database.")
    
    if qdrant_client:
        try:
            from qdrant_client.http import models as qmodels
            collection_name = "papers"
            if qdrant_client.collection_exists(collection_name):
                qdrant_client.delete_collection(collection_name)
            
            # Recreate with 1024 vector size (e5-v5 is 1024-dim)
            qdrant_client.create_collection(
                collection_name=collection_name,
                vectors_config=qmodels.VectorParams(size=1024, distance=qmodels.Distance.COSINE)
            )
            logger.info("Re-created Qdrant collection 'papers' to clear all history.")
        except Exception as e:
            logger.error(f"Failed to clear Qdrant collection: {e}")
