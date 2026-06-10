# Episteme

[![Vercel Deployment](https://img.shields.io/badge/Vercel-episteme--lens.vercel.app-000000?style=flat-square&logo=vercel)](https://episteme-lens.vercel.app)
[![Hugging Face Space](https://img.shields.io/badge/Hugging%20Face-episteme--backend-yellow?style=flat-square)](https://huggingface.co/spaces/nishith374/episteme-backend)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](https://opensource.org/licenses/MIT)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)

An open-source, multi-agent AI verification engine and research intelligence layer. Episteme runs as a browser extension that hooks into scientific platforms (arXiv, PubMed, bioRxiv, Nature, JSTOR) to extract factual claims, verify citations via external indices, perform conflict-of-interest analysis, calculate statistical power, and map co-author networks.

---

## 🏗️ Architecture

The backend operates as a parallelized Directed Acyclic Graph (DAG) orchestrated by **LangGraph**. When a paper payload is sent from the browser extension, it passes through the following state pipeline:

```
[Browser Content Script] ──(Payload)──> [FastAPI Gateway]
                                                │
    ┌───────────────────────────────────────────┴───────────────────────────────────────────┐
    ▼                                           ▼                                           ▼
[Node 1: Claim Extractor]             [Node 3: Bias Scanner]                     [Node 6: Video Parser]
  (spaCy NER + segmentation)            (COI & methodology)                        (YouTube API match)
    │                                           │                                           │
    ▼                                           ▼                                           │
[Node 2: Reference Resolver]          [Node 4: Verifier Node]                               │
  (Semantic Scholar API)                (Qdrant Vector DB)                                  │
    │                                           │                                           │
    └───────────────────┬───────────────────────┘                                           │
                        ▼                                                                   │
              [Node 5: Synthesizer] <───────────────────────────────────────────────────────┘
                (NVIDIA NIM LLaMA-3.1)
```

1. **Extraction (Node 1):** Splits paper text into sentence structures and extracts entity assertions.
2. **Resolution (Node 2):** Queries Semantic Scholar and OpenAlex to fetch metadata for all cited references.
3. **Audit (Node 3):** Scans the paper methodology for small-sample sizes, p-value discrepancies, and self-citations.
4. **Verification (Node 4):** Embeds extracted assertions (using NV-EmbedQA) and retrieves matching records from a Qdrant vector database.
5. **Synthesis (Node 5):** Combines verification states, generates future hypotheses, and exports an Obsidian-compatible Markdown dossier.

---

## 💻 Tech Stack

* **Frontend:** React 19, TypeScript, Vite, HTML5 Canvas.
* **Backend:** FastAPI, LangGraph, spaCy, Pydantic v2.
* **Storage/Cache:** Qdrant Cloud (Vector DB), Supabase (PostgreSQL), Upstash Redis (Caching layer).
* **Models:** NVIDIA NIM API (LLaMA-3.1-70B, LLaMA-3.1-8B, Mixtral-8x7B).

---

## ⚡ Quick Start

### 1. Build and Load Browser Extension
1. Build static assets:
   ```bash
   cd extension
   npm install
   npm run build
   ```
2. Open `chrome://extensions` in Chrome (or equivalent developer tab in Edge/Firefox).
3. Enable **Developer Mode**.
4. Click **Load Unpacked** and select the `/extension/dist` directory.

### 2. Spin Up Local Backend
1. Initialize virtual environment and install packages:
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   python -m spacy download en_core_web_sm
   ```
2. Configure environmental variables:
   ```bash
   cp .env.example .env
   # Edit .env with your credentials (NVIDIA_API_KEY, SUPABASE_URL, etc.)
   ```
3. Boot the API server:
   ```bash
   python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
   ```

---

## 📡 API Reference

### Analyze Paper
* **Route:** `POST /api/analyze`
* **Request:**
  ```json
  {
    "title": "Attention Is All You Need",
    "abstract": "We propose a new simple network architecture, the Transformer...",
    "full_text": "...",
    "doi": "10.48550/arXiv.1706.03762",
    "arxiv_id": "1706.03762"
  }
  ```
* **Response:**
  ```json
  {
    "status": "success",
    "claims": [
      {
        "id": "claim_0",
        "sentence": "The Transformer achieves 28.4 BLEU on the WMT 2014 English-to-German task.",
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
      "statistical_power": 0.95
    }
  }
  ```

### Jargon Explanation
* **Route:** `POST /api/explain`
* **Request:**
  ```json
  {
    "term": "Self-Attention Mechanism",
    "context": "An attention mechanism relating different positions of a single sequence..."
  }
  ```

---

## 📄 License
MIT License. See [LICENSE](LICENSE) for details.
