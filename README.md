# Episteme 🔬 — Technical Architecture & Developer Guide

Episteme is a production-grade, multi-agent AI research companion and truth verification layer for scientific publications. It utilizes a parallelized LangGraph pipeline, NVIDIA NIM models, vector databases, and Chrome MV3 APIs to overlay scientific articles with real-time factual verification, citation auditing, bias indicators, and statistical replication checklists.

---

## 🏗️ System Architecture

```mermaid
graph TD
    A[Chrome Ext Context Script] -->|PostMessage| B[Service Worker/Background]
    B -->|REST HTTP POST| C[FastAPI Gateway]
    
    subgraph LangGraph Orchestrator (DAG Pipeline)
        C --> D[Node 1: Factual Claim Extractor]
        D --> E[Node 2: Semantic Scholar/OpenAlex Retriever]
        E --> F[Node 3: Integrity & Bias Scanner]
        F --> G[Node 4: RAG Claim Verification Resolver]
        G --> H[Node 5: Intelligence Synthesizer]
        H --> I[Node 6: Open-Source Replication & Video Parser]
    end
    
    subgraph Storage & Cache Layers
        G -->|Cache Check| J[(Upstash Redis Cache)]
        G -->|Embeddings Query| K[(Qdrant Cloud Vector DB)]
        G -->|Document Cache| L[(Supabase PostgreSQL + pgvector)]
    end

    subgraph LLM Inference Engine
        D & G & H -->|NIM Endpoints| M[NVIDIA NIM Server]
        M -->|llama-3.1-70b-instruct| N[High-Fidelity Reasoning]
        M -->|llama-3.1-8b-instruct| O[Low-Latency Filtering]
        M -->|mixtral-8x7b-instruct| P[Structured JSON Extraction]
    end
    
    I -->|Serialized Payload| C
    C -->|Stream/Response| B
    B -->|React State Update| Q[Sidebar Extension App UI]
```

---

## 🛠️ Tech Stack & Dependencies

### Backend Engine
* **Core:** Python 3.11, FastAPI, Uvicorn
* **Agentic Framework:** LangGraph (StateGraph, MemorySaver)
* **Libraries:** spaCy (NER, POS tagging), Pydantic v2 (Data Validation)

### Frontend Layer
* **Core:** React 19, TypeScript, Vite 6
* **Visuals & Canvas:** HTML5 Canvas (force-directed graphs), HSL custom variables (Cyberpunk theme design system)

### Cloud Infrastructure
* **Vector DB:** Qdrant Cloud (1024-dimension NV-EmbedQA embeddings)
* **Datastore:** Supabase PostgreSQL + `pgvector`
* **In-Memory Cache:** Upstash Redis
* **Inference Platform:** NVIDIA NIM API (LLaMA-3.1-70B, LLaMA-3.1-8B, Mixtral-8x7B)

---

## 📡 API Specifications

### 1. Paper Analysis Endpoint
* **Endpoint:** `POST /api/analyze`
* **Request Schema:**
  ```json
  {
    "title": "Attention Is All You Need",
    "abstract": "We propose a new simple network architecture, the Transformer...",
    "full_text": "...",
    "doi": "10.48550/arXiv.1706.03762",
    "arxiv_id": "1706.03762"
  }
  ```
* **Response Excerpt (JSON):**
  ```json
  {
    "status": "success",
    "claims": [
      {
        "id": "claim_0",
        "sentence": "The Transformer achieves 28.4 BLEU on the WMT 2014 English-to-German translation task.",
        "verdict": "Verified",
        "confidence": 0.98,
        "evidence_papers": [
          {
            "title": "BLEU: a Method for Automatic Evaluation of Machine Translation",
            "citation_url": "https://doi.org/10.3115/1073083.1073135"
          }
        ]
      }
    ],
    "integrity": {
      "coi_score": 0.15,
      "reproducibility_factor": 0.85,
      "methodology_flags": [],
      "statistical_power": 0.95
    },
    "author_network": [
      {
        "name": "Ashish Vaswani",
        "affiliation": "Google Brain",
        "h_index": 42,
        "co_authors": ["Noam Shazeer", "Niki Parmar"],
        "top_papers": [
          {
            "title": "Attention Is All You Need",
            "year": 2017,
            "citations": 120000
          }
        ]
      }
    ]
  }
  ```

### 2. Jargon Explainer
* **Endpoint:** `POST /api/explain`
* **Request Schema:**
  ```json
  {
    "term": "Self-Attention Mechanism",
    "context": "An attention mechanism relating different positions of a single sequence..."
  }
  ```

### 3. Claim Contrastor (Side-by-Side Comparison)
* **Endpoint:** `POST /api/compare`
* **Request Schema:**
  ```json
  {
    "paper_a_id": "arxiv_1706.03762",
    "paper_b_id": "arxiv_2010.11929"
  }
  ```

---

## 🧩 Extension State & Storage Layout

The extension sidebar uses `chrome.storage.local` (falling back to standard browser `localStorage` in dev environments) to store paper highlights, custom annotations, and history profiles.

```typescript
interface NoteHighlight {
  id: string;
  paperId: string;
  paperTitle: string;
  text: string;       // The selected highlight
  note: string;       // Custom developer notes/thoughts
  timestamp: string;
}

// Storage Key Schema
// "episteme_highlights_{paperId}" -> Array<NoteHighlight>
// "episteme_history" -> Array<AnalysisHistoryItem>
```

---

## ⚡ Development & Setup Guide

### Backend Service Setup
1. Setup Python virtual environment:
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   python -m spacy download en_core_web_sm
   ```
2. Populate the `.env` configuration file:
   ```env
   NVIDIA_API_KEY=your_nvidia_nim_api_token
   SUPABASE_URL=https://your-supabase-project.supabase.co
   SUPABASE_KEY=your-supabase-service-role-key
   QDRANT_URL=https://your-qdrant-cluster.cloud.qdrant.io
   QDRANT_API_KEY=your-qdrant-api-key
   UPSTASH_REDIS_REST_URL=https://your-redis-instance.upstash.io
   UPSTASH_REDIS_REST_TOKEN=your-redis-auth-token
   ```
3. Run the development server:
   ```bash
   python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```

### Browser Extension Setup
1. Install node dependencies and run the hot-reloading builder:
   ```bash
   cd extension
   npm install
   npm run dev
   ```
2. Build for production compilation:
   ```bash
   npm run build
   ```
3. Open `chrome://extensions`, enable **Developer Mode**, click **Load Unpacked**, and select the `extension/dist` folder.

### Marketing Page Setup
1. The static web resource directory is located at `/website`.
2. Run locally using Vercel Dev or any simple static server:
   ```bash
   cd website
   npx vercel dev
   ```

---

## 🧪 Verification & Build Pipelines

Before shipping or pushing code, ensure validation metrics are cleared:

1. **Verify Backend Models and Schemas:**
   ```bash
   cd backend
   python verify_backend.py
   ```
2. **Compile TypeScript & Check Extension Bundle:**
   ```bash
   cd extension
   npm run build
   ```

---

## 🛡️ CORS & Permissions Policy Security Notes
* **Clipboard API:** Standard MV3 extensions running in cross-origin frames cannot access `navigator.clipboard.writeText` due to security restrictions. Episteme resolves this by passing window messages (`copy_to_clipboard`) to the host DOM running the content script context, executing a safe delegation copy.
* **CORS Policies:** Ensure your Hugging Face Space or backend server has `CORSMiddleware` configured to allow headers from extension frames:
  ```python
  app.add_middleware(
      CORSMiddleware,
      allow_origins=["*"],
      allow_credentials=True,
      allow_methods=["*"],
      allow_headers=["*"],
  )
  ```
