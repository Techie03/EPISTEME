<p align="center">
  <img src="website/icon.png" alt="Episteme Logo" width="120" height="120" />
</p>

<h1 align="center">Episteme 🔬</h1>

<p align="center">
  <strong>The Universal Research Intelligence & Truth Verification Layer.</strong>
</p>

<p align="center">
  <a href="https://episteme-lens.vercel.app">
    <img src="https://img.shields.io/badge/Vercel-Deployed-black?style=for-the-badge&logo=vercel" alt="Vercel Deployment" />
  </a>
  <a href="https://huggingface.co/spaces/nishith374/episteme-backend">
    <img src="https://img.shields.io/badge/%F0%9F%A4%97%20Hugging%20Face-Space-yellow?style=for-the-badge" alt="Hugging Face Space" />
  </a>
  <a href="https://opensource.org/licenses/MIT">
    <img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="License: MIT" />
  </a>
</p>

<p align="center">
  Episteme is a premium developer-grade Chrome/Firefox extension and FastAPI agentic pipeline that overlays scientific publications with claim verification, COI bias scanners, statistical calculators, and semantic lineage graphs.
</p>

---

## 🎯 Key Capabilities

* **Claim Verification Engine:** Extracts fact-based claims and matches them against **200M+ research papers** via Semantic Scholar and OpenAlex.
* **COI Funding Bias Meter:** Visualizes funding sources (corporate vs. public vs. independent) dynamically.
* **Statistical Power Calculator:** Local calculations of statistical power ($1-\beta$) based on sample sizes, effect sizes, and alpha levels.
* **Evolution Timeline:** Shows ancestors, baselines, and successive mutations of research concepts.
* **Author Impact Network:** Interactive network of researcher profiles, H-index meters, co-author relationships, and top cited papers.
* **Obsidian-Ready Notebook:** In-context highlighting, jargon definitions, and Obsidian-compatible `.md` reviews export.

---

## 🏗️ System Flow & Architecture

```
                       ┌────────────────────────────┐
                       │     User Web Browser       │
                       │   (React Chrome Extension) │
                       └─────────────┬──────────────┘
                                     │
                           1. DOM / PDF Content
                                     │
                                     ▼
                       ┌────────────────────────────┐
                       │     Cloudflare Workers     │ (Edge Routing & Cache)
                       └─────────────┬──────────────┘
                                     │
                          2. Serialized Paper Payload
                                     │
                                     ▼
                       ┌────────────────────────────┐
                       │    FastAPI Agent Gateway   │ (LangGraph Orchestrator)
                       └──────┬──────────────┬──────┘
                              │              │
             3a. Factual Context             3b. AI Inference
                              │              │
                              ▼              ▼
               ┌──────────────┐      ┌──────────────┐
               │Semantic Sch. │      │  NVIDIA NIM  │ (LLaMA-3.1 70B/8B,
               │OpenAlex APIs │      │  Mixtral 8B  │  nv-embedqa)
               └──────────────┘      └──────────────┘
```

The pipeline runs as a **6-node parallelized LangGraph Directed Acyclic Graph (DAG)**:
1. **Claim Extractor:** Segmentation and entity parsing using spaCy NER.
2. **Context Resolver:** Fetching citation graphs and abstracts from Semantic Scholar.
3. **Integrity Scanner:** Analyzing funding disclosures and methodology blocks.
4. **Verification Resolver:** Grounding factual statements using vector indices.
5. **Intelligence Synthesizer:** Generating mock drafts and future research directions.
6. **Replication Finder:** Parsing Open-Source Docker/Code hubs for reproducibility checks.

---

## 💻 Technology Stack

| Component | Stack | Role |
| :--- | :--- | :--- |
| **Extension UI** | React 19, TypeScript, HTML5 Canvas, HSL CSS | Sidebar Dashboard UI & Map Canvas |
| **Backend Core** | FastAPI, Python 3.11, Uvicorn, Pydantic v2 | Gateway Router & Pipelines |
| **Agentic Framework** | LangGraph | Multi-Agent Execution State |
| **Model Serving** | NVIDIA NIM API | LLaMA 3.1 70B & 8B, Mixtral 8x7B |
| **Vector Index** | Qdrant Cloud | NV-EmbedQA Document Embeddings |
| **Cache & DB** | Supabase, Upstash Redis | pgvector Storage & Global Cache |
| **Hosting** | Vercel, Hugging Face Spaces | Landing Page & Space API |

---

## ⚡ Quick Start

### 📦 Load the Extension
1. Build the static distribution files:
   ```bash
   cd extension
   npm install
   npm run build
   ```
2. Open `chrome://extensions` in Google Chrome (or `edge://extensions` in Edge).
3. Toggle **Developer Mode** on.
4. Click **Load Unpacked** and select the `/extension/dist` folder.

### 🐍 Run the API Server
1. Setup Python virtual environment and dependencies:
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   python -m spacy download en_core_web_sm
   ```
2. Configure `.env` using [.env.example](file:///c:/Users/nishi/Desktop/Episteme/backend/.env.example):
   ```env
   NVIDIA_API_KEY=your_nvidia_nim_api_key
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_key
   ```
3. Run local server:
   ```bash
   python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
   ```

---

## 🛠️ API Contracts & Data Schemas

<details>
<summary><b>1. POST /api/analyze (Analyze Research Paper)</b></summary>

### Request Body
```json
{
  "title": "Attention Is All You Need",
  "abstract": "We propose a new simple network architecture, the Transformer...",
  "full_text": "...",
  "doi": "10.48550/arXiv.1706.03762",
  "arxiv_id": "1706.03762"
}
```

### Response Body
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
</details>

<details>
<summary><b>2. POST /api/explain (Highlight Jargon Explanation)</b></summary>

### Request Body
```json
{
  "term": "Self-Attention Mechanism",
  "context": "An attention mechanism relating different positions of a single sequence..."
}
```
</details>

---

## 📄 License
This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.
