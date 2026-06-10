# Episteme 🔬 — Universal Research Intelligence & Truth Verification Engine

[![Vercel Deployment](https://img.shields.io/badge/Vercel-episteme--lens.vercel.app-000000?style=flat-square&logo=vercel)](https://episteme-lens.vercel.app)
[![Hugging Face Space](https://img.shields.io/badge/Hugging%20Face-episteme--backend-yellow?style=flat-square)](https://huggingface.co/spaces/nishith374/episteme-backend)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](https://opensource.org/licenses/MIT)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)

An open-source, multi-agent AI verification engine and research intelligence layer. Episteme runs as a browser sidebar extension that automatically parses scientific publications (across arXiv, PubMed, bioRxiv, Nature, Science, IEEE, JSTOR, SSRN) to extract factual claims, cross-examine assertions against a 200M+ paper academic graph, calculate statistical power, run Peer-Review mock drafts, and construct co-author impact networks.

---

## 📖 Table of Contents
1. [Core Features](#-core-features)
2. [Technical Architecture](#-technical-architecture)
3. [Repository Structure](#-repository-structure)
4. [LangGraph Execution Pipeline](#-langgraph-execution-pipeline)
5. [Storage & Caching Architecture](#-storage--caching-architecture)
6. [API Route Specifications](#-api-route-specifications)
7. [Environment Configuration](#-environment-configuration)
8. [Installation & Setup](#-installation--setup)
9. [Troubleshooting & Security Gates](#-troubleshooting--security-gates)
10. [License](#-license)

---

## 🎯 Core Features

* **Claim Verification Engine:** Semantic segmentation extracts text assertions, scoring them as `Verified`, `Unverified`, or `Contradicted` using parallelized vector retrieval.
* **COI Funding Bias Meter:** Visualizes funding sources (corporate vs. public vs. independent) dynamically inside HSL-colored progress meters.
* **Statistical Power Calculator:** Dynamic client-side calculation of statistical power ($1-\beta$) based on sample sizes, effect sizes, and alpha thresholds.
* **Evolution Timeline:** Maps ancestral baselines, current modifications, and successive mutations of research concepts.
* **Author Impact Network:** Interactive panel presenting co-author linkages, institutional affiliations, H-index gauges, and top-cited papers.
* **Obsidian-Ready Notebook:** In-context highlighting, jargon definitions, and Obsidian-compatible `.md` reviews export.

---

## 🏗️ Technical Architecture

The following block maps data flows across runtime components:

```
[Target DOM Page / PDF]
        │
  (Extraction)
        ▼
[Chrome Content Script] ──(postMessage)──> [Extension Service Worker]
                                                   │
                                            (REST POST JSON)
                                                   │
                                                   ▼
                                         [FastAPI Route Handler]
                                                   │
                                            (LangGraph Exec)
                                                   │
    ┌──────────────────────────────────────────────┼──────────────────────────────────────────────┐
    ▼                                              ▼                                              ▼
[Node 1: Claim Extractor]             [Node 3: Trust & Bias Scanner]             [Node 6: Video Parser]
  (spaCy NER + segmentation)            (COI & methodology)                        (YouTube API match)
    │                                              │                                              │
    ▼                                              ▼                                              │
[Node 2: Reference Resolver]          [Node 4: Verifier Node]                               │
  (Semantic Scholar API)                (Qdrant Vector DB)                                  │
    │                                              │                                              │
    └─────────────────────┬────────────────────────┘                                              │
                          ▼                                                                       │
                [Node 5: Synthesizer] <───────────────────────────────────────────────────────────┘
                  (NVIDIA NIM LLaMA-3.1)
                          │
                   (Cache & Store)
                          ▼
             [Supabase / Upstash Redis]
```

---

## 📂 Repository Structure

```
episteme/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI application server entry & CORS definitions
│   │   ├── config.py            # Environment configurations & validation models
│   │   ├── cache.py             # Redis connection manager & get/set caching controls
│   │   ├── vector_store.py      # Qdrant client interfaces & vector storage lookups
│   │   ├── utils/
│   │   │   └── stats.py         # Statistical power calculations & mathematical formulas
│   │   └── pipeline/
│   │       ├── graph.py         # LangGraph state configuration & workflow definitions
│   │       ├── models.py        # Pydantic schemas (Claim, Integrity, AuthorProfile)
│   │       └── nodes.py         # 6 execution nodes mapping to NIM inference APIs
│   ├── Dockerfile               # Production Docker settings for Hugging Face deployment
│   ├── requirements.txt         # Backend packages (FastAPI, langgraph, spacy)
│   └── verify_backend.py        # Automated testing script checking endpoint responses
│
├── extension/
│   ├── public/
│   │   ├── background.js        # Background service worker forwarding requests
│   │   ├── content.js           # Content script extracting target paper DOM strings
│   │   ├── content.css          # In-page overlay widget layouts & highlights styles
│   │   └── manifest.json        # MV3 extension parameters & host permissions
│   ├── src/
│   │   ├── App.tsx              # Main UI component routing verification tabs
│   │   ├── App.css              # Cyberpunk visual styles (variables, animations)
│   │   └── main.tsx             # React mount initialization
│   ├── vite.config.ts           # Compile settings & asset packaging properties
│   └── tsconfig.json            # TypeScript configuration
│
└── website/
    ├── index.html               # Cyberpunk marketing page structure
    ├── styles.css               # Styling definitions (light/dark variables)
    ├── script.js                # Particles manager, theme switcher & typing logs
    └── episteme-extension.zip   # Static compressed zip containing extension build
```

---

## 🔗 LangGraph Execution Pipeline

Episteme coordinates verification pipelines across six parallel execution nodes defined inside `backend/app/pipeline/nodes.py`:

1. **`claim_extractor_node`**
   * **Operation:** Splits inputs into logical assertions.
   * **Model:** NVIDIA NIM `meta/llama-3.1-8b-instruct`.
   * **Format:** Outputs structures containing claim parameters (sentence index, claim category, raw strings).

2. **`reference_resolver_node`**
   * **Operation:** Resolves citation bibliography graphs.
   * **Data Source:** Fetch references dynamically via DOI / CrossRef APIs.

3. **`integrity_scanner_node`**
   * **Operation:** Extracts funding declarations and self-citation counts.
   * **Model:** NVIDIA NIM `mistralai/mixtral-8x7b-instruct`.
   * **Validation:** Computes methodology alerts based on low sample sizes ($N < 30$) or circular reasoning structures.

4. **`claim_verifier_node`**
   * **Operation:** Embeds claim strings using `nvidia/nv-embedqa-e5-v5` and queries Qdrant vector spaces for verifying publications.
   * **Classification:** Scores claims dynamically as `Verified`, `Unverified`, or `Contradicted`.

5. **`intelligence_synthesizer_node`**
   * **Operation:** Generates Peer-Review mock drafts and proposes three subsequent research directions.
   * **Model:** NVIDIA NIM `meta/llama-3.1-70b-instruct`.

6. **`video_parser_node`**
   * **Operation:** Generates reference tags matching educational YouTube video listings for active topics.

---

## 🗄️ Storage & Caching Architecture

To optimize performance and limit billing costs during repeat analyses, Episteme uses a tiered caching layer:

```
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

* **Redis Key Structure:** `episteme:cache:{arxiv_id_or_doi_hash}` (TTL: 7 days).
* **Supabase Datastore Schema:**
  * `paper_cache` table: Stores raw analysis outputs indexed by paper identifier hashes.
  * `personal_highlights` table: Stores user highlighting objects, annotations, and Obsidian notes.

---

## 📡 API Route Specifications

### 1. Analyze Publication
* **Route:** `POST /api/analyze`
* **Request Payload (`Content-Type: application/json`):**
  ```json
  {
    "title": "Attention Is All You Need",
    "abstract": "We propose a new simple network architecture, the Transformer...",
    "full_text": "...",
    "doi": "10.48550/arXiv.1706.03762",
    "arxiv_id": "1706.03762"
  }
  ```
* **Success Response (`200 OK`):**
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

### 2. Jargon Explainer
* **Route:** `POST /api/explain`
* **Request Payload:**
  ```json
  {
    "term": "Self-Attention Mechanism",
    "context": "An attention mechanism relating different positions of a single sequence..."
  }
  ```
* **Success Response (`200 OK`):**
  ```json
  {
    "term": "Self-Attention Mechanism",
    "explanation": "A process where an algorithm weighs the importance of different words in a sentence relative to each other, allowing the model to capture context regardless of position.",
    "prerequisites": ["Attention", "Neural Networks"]
  }
  ```

### 3. Claim Contrastor
* **Route:** `POST /api/compare`
* **Request Payload:**
  ```json
  {
    "paper_a_id": "arxiv_1706.03762",
    "paper_b_id": "arxiv_2010.11929"
  }
  ```

---

## ⚙️ Environment Configuration

Backend options are configured inside `backend/app/config.py` using Pydantic Settings. Create a `.env` file in `/backend` using these parameters:

```env
# Core API Keys (Required)
NVIDIA_API_KEY=nvapi-XXXXXX

# Storage Integrations (Optional, falls back to mock storage if empty)
SUPABASE_URL=https://XXXXXX.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
QDRANT_URL=https://XXXXXX.clouddb.qdrant.io:6333
QDRANT_API_KEY=XXXXXX
UPSTASH_REDIS_REST_URL=https://XXXXXX.upstash.io
UPSTASH_REDIS_REST_TOKEN=XXXXXX
```

---

## ⚡ Installation & Setup

### 1. Set Up and Run the Extension
Compile development components or create the static bundle:
```bash
# Navigate to the extension folder
cd extension

# Install package dependencies
npm install

# Run Vite dev server with hot reload
npm run dev

# Compile files into /dist
npm run build
```
* **Sideloading:** Open `chrome://extensions` in Chrome/Edge, enable **Developer Mode**, click **Load Unpacked**, and select the `/extension/dist` directory.

### 2. Set Up the Local Backend
Initialize your environment, install components, and launch the API server:
```bash
# Navigate to the backend folder
cd backend

# Initialize Python virtual environment
python -m venv .venv

# Activate the virtual environment
# Windows (PowerShell):
.venv\Scripts\Activate.ps1
# macOS/Linux:
source .venv/bin/activate

# Install package requirements
pip install -r requirements.txt

# Download NLP dictionary model
python -m spacy download en_core_web_sm

# Spin up local Uvicorn development server
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
Run `python verify_backend.py` inside the backend directory to check setup compatibility.

### 3. Set Up the Marketing Landing Page
The marketing resources are located in `/website`. Launch a local static server to test changes:
```bash
cd website
npx vercel dev
```

---

## 🛡️ Troubleshooting & Security Gates

* **Cross-Origin Frame Clipboard Blocks:** Browser extensions running inside cross-origin iframes trigger `Permissions policy violation: The Clipboard API has been blocked`. Episteme resolves this by posting a window message (`copy_to_clipboard`) to the host document, executing standard clipboard actions in the content script context.
* **FastAPI CORS Configurations:** If the sidebar throws pre-flight CORS errors during local requests, verify `CORSMiddleware` parameters inside `backend/app/main.py`:
  ```python
  app.add_middleware(
      CORSMiddleware,
      allow_origins=["*"],
      allow_credentials=True,
      allow_methods=["*"],
      allow_headers=["*"],
  )
  ```
* **Vite Compilation Errors:** If building the extension throws syntax errors, check that `tsconfig.app.json` contains appropriate compiler options:
  ```json
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler"
  }
  ```

---

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
