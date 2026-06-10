import os
import logging
from dotenv import load_dotenv
import httpx

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("episteme.config")

# Environment configurations
PORT = int(os.getenv("PORT", 8000))
HOST = os.getenv("HOST", "0.0.0.0")

# NVIDIA NIM Configs
NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY", "")
NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1"

# DB Configs
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

# Vector Store Configs
QDRANT_URL = os.getenv("QDRANT_URL", "")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY", "")

# Cache Configs
UPSTASH_REDIS_REST_URL = os.getenv("UPSTASH_REDIS_REST_URL", "")
UPSTASH_REDIS_REST_TOKEN = os.getenv("UPSTASH_REDIS_REST_TOKEN", "")

# Shared httpx client
http_client = httpx.AsyncClient(timeout=60.0)

async def call_nvidia_nim(model: str, messages: list, response_format: dict = None, temperature: float = 0.2) -> str:
    """
    Call NVIDIA NIM OpenAI-compatible chat completion endpoint.
    If no NVIDIA_API_KEY is found, falls back to a deterministic mock response.
    """
    if not NVIDIA_API_KEY:
        logger.warning(f"NVIDIA_API_KEY not found. Returning mock response for model '{model}'.")
        return get_mock_response(model, messages)

    headers = {
        "Authorization": f"Bearer {NVIDIA_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": 1024
    }
    if response_format:
        payload["response_format"] = response_format

    try:
        response = await http_client.post(
            f"{NVIDIA_BASE_URL}/chat/completions",
            json=payload,
            headers=headers
        )
        response.raise_for_status()
        result = response.json()
        return result["choices"][0]["message"]["content"]
    except Exception as e:
        logger.error(f"Error calling NVIDIA NIM model {model}: {e}")
        # Fallback to mock response on failure to prevent pipeline breakage
        return get_mock_response(model, messages)

async def get_nvidia_embedding(text: str, model: str = "nvidia/nv-embedqa-e5-v5") -> list[float]:
    """
    Generate embedding using NVIDIA nv-embedqa model.
    Falls back to mock vector if no key is present.
    """
    if not NVIDIA_API_KEY:
        # Return 1024-dimensional mock vector (normalized)
        import math
        logger.warning("NVIDIA_API_KEY not found. Returning mock 1024-dim embedding.")
        mock_vec = [0.0] * 1024
        # Generate some deterministic values based on text length
        val = sum(ord(c) for c in text) % 100 / 100.0
        mock_vec[0] = val
        mock_vec[1] = math.sqrt(1.0 - val*val)
        return mock_vec

    headers = {
        "Authorization": f"Bearer {NVIDIA_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "input": [text],
        "model": model,
        "input_type": "query"
    }

    try:
        response = await http_client.post(
            f"{NVIDIA_BASE_URL}/embeddings",
            json=payload,
            headers=headers
        )
        response.raise_for_status()
        result = response.json()
        return result["data"][0]["embedding"]
    except Exception as e:
        logger.error(f"Error calling NVIDIA NIM embedding model {model}: {e}")
        # Return mock 1024-dim vector on failure
        return [0.0] * 1024

async def rerank_passages(query: str, passages: list[dict], model: str = "nvidia/nv-rerankqa-mistral-4b-v3", top_n: int = 5) -> list[dict]:
    """
    Rerank a list of passages against a query using nv-rerankqa model.
    Falls back to standard Jaccard/text similarity if no API key is present.
    """
    if not NVIDIA_API_KEY or not passages:
        logger.warning("NVIDIA_API_KEY not found or empty passages. Rerank falling back to basic overlap sort.")
        # Basic jaccard token overlap similarity
        query_words = set(query.lower().split())
        scored = []
        for p in passages:
            text = p.get("text", p.get("abstract", ""))
            p_words = set(text.lower().split())
            score = len(query_words.intersection(p_words)) / max(1, len(query_words.union(p_words)))
            scored.append((score, p))
        scored.sort(key=lambda x: x[0], reverse=True)
        return [item[1] for item in scored[:top_n]]

    headers = {
        "Authorization": f"Bearer {NVIDIA_API_KEY}",
        "Content-Type": "application/json"
    }
    # Payload format for NVIDIA Rerank:
    payload = {
        "model": model,
        "query": {"text": query},
        "passages": [{"text": p.get("text", p.get("abstract", ""))} for p in passages],
        "top_n": top_n
    }

    try:
        response = await http_client.post(
            f"{NVIDIA_BASE_URL}/ranking",
            json=payload,
            headers=headers
        )
        response.raise_for_status()
        result = response.json()
        
        # Build reranked output based on indices
        ranked_passages = []
        for rank_info in result.get("rankings", []):
            idx = rank_info["index"]
            original = passages[idx]
            # Copy and add score
            ranked_passages.append({**original, "rerank_score": rank_info.get("logit", 0.0)})
        return ranked_passages
    except Exception as e:
        logger.error(f"Error calling NVIDIA NIM rerank model {model}: {e}")
        return passages[:top_n]

def get_mock_response(model: str, messages: list) -> str:
    """
    Generate mock responses for development.
    """
    last_msg = messages[-1]["content"] if messages else ""
    
    if "mixtral-8x7b-instruct" in model:
        # Mock claim extraction response in JSON format
        return """[
            {
                "claim": "The proposed graph neural network model achieves a 95% reduction in training latency.",
                "context": "Compared to standard GCNs, our model optimizes messages via sparse tensor reductions.",
                "category": "Methodology",
                "stats_referenced": "95% latency reduction"
            },
            {
                "claim": "Sparse tensor reductions maintain classification accuracy above 92.5% on standard benchmarks.",
                "context": "Our experiments on Cora and Pubmed datasets show accuracy levels of 92.8% and 93.1%.",
                "category": "Result",
                "stats_referenced": "92.5% threshold, Cora, Pubmed"
            }
        ]"""
    elif "llama-3.1-70b-instruct" in model or "llama-3.1-8b-instruct" in model:
        if "verify the following scientific claim" in last_msg.lower() or "determine if this claim is" in last_msg.lower():
            return """{
                "status": "Verified",
                "explanation": "The claim is supported by academic studies on sparse reduction in graph convolutional architectures."
            }"""
        elif "research_gaps" in last_msg.lower() or "novel research directions" in last_msg.lower() or "hypotheses" in last_msg.lower():
            return """{
                "research_gaps": [
                    "Dynamic Sparsity Adaptations: Lack of research on dynamic sparsification during continuous learning phases.",
                    "Scalability on Heterogeneous Graphs: Homogeneous network benchmarks dominate; heterogeneous scaling remains open."
                ],
                "hypotheses": [
                    {
                        "name": "Adaptive Sparse Message Passing",
                        "description": "Pruning pathways dynamically using RL weights.",
                        "method": "Train on Cora dataset and measure latency vs accuracy curve."
                    },
                    {
                        "name": "Heterogeneous Reduction Kernels",
                        "description": "Specialized sparse reduction kernels mapped to node type distribution densities.",
                        "method": "Verify sub-10ms query budgets on diverse graph layouts."
                    }
                ],
                "benchmarks": [
                    {
                        "task": "Cora Node Classification",
                        "metric": "Accuracy",
                        "paper_value": "92.8%",
                        "sota_value": "93.5%",
                        "source": "Papers With Code"
                    }
                ]
            }"""
        # Generic summary/synthesis
        return f"Mock synthesis response for model {model} based on prompt contents."
    
    elif "llama-3.2-11b-vision" in model:
        return """{
            "chart_flags": [
                {
                    "figure": "Figure 3",
                    "issue": "Misleading Y-axis starting at 85% instead of 0% to exaggerate accuracy differences",
                    "severity": "Medium"
                }
            ],
            "data_consistency": "Consistent with textual report, though error bars are omitted in benchmark comparison charts."
        }"""
        
    return "Mock response default placeholder."
