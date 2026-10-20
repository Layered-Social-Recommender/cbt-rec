# CBT-Rec: Layered Social Recommendation Systems for Online Social Networks

CBT-Rec is a six-layer research framework for trustworthy, explainable, and diversity-aware account recommendation in online social networks (OSNs), implemented and validated on bounded real-world Mastodon network data.

---

## 1. Project Overview & Architecture

The central research question addressed by CBT-Rec is:

> *"Which new user accounts are relevant and trustworthy enough for a target user to consider connecting with, while preserving opportunities to discover other communities and viewpoints?"*

### Six-Layer OSI-Inspired Architecture

| Layer | Module | Responsibility | Implementation Status |
|---|---|---|---|
| **Layer 1** | **Data Layer** | Mastodon REST API collection, JSON preservation, SQLite relational processing, stub-account management, and referential integrity. | **Complete & Validated** |
| **Layer 2** | **Social Graph Layer** | Master MultiDiGraph, Follow DiGraph, Interaction DiGraph, PageRank, clustering coefficients, and Louvain community detection. | **Complete & Validated** |
| **Layer 3** | **Feature & Context Layer** | 6 normalized MCDM criteria (Activity, Popularity, Influence, Community Participation, Reciprocity, Reputation), Behaviour Score, and Context signals. | **Complete & Validated** |
| **Layer 4** | **Trust & Safety Layer** | Probability Distribution Negation & Euclidean Distance MCDM weighting (Sun, Li & Deng, 2020), Simple Additive Weighting (SAW) trustworthiness scoring. | **Complete & Validated** |
| **Layer 5** | **Recommendation Engine** | 2-hop candidate generation + cross-community discovery, 4-signal hybrid scoring (Relevance, Trust, Context, Behaviour), and MMR diversity reranking. | **Complete & Validated** |
| **Layer 6** | **Explainability Layer** | Truthful evidence-based explanation generation linking graph paths, MCDM trust contributions, community viewpoints, and missing-data disclosures. | **Complete & Validated** |

---

## 2. Dataset Snapshot & Provenance

The system operates against a validated snapshot collected from `mastodon.social` stored in SQLite at `data/processed/mastodon/cbt_rec_dataset.db`:

- **Total Observed Accounts:** 270
  - **Complete Accounts:** 205 (active profile attributes collected)
  - **Stub Accounts:** 65 (graph reference preserved; features/trust set to `NULL` to prevent fabrication)
  - **Bots:** 1
- **Follow Relationships:** 214 directed edges
- **Statuses Collected:** 120 status records
- **Interactions Collected:** 128 interaction records (82 reblogs, 33 mentions, 13 replies)
- **Detected Communities:** 68 Louvain modularity clusters (3 primary dense components + peripheral nodes)

> **Important Data Rule:** Missing status or interaction data is treated as unobserved (`NULL`/missing flags), never falsely converted to zero or interpreted as bad character.

---

## 3. Quick Start & Prerequisites

### Prerequisites
- Python 3.10+ (tested with Python 3.13)
- Node.js 18+ and npm

### Installation
1. Activate virtual environment and install Python dependencies:
   ```bash
   .\venv\Scripts\activate
   pip install -r requirements.txt
   ```
2. Install UI dependencies:
   ```bash
   cd ui/backend && npm install
   cd ../frontend && npm install
   ```

---

## 4. Running the System

### A. Run Full Test Suite
Run the 21 comprehensive regression, unit, and integration tests:
```bash
.\venv\Scripts\python.exe -m unittest discover tests
```

### B. Run Recommendation Engine via CLI
Generate top-10 account recommendations with explanations for a target user:
```bash
# Default weights and diversity
.\venv\Scripts\python.exe -m src.recommendation_layer.engine --target "Mastodon@mastodon.social" --top_k 10

# Output as JSON
.\venv\Scripts\python.exe -m src.recommendation_layer.engine --target "Mastodon@mastodon.social" --json

# Precompute recommendations for all complete users into SQLite
.\venv\Scripts\python.exe -m src.recommendation_layer.engine --precompute
```

### C. Run Preliminary Systematic Evaluation
Executes the trust-diversity trade-off experiment comparing 5 configurations across all connected target users:
```bash
.\venv\Scripts\python.exe tests/evaluate_recommendations.py
```

### D. Launch the Research Dashboard
1. **Start Backend API (port 3001):**
   ```bash
   cd ui/backend
   node server.js
   ```
2. **Start Frontend Dev Server (port 5173):**
   ```bash
   cd ui/frontend
   npm run dev
   ```
3. Open `http://localhost:5173/` in your browser. Navigate to `/recommendations` to use the interactive Recommendation Engine.

---

## 5. API Endpoints

The Node/Express backend exposes the following endpoints on port 3001:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/summary` | Global pipeline entity and edge counts |
| `GET` | `/api/users` | List of accounts with complete/stub indicators |
| `GET` | `/api/relationships` | Declarative follow graph edges |
| `GET` | `/api/interactions` | Behavioural interaction records |
| `GET` | `/api/graph/metrics` | Graph-level modularity and community counts |
| `GET` | `/api/graph/nodes` | Node-level metrics (PageRank, degrees, communities) |
| `GET` | `/api/features` | Extracted user feature vectors (Layer 3) |
| `GET` | `/api/trust/weights` | Derived MCDM criterion weights (Layer 4) |
| `GET` | `/api/trust/scores` | Per-user trustworthiness estimates (Layer 4) |
| `GET` | `/api/recommendations/targets` | List of candidate target accounts |
| `GET` | `/api/recommendations/:id` | Recommendations & explanations for target `:id` |
| `POST` | `/api/recommendations/custom` | Dynamic reranking with custom weights and diversity $\lambda$ |

---

## 6. Key Preliminary Evaluation Findings

Evaluating the trust-diversity trade-off across all 120 connected target accounts produced the following empirical findings:

| Configuration | Mean Trust | Mean Relevance | Communities in Top-10 | Cross-Community Discovery % | Shannon Entropy |
|---|---|---|---|---|---|
| **Relevance-Only Baseline** | 0.1637 | 0.6375 | 2.63 | 28.8% | 0.905 |
| **Relevance + Trust** | 0.1882 | 0.6365 | 2.67 | 28.9% | 0.921 |
| **Hybrid CBT-Rec (No Diversity)** | 0.1882 | 0.6365 | 2.67 | 28.9% | 0.921 |
| **Full CBT-Rec (Default $\lambda=0.30$)** | **0.1759** | 0.4626 | **7.01** | **65.1%** | **2.322** |
| **CBT-Rec High Diversity ($\lambda=0.60$)** | 0.1696 | 0.4486 | **7.35** | **65.1%** | **2.390** |

**Empirical Takeaway:**
Adding trust without diversity increases recommended trustworthiness (+15.0%) but traps users in only 2.67 local communities. CBT-Rec's diversity-aware reranking ($\lambda=0.30$) expands community reach by **2.66x** (to 7.01 communities) and more than doubles cross-community discovery (28.9% $\to$ 65.1%), effectively preventing algorithmic echo chambers while keeping average trustworthiness higher than the relevance baseline.

---

## 7. Research Disclaimers & Ethics

1. **Relative Estimates:** Trust scores are relative observational estimates calculated via MCDM over network reciprocity, activity, influence, and community participation. They do not constitute ground-truth moral character, objective truth, or safety guarantees.
2. **Continuous Ranking Signal:** Trust is applied as a continuous ranking factor rather than a hard candidate cutoff filter, ensuring accounts with low or unmeasured trust are not unilaterally silenced or excluded from exploration.
3. **Data Protection:** Data collection follows Mastodon API rate limits and collects only public profile and interaction metadata without personal scraping.
