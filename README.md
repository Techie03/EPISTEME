# Episteme 🔬

> The Universal Research Intelligence & Truth Verification Layer.

Episteme is a premium, developer-grade Chrome Extension & FastAPI backend pipeline designed to overlay research papers with instant claim verification, bias analysis, complexity reports, statistical power checkers, and an interactive knowledge graph. 

Works across all scientific platforms — **arXiv, PubMed, IEEE Xplore, JSTOR, SSRN, bioRxiv, Nature, Science, and any research PDF in your browser**.

---

## 🚀 Key Features

### 🔴 1. Claim Verification Engine
* **Verdict Scoring:** Extracts key research claims and classifies them as `Verified`, `Unverified`, or `Contradicted` using a hybrid model.
* **Contextual RAG Verification:** Cross-checks statements against 200M+ academic papers via Semantic Scholar and OpenAlex APIs.
* **Citation Misuse Flags:** Highlights where referenced articles are cited but do not actually support the authors' claims.

### ⚖️ 2. Trust & Integrity Scanner
* **COI Funding Bias Meter:** Visualizes corporate vs. government vs. independent funding proportions using color-coded indicator gauges.
* **Methodology Red-Flag Scanner:** Analyzes methodology blocks for selection bias, circular reasoning, and small-sample pitfalls.
* **Statistical Power Calculator ($1 - \beta$):** Dynamically calculates mathematical power inside the sidebar based on sample size $N$, significance level $\alpha$, and effect size $d$.

### 🧠 3. Interactive Semantic Maps
* **Concept Knowledge Graph:** Visualizes concepts and methods as force-directed nodes on a canvas space.
* **Evolution Timeline:** Maps chronological ancestors, standard baselines, and subsequent research mutations.
* **Author Impact Network:** Visualizes primary researchers, academic affiliations, co-author connections, H-index gauges, and top-cited publications.

### 📓 4. Research Highlighter & Notebook
* **Floating Jargon Explainer:** Double-click any academic term to fetch a plain-language translation.
* **One-Click Notes:** Save selected quotes, explanations, and thoughts directly to a local, paper-specific notebook.
* **Obsidian Integration:** Export compiled paper reviews, highlights, and insights as a clean Markdown report.

---

## 🛠️ Architecture & Data Flow

```
                     ┌──────────────────────────┐
                     │     User Browser         │
                     │  (Chrome/Edge Extension) │
                     └─────────────┬────────────┘
                                   │
                         1. DOM / PDF Content
                                   │
                                   ▼
                     ┌──────────────────────────┐
                     │    Cloudflare Workers    │  (Edge Router & Cache)
                     └─────────────┬────────────┘
                                   │
                        2. Process Request
                                   │
                                   ▼
                     ┌──────────────────────────┐
                     │   FastAPI Pipeline Host  │  (LangGraph Orchestrator)
                     └──────┬────────────┬──────┘
                            │            │
            3a. Research Data            3b. LLM Inference
                            │            │
                            ▼            ▼
             ┌──────────────┐    ┌──────────────┐
             │Semantic Sch. │    │  NVIDIA NIM  │ (LLaMA-3.1 70B/8B,
             │OpenAlex APIs │    │  Mixtral 8B  │  nv-embedqa)
             └──────────────┘    └──────────────┘
```

1. **Content Ingestion:** The extension scripts read paper structures (DOIs, ArXiv IDs, and textual structures).
2. **Orchestration:** LangGraph directs analysis state across six execution nodes in parallel (Claim Extractor, Verification Resolver, Trust Scanner, Synthesizer, Replication Finder, Video Retriever).
3. **LLM Inference:** Low-latency completions are served via **NVIDIA NIM** instances (utilizing LLaMA 3.1 70B, LLaMA 3.1 8B, and Mixtral 8x7B models).
4. **Caching & DB:** Analysis results are cached inside a pgvector Supabase cluster and Upstash Redis instances for sub-second re-open times.

---

## 💻 Tech Stack

* **Extension UI:** React 19, TypeScript, Vite, HTML5 Canvas, Tailwind-like custom HSL variables.
* **Backend Pipeline:** FastAPI (Python 3.11+), LangGraph, Pydantic, spaCy.
* **Vector Engine & Memory:** Qdrant Cloud Cluster.
* **Database & Cache:** Supabase (PostgreSQL), Upstash Redis.
* **Deployment hosting:** Vercel (Marketing Landing Page), Hugging Face Spaces / Railway (Backend API).

---

## ⚡ Setup & Installation

### 1. Manual Extension Sideload
1. Clone the repository:
   ```bash
   git clone https://github.com/Techie03/episteme.git
   cd episteme
   ```
2. Build the extension:
   ```bash
   cd extension
   npm install
   npm run build
   ```
3. Load in Chrome/Edge:
   * Open `chrome://extensions` or `edge://extensions`.
   * Enable **Developer Mode** (top-right toggle).
   * Click **Load Unpacked** and select the `extension/dist` directory.

### 2. Run Backend Locally
1. Navigate to the backend folder:
   ```bash
   cd backend
   python -m venv .venv
   .venv\Scripts\activate
   pip install -r requirements.txt
   ```
2. Configure environment variables inside `.env`:
   ```env
   NVIDIA_API_KEY=your_nvidia_nim_api_key
   SUPABASE_URL=optional_supabase_url
   SUPABASE_KEY=optional_supabase_key
   QDRANT_URL=optional_qdrant_url
   QDRANT_API_KEY=optional_qdrant_key
   ```
3. Run the FastAPI development server:
   ```bash
   python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
   ```

---

## 📂 Repository Structure

```
episteme/
├── backend/               # FastAPI backend
│   ├── app/
│   │   ├── main.py        # API router
│   │   └── pipeline/      # LangGraph nodes & schemas
│   └── requirements.txt
├── extension/             # React extension sidebar
│   ├── src/               # React components (App.tsx)
│   ├── public/            # Service worker & content scripts
│   └── package.json
└── website/               # Cyberpunk marketing website
    ├── index.html         # HTML layout
    ├── styles.css         # Styling (HSL Variables)
    └── script.js          # Interactive particles/theme toggle
```

---

## 📄 License
This project is licensed under the MIT License.
