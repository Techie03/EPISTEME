import os
import hashlib
import logging
from fastapi import FastAPI, HTTPException, Body, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from app.config import PORT, HOST
from app.pipeline.graph import pipeline_app
from app.pipeline.models import PaperAnalysisResponse, GraphState
from app.cache import get_cached_analysis, cache_analysis
from app.vector_store import search_similar, upsert_paper, _local_vector_db

logger = logging.getLogger("episteme.main")

app = FastAPI(
    title="Episteme API",
    description="The Universal Research Intelligence & Truth Verification Backend",
    version="1.0.0"
)

@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    svg_content = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#6366F1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 18h8"/><path d="M3 22h18"/><path d="M14 22a7 7 0 1 0-14 0"/><path d="M9 14h2"/><path d="M9 12a2 2 0 1 1-4 0V7a2 2 0 1 1 4 0Z"/><path d="M12 2v4l3 3"/><path d="m11 18 2 2"/></svg>"""
    return Response(content=svg_content, media_type="image/svg+xml")

@app.get("/", response_class=HTMLResponse, include_in_schema=False)
async def root_home():
    html_content = """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Episteme API - Healthy</title>
        <link rel="icon" href="/favicon.ico" type="image/svg+xml">
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=Outfit:wght@700&display=swap" rel="stylesheet">
        <style>
            :root {
                --bg: #090a10;
                --card-bg: rgba(255, 255, 255, 0.02);
                --border: rgba(255, 255, 255, 0.06);
                --primary: #6366f1;
                --primary-glow: rgba(99, 102, 241, 0.15);
                --text: #f3f4f6;
                --text-muted: #9ca3af;
                --success: #10b981;
            }
            body {
                margin: 0;
                padding: 0;
                background-color: var(--bg);
                color: var(--text);
                font-family: 'Inter', sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                overflow: hidden;
            }
            .backdrop {
                position: absolute;
                width: 100%;
                height: 100%;
                background-image: 
                    radial-gradient(circle at 20% 30%, var(--primary-glow) 0%, transparent 40%),
                    radial-gradient(circle at 80% 70%, rgba(6, 182, 212, 0.1) 0%, transparent 40%);
                z-index: 0;
            }
            .container {
                position: relative;
                z-index: 1;
                background: var(--card-bg);
                backdrop-filter: blur(12px);
                border: 1px solid var(--border);
                padding: 40px;
                border-radius: 24px;
                max-width: 480px;
                width: 90%;
                text-align: center;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
                animation: float 4s infinite ease-in-out;
            }
            @keyframes float {
                0% { transform: translateY(0px); }
                50% { transform: translateY(-8px); }
                100% { transform: translateY(0px); }
            }
            .logo {
                font-size: 56px;
                margin-bottom: 20px;
                text-shadow: 0 0 15px rgba(99, 102, 241, 0.5);
            }
            h1 {
                font-family: 'Outfit', sans-serif;
                font-size: 32px;
                font-weight: 800;
                margin: 0 0 10px 0;
                background: linear-gradient(135deg, #a5b4fc 0%, var(--primary) 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
            }
            .status-badge {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                background: rgba(16, 185, 129, 0.08);
                color: var(--success);
                border: 1px solid rgba(16, 185, 129, 0.25);
                padding: 6px 16px;
                border-radius: 20px;
                font-size: 13px;
                font-weight: 600;
                margin-bottom: 20px;
            }
            .status-dot {
                width: 8px;
                height: 8px;
                background-color: var(--success);
                border-radius: 50%;
                box-shadow: 0 0 8px var(--success);
                animation: pulse 1.5s infinite ease-in-out;
            }
            @keyframes pulse {
                0% { opacity: 0.5; }
                50% { opacity: 1; }
                100% { opacity: 0.5; }
            }
            p {
                font-size: 15px;
                line-height: 1.6;
                color: var(--text-muted);
                margin: 0 0 30px 0;
            }
            .btn {
                display: inline-block;
                background: linear-gradient(135deg, #818cf8 0%, var(--primary) 100%);
                color: white;
                text-decoration: none;
                padding: 12px 28px;
                border-radius: 30px;
                font-weight: 600;
                font-size: 14px;
                box-shadow: 0 4px 15px rgba(99, 102, 241, 0.35);
                transition: all 0.2s ease;
            }
            .btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(99, 102, 241, 0.45);
            }
        </style>
    </head>
    <body>
        <div class="backdrop"></div>
        <div class="container">
            <div class="logo">🔬</div>
            <h1>Episteme API</h1>
            <div class="status-badge">
                <div class="status-dot"></div>
                <span>Service Online</span>
            </div>
            <p>The Universal Research Intelligence and Truth Verification Layer backend is fully operational in the cloud.</p>
            <a href="/docs" class="btn">Explore API Docs</a>
        </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)


# Enable CORS for Chrome/Firefox/Edge Extensions
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow extensions from any origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def generate_paper_id(title: str, doi: str = None) -> str:
    """Helper to compute a stable unique ID for caching and storage"""
    if doi:
        # Clean DOI to make it a safe path/id
        clean_doi = doi.strip().replace("/", "_").replace("\\", "_")
        return f"doi_{clean_doi}"
    
    # Hash the title to make a short unique hex
    hasher = hashlib.md5(title.strip().lower().encode("utf-8"))
    return f"title_{hasher.hexdigest()}"

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "Episteme API"}

class ChatRequest(BaseModel):
    title: str
    raw_text: str
    message: str
    history: list = []

@app.post("/api/chat")
async def chat_with_paper(payload: ChatRequest):
    """
    Chat with the context of the paper using NVIDIA NIM llama-3.1-70b-instruct.
    """
    from app.config import call_nvidia_nim
    
    # Construct context system message
    system_prompt = (
        "You are Episteme, a powerful research intelligence copilot. "
        "You are helping a researcher understand a scientific paper.\\n\\n"
        f"Paper Title: {payload.title}\\n"
        f"Paper Content (truncated context):\\n{payload.raw_text[:6000]}\\n\\n"
        "Instructions:\\n"
        "- Answer the user's question accurately and objectively using the paper's context.\\n"
        "- If the answer is not in the text, extrapolate logically based on scientific principles, but make it clear when you are doing so.\\n"
        "- Keep responses clear, professional, and concise."
    )
    
    messages = [{"role": "system", "content": system_prompt}]
    
    # Add history (up to last 10 messages)
    for h in payload.history[-10:]:
        messages.append({"role": h.get("role", "user"), "content": h.get("content", "")})
        
    messages.append({"role": "user", "content": payload.message})
    
    try:
        reply = await call_nvidia_nim(
            model="meta/llama-3.1-70b-instruct",
            messages=messages,
            temperature=0.3
        )
        return {"response": reply}
    except Exception as e:
        logger.exception("Error in chat handler")
        raise HTTPException(status_code=500, detail=str(e))

class ExplainRequest(BaseModel):
    phrase: str

@app.post("/api/explain")
async def explain_jargon(payload: ExplainRequest):
    """
    Explain highlighted jargon in simple terms using NVIDIA NIM llama-3.1-8b-instruct.
    """
    from app.config import call_nvidia_nim
    
    prompt = (
        "You are a helpful science communicator. Explain the following scientific phrase, "
        "jargon, acronym, or equation in simple, clear, and layman-friendly terms. "
        "Keep the explanation strictly to 1 or 2 sentences.\\n\\n"
        f"Phrase: {payload.phrase}"
    )
    
    messages = [
        {"role": "system", "content": "You are a clear science communicator who explains concepts in simple terms."},
        {"role": "user", "content": prompt}
    ]
    
    try:
        reply = await call_nvidia_nim(
            model="meta/llama-3.1-8b-instruct",
            messages=messages,
            temperature=0.2
        )
        return {"explanation": reply}
    except Exception as e:
        logger.exception("Error in jargon explanation")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/analyze", response_model=PaperAnalysisResponse)
async def analyze_paper(
    title: str = Body(..., description="Title of the research paper"),
    raw_text: str = Body(..., description="Plain text content extracted from the paper"),
    doi: str = Body(None, description="Digital Object Identifier"),
    arxiv_id: str = Body(None, description="arXiv unique identifier")
):
    """
    Analyzes a scientific paper. Check cache first. Run LangGraph pipeline on cache miss.
    """
    logger.info(f"Received analysis request for paper: {title[:50]}...")
    
    if not title or not raw_text:
        raise HTTPException(status_code=400, detail="Title and raw_text are required fields.")
        
    paper_id = generate_paper_id(title, doi)
    
    # 1. Try Cache Lookup (Fastpath)
    cached = get_cached_analysis(paper_id)
    if cached:
        logger.info(f"Returning cached analysis for paper_id: {paper_id}")
        return cached

    # 2. Cache Miss - Run LangGraph pipeline
    logger.info(f"Cache miss for {paper_id}. Executing LangGraph verification pipeline...")
    try:
        initial_state = {
            "doi": doi,
            "arxiv_id": arxiv_id,
            "title": title,
            "raw_text": raw_text,
            "claims": [],
            "similar_papers": [],
            "research_gaps": [],
            "hypotheses": [],
            "benchmarks": [],
            "stats_anomalies": [],
            "concept_map_nodes": [],
            "concept_map_links": []
        }
        
        # Invoke LangGraph pipeline asynchronously
        result = await pipeline_app.ainvoke(initial_state)
        
        # Compile response fields
        analysis_result = {
            "doi": result.get("doi"),
            "arxiv_id": result.get("arxiv_id"),
            "title": result.get("title"),
            "claims": result.get("claims", []),
            "integrity_report": result.get("integrity_report"),
            "research_gaps": result.get("research_gaps", []),
            "hypotheses": result.get("hypotheses", []),
            "benchmarks": result.get("benchmarks", []),
            "similar_papers": result.get("similar_papers", []),
            "stats_anomalies": result.get("stats_anomalies", []),
            "concept_map_nodes": result.get("concept_map_nodes", []),
            "concept_map_links": result.get("concept_map_links", []),
            "replication_repos": result.get("replication_repos", []),
            "complexity": result.get("complexity"),
            "related_videos": result.get("related_videos", []),
            "author_network": result.get("author_network", [])
        }

        # 3. Store in Vector DB (for personal research memory search)
        # We vector index based on the title & summary findings
        summary_text = f"Title: {title}\nClaims: " + " ".join([c["claim"] for c in analysis_result["claims"][:3]])
        # Simulating vector embedding or actual query
        from app.config import get_nvidia_embedding
        vector = await get_nvidia_embedding(summary_text)
        
        await upsert_paper(
            paper_id=paper_id,
            vector=vector,
            payload={
                "id": paper_id,
                "title": title,
                "doi": doi,
                "arxiv_id": arxiv_id,
                "summary": summary_text[:500]
            }
        )

        # 4. Cache the full analysis output
        cache_analysis(paper_id, analysis_result)
        
        return analysis_result

    except Exception as e:
        logger.exception("Error executing analysis pipeline")
        raise HTTPException(status_code=500, detail=f"Pipeline error: {str(e)}")

@app.get("/api/paper/{paper_id}", response_model=PaperAnalysisResponse)
async def get_paper(paper_id: str):
    """
    Retrieves analysis for a specific paper from cache.
    """
    cached = get_cached_analysis(paper_id)
    if not cached:
        raise HTTPException(status_code=404, detail="Paper analysis not found.")
    return cached

@app.get("/api/history")
async def get_history(query: str = None, limit: int = 20):
    """
    Search or list user's personal research memory history.
    """
    if query:
        # Vector search
        from app.config import get_nvidia_embedding
        query_vec = await get_nvidia_embedding(query)
        results = await search_similar(query_vec, limit=limit)
        return results
        
    # Else list all locally saved/cached papers
    history = []
    # If using local in-memory DB:
    for paper_id, data in _local_vector_db.items():
        history.append(data["payload"])
        
    return history[:limit]

class CompareRequest(BaseModel):
    paper_id_a: str
    paper_id_b: str

@app.post("/api/compare")
async def compare_papers(payload: CompareRequest):
    """
    Compare claims and methodologies of two historical papers.
    """
    analysis_a = get_cached_analysis(payload.paper_id_a)
    analysis_b = get_cached_analysis(payload.paper_id_b)
    if not analysis_a or not analysis_b:
        raise HTTPException(status_code=404, detail="One or both paper analyses not found in personal research memory cache.")
    
    claims_a = "\n".join([f"- {c.get('claim')}" for c in analysis_a.get("claims", [])])
    claims_b = "\n".join([f"- {c.get('claim')}" for c in analysis_b.get("claims", [])])
    
    prompt = f"""You are a scientific verification contrast bot. Compare the core claims, methodologies, and findings of the two scientific papers below:

Paper A: {analysis_a.get('title')}
Claims A:
{claims_a}

Paper B: {analysis_b.get('title')}
Claims B:
{claims_b}

Tasks:
1. Identify agreements/similarities in claims, dataset results, or parameters.
2. Identify conflicts/contradictions where their claims, accuracy levels, or findings actively disagree.
3. Contrast their methodology approaches (e.g. models, optimization targets, scopes).

Return your response in strict JSON format:
{{
  "agreements": ["agreement 1", "agreement 2"],
  "disagreements": ["contradiction 1", "contradiction 2"],
  "methodology_differences": "Summary paragraph describing how their approaches differ."
}}
"""
    from app.config import call_nvidia_nim
    import json
    
    messages = [
        {"role": "system", "content": "You are a scientific verification comparator. Return only strict JSON format."},
        {"role": "user", "content": prompt}
    ]
    
    try:
        response = await call_nvidia_nim(
            model="meta/llama-3.1-70b-instruct",
            messages=messages,
            temperature=0.2
        )
        cleaned = response.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.replace("```json", "").replace("```", "").strip()
        return json.loads(cleaned)
    except Exception as e:
        logger.exception("Error during paper comparison")
        raise HTTPException(status_code=500, detail=f"Comparison failed: {str(e)}")

class ExperimentPlanRequest(BaseModel):
    hypothesis_name: str
    hypothesis_desc: str
    paper_title: str

@app.post("/api/experiment/plan")
async def generate_experiment_plan(payload: ExperimentPlanRequest):
    """
    Generates a step-by-step experimental protocol markdown based on a hypothesis name, description, and paper title.
    """
    prompt = f"""You are a senior scientific experimentalist. Create a detailed, professional, step-by-step experimental protocol to validate the following research hypothesis:

Paper Title context: {payload.paper_title}
Hypothesis Name: {payload.hypothesis_name}
Hypothesis Description: {payload.hypothesis_desc}

Provide a comprehensive, production-grade protocol in markdown format that contains:
1. **Overview & Objective**: A concise explanation of what the experiment achieves and what it tests.
2. **Prerequisites & Libraries**: Required software dependencies (e.g. PyTorch, DGL, networkx) or hardware/lab requirements.
3. **Experimental Variables**: Identify Independent Variables, Dependent Variables, and Control Variables.
4. **Step-by-Step Execution**: Detailed sequential instructions on how to set up the data, initialize the baseline model, run the training/test phase, and measure the results.
5. **Sample Code or Pseudocode**: A clean Python script skeleton demonstrating how to execute the key experimental steps (e.g. data loading, model evaluation).
6. **Success Metrics**: Expected metrics, baseline comparison guidelines, and replication validation targets.

Return the response in raw markdown text directly (do NOT wrap it in a JSON object, just return the text).
"""
    from app.config import call_nvidia_nim
    
    messages = [
        {"role": "system", "content": "You are a professional research scientist. Return the detailed experimental protocol directly in Markdown format."},
        {"role": "user", "content": prompt}
    ]
    
    try:
        response = await call_nvidia_nim(
            model="meta/llama-3.1-70b-instruct",
            messages=messages,
            temperature=0.3
        )
        return {"protocol_markdown": response.strip()}
    except Exception as e:
        logger.exception("Error generating experimental plan")
        raise HTTPException(status_code=500, detail=f"Failed to generate experiment plan: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    logger.info(f"Starting Episteme Backend Server on {HOST}:{PORT}")
    uvicorn.run("main:app", host=HOST, port=PORT, reload=True)
