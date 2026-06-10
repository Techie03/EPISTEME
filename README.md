```text
 ███████╗██████╗ ██╗███████╗████████╗███████╗███╗   ███╗███████╗
 ██╔════╝██╔══██╗██║██╔════╝╚══██╔══╝██╔════╝████╗ ████║██╔════╝
 █████╗  ██████╔╝██║███████╗   ██║   █████╗  ██╔████╔██║█████╗  
 ██╔══╝  ██╔═══╝ ██║╚════██║   ██║   ██╔══╝  ██║╚██╔╝██║██╔══╝  
 ███████╗██║     ██║███████║   ██║   ███████╗██║ ╚═╝ ██║███████╗
 ╚══════╝╚═╝     ╚═╝╚══════╝   ╚═╝   ╚══════╝╚═╝     ╚═╝╚══════╝
```

# Episteme: Universal Research Intelligence & Truth Verification Engine

An enterprise-grade multi-agent agentic pipeline for automated citation verification and research integrity analysis

<p align="left">
  <img src="https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/FastAPI-0.111.0-009688?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/LangGraph-Agent-blue?style=flat-square" alt="LangGraph" />
  <img src="https://img.shields.io/badge/NVIDIA--NIM-API-green?style=flat-square" alt="NVIDIA NIM" />
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=flat-square" alt="License" />
</p>

> Developed as a core deliverable for the **Episteme Research Intelligence Layer** project.
> Designed for end-to-end citation verification, author network mapping, and replication checks.
> Release Version: **v1.0.0** · Deployed: **June 2026**

---

## 📌 Overview

In modern academic research, manually checking the validity of every cited statement, uncovering hidden conflicts of interest, and identifying codebase replicability introduces severe operational bottlenecks and researcher fatigue.

**Episteme** eliminates this entirely. It converts raw, unstructured paper text into factual claim matrices, cross-references sentences across a 200M+ document vector index, computes conflict-of-interest markers, and highlights methodology limitations — all inside a responsive, browser-level sidebar.

```text
[Raw PDF / HTML Text] ──> [spaCy NER & Claim Segmentation] ──> [NV-EmbedQA Vectors]
                                                                       │
[Notebook & Reviews] ◄── [Inference Synthesis (NIM)] ◄── [Multi-Agent RAG (Qdrant)]
```

---

## What makes this different

| Problem | Episteme Solution |
| :--- | :--- |
| Factual claims are ungrounded and unchecked | **Agentic RAG pipeline** scores claims as `Verified`, `Unverified`, or `Contradicted` against 200M+ open papers. |
| Obscured corporate funding and bias | **COI Funding Bias Meter** computes corporate vs. public distributions and displays them in HSL-colored indicators. |
| Inability to evaluate replication state | **Replication Finder** queries open repository indices to fetch stars, forks, languages, and Docker build configs. |
| Permissions policy clipboard errors in secure IFrames | **Cross-origin delegation system** routes copy calls to the host frame context to ensure stable quick-copy interactions. |
| Complex math density and difficulty mapping | **Readability Metric & Time Gauge** analyzes paper mathematical text and estimates reading speeds dynamically. |

---

## 💾 Repository Architecture

```text
episteme/
│
├── backend/                  # FastAPI Application Service
│   ├── app/
│   │   ├── main.py           # Core FastAPI app router and CORS rules
│   │   ├── config.py         # Config validation and environment parser
│   │   ├── cache.py          # Redis connection and get/set caching engine
│   │   ├── vector_store.py   # Qdrant client vector similarity operations
│   │   ├── utils/
│   │   │   └── stats.py      # Statistical power calculation functions
│   │   └── pipeline/
│   │       ├── graph.py      # LangGraph state configuration and nodes DAG
│   │       ├── models.py     # Pydantic schema validation objects
│   │       └── nodes.py      # NIM inference execution tasks
│   ├── Dockerfile            # Hugging Face Spaces deployment container settings
│   ├── requirements.txt      # Python package declarations
│   └── verify_backend.py     # E2E pipeline regression tests
│
├── extension/                # Chrome MV3 Sidebar Extension
│   ├── public/
│   │   ├── background.js     # Service worker routing analytics API requests
│   │   ├── content.js        # Script extracting text and delegating copies
│   │   ├── content.css       # Native UI styles inside target tabs
│   │   └── manifest.json     # Manifest properties and host capabilities
│   ├── src/
│   │   ├── App.tsx           # React UI routing panel tabs
│   │   ├── App.css           # Styling rules (variables, glow layouts)
│   │   └── main.tsx          # React render mount
│   ├── vite.config.ts        # Vite packager configurations
│   └── tsconfig.json         # TypeScript compiler configurations
│
└── website/                  # Vercel Landing Page
    ├── index.html            # Landing page frame layout
    ├── styles.css            # Stylesheets (Light/Dark variables)
    ├── script.js             # Active particle engine and typing simulator
    └── episteme-extension.zip# Downloadable build distribution
```

---

## 🛠️ Algorithmic Pipeline & Execution Deep Dive

### Node-by-Node Graph Execution Overview
The backend pipeline operates as a **6-node parallelized LangGraph Directed Acyclic Graph (DAG)**:

* **Node 1: Claim Extractor (`claim_extractor_node`)**
  Segments target text blocks using spaCy NER. Identifies primary mathematical assertions, benchmarks, and claims.
  * *Inference Model:* NVIDIA NIM `meta/llama-3.1-8b-instruct`.
* **Node 2: Reference Resolver (`reference_resolver_node`)**
  Queries CrossRef and OpenAlex registries to resolve DOIs and crawl citation maps of cited bibliography entries.
* **Node 3: Integrity & Bias Scanner (`integrity_scanner_node`)**
  Scans disclosures to detect corporate funding bias. Analyzes self-citation rates and checks methodologies for circular reasoning.
  * *Inference Model:* NVIDIA NIM `mistralai/mixtral-8x7b-instruct`.
* **Node 4: Claim Verifier (`claim_verifier_node`)**
  Embeds extracted assertions using `nvidia/nv-embedqa-e5-v5` and searches Qdrant vector databases to classify claims as `Verified`, `Unverified`, or `Contradicted`.
* **Node 5: Intelligence Synthesizer (`intelligence_synthesizer_node`)**
  Assembles reviews, calculates mathematical readability scores, and synthesizes 3 future research directions.
  * *Inference Model:* NVIDIA NIM `meta/llama-3.1-70b-instruct`.
* **Node 6: Replication & Video Parser (`video_parser_node`)**
  Locates open-source codebases, Docker files, and matches active topics against conceptual YouTube video lists.

### Stage 3: Statistical Power Calculations ($1 - \beta$)
Statistical validity is evaluated locally inside the sidebar. Given effect size ($d$), sample size ($N$), and significance level ($\alpha$), Episteme computes statistical power using a normal cumulative distribution approximation:

$$Z_{1-\beta} = \sqrt{\frac{N \cdot d^2}{2}} - Z_{1-\alpha/2}$$

$$Power = \Phi(Z_{1-\beta})$$

---

## 🗄️ Caching & Caching Architecture
To optimize latency and control token costs, Episteme routes data requests through a multi-tiered caching structure:

```text
                  [POST /api/analyze]
                           │
                 (Lookup Cache Key)
                           ▼
                 [Upstash Redis Cache] ──(Hit)──> [Return Cached JSON]
                           │
                        (Miss)
                           ▼
           [Supabase DB / pgvector Check] ──(Hit)──> [Save to Redis & Return]
                           │
                        (Miss)
                           ▼
             [Run LangGraph Agent Pipeline]
                           │
                 (Write to DB & Redis)
                           ▼
                    [Return Output]
```

---

## 📡 API Interface Specifications

<details>
<summary><b>1. POST /api/analyze (Analyze Research Paper)</b></summary>

### Request Payload (`Content-Type: application/json`)
```json
{
  "title": "Attention Is All You Need",
  "abstract": "We propose a new simple network architecture, the Transformer...",
  "full_text": "...",
  "doi": "10.48550/arXiv.1706.03762",
  "arxiv_id": "1706.03762"
}
```

### Success Response (`200 OK`)
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
    "statistical_power": 0.95,
    "methodology_flags": []
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
</details>

<details>
<summary><b>2. POST /api/explain (Highlight Jargon Explanation)</b></summary>

### Request Payload
```json
{
  "term": "Self-Attention Mechanism",
  "context": "An attention mechanism relating different positions of a single sequence..."
}
```

### Success Response (`200 OK`)
```json
{
  "term": "Self-Attention Mechanism",
  "explanation": "A process where an algorithm weighs the importance of different words in a sentence relative to each other, allowing the model to capture context regardless of position.",
  "prerequisites": ["Attention", "Neural Networks"]
}
```
</details>

---

## 🛡️ Security, CORS & IFrame Clipboard Delegation

* **Clipboard Access in Cross-Origin IFrames:** 
  Standard Chrome MV3 extensions running inside cross-origin iframes (like PDF readers) throw a `Permissions policy violation: The Clipboard API has been blocked` error during `navigator.clipboard.writeText` calls. 
  
  Episteme bypasses this restriction by delegating clipboard writing:
  1. The extension UI posts a message containing text payload: `window.parent.postMessage({ type: 'copy_to_clipboard', text }, "*")`.
  2. The Content Script (running in the main host window context) receives the event.
  3. The Content Script writes the text directly to the clipboard using unrestricted host-level APIs.
* **CORS Settings:**
  To support cross-origin API calls from arbitrary extension host contexts, `backend/app/main.py` enforces wildcard allowances:
  ```python
  app.add_middleware(
      CORSMiddleware,
      allow_origins=["*"],
      allow_credentials=True,
      allow_methods=["*"],
      allow_headers=["*"],
  )
  ```

---

## 🚀 Installation & Running

### Build Browser Extension
```bash
cd extension
npm install
npm run build
```
Load the unpacked `extension/dist` folder into `chrome://extensions`.

### Spin Up Local API Server
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

---

## 🔒 Privacy & Memory

The Memory and History features are personal to your extension instance and are not intended to be shared publicly.

If you are using the default pre-configured backend, your saved papers, notes, and memory items should be treated as your own workspace. Other users should not rely on the History tab as a public repository or expect to see everyone else's activity.

For complete privacy and control, users are encouraged to deploy their own backend and configure their own API credentials. However, for convenience, a pre-configured backend is provided for users who do not wish to perform any setup.

Please do not store sensitive, confidential, or personally identifiable information unless you are using a backend that you control and trust.

---

## 📄 License
MIT License.
