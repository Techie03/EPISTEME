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

## 🛠️ Algorithmic Pipeline — Deep Dive

### Stage 1: Technical Nomenclature & Claim Extraction
Before verification, spaCy segments sentences and a lightweight LLM (`meta/llama-3.1-8b-instruct`) extracts factual claims, isolating numerical benchmarks, comparative results, and core hypotheses.

### Stage 2: Parallelized Multi-Agent Graph Orchestration
LangGraph schedules parallel execution threads to optimize payload retrieval speeds:
* **Extractor & Reference Nodes:** Execute context crawls on author history and DOI bibliographies.
* **Integrity Scanner:** Analyzes the paper's methodology section to detect low sample sizes ($N < 30$) or self-citations.
* **RAG Verifier:** Searches Qdrant vector spaces using `nv-embedqa-e5-v5` embeddings to find confirming or refuting publications.

### Stage 3: Statistical Power Calculations ($1 - \beta$)
Statistical validity is evaluated locally inside the sidebar. Given effect size ($d$), sample size ($N$), and significance level ($\alpha$), Episteme computes statistical power using a normal cumulative distribution approximation:

$$Z_{1-\beta} = \sqrt{\frac{N \cdot d^2}{2}} - Z_{1-\alpha/2}$$

$$Power = \Phi(Z_{1-\beta})$$

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

## 📄 License
MIT License.
