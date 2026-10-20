# CBT-Rec Methodology Document

## 1. Problem Formulation

Let $G = (V, E_{\text{follow}}, E_{\text{int}})$ denote the Mastodon social network, where:
- $V$ is the set of observed accounts ($|V| = 270$).
- $E_{\text{follow}}$ is the set of directed follow edges ($|E_{\text{follow}}| = 214$).
- $E_{\text{int}}$ is the set of aggregated interaction edges (replies, mentions, reblogs; $|E_{\text{int}}| = 128$).

For a target user $u \in V$, the objective is to produce a ranked list of $K$ candidate accounts $S_K(u) \subset V \setminus (\{u\} \cup \text{Follows}(u))$ that optimizes both account relevance and trustworthiness, while actively discovering outside communities to avoid echo chambers.

---

## 2. Six-Layer Pipeline Summary

```
                      [ Mastodon Social Network Data ]
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Layer 1: Data Layer                                                   │
│   - SQLite relational storage (users, relationships, statuses, ints)   │
│   - Stub account identification (is_stub = 1)                          │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Layer 2: Social Graph Layer                                           │
│   - Master MultiDiGraph + Follow DiGraph + Interaction DiGraph         │
│   - PageRank, in/out-degree, clustering coeff, Louvain communities     │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Layer 3: Feature & Context Layer                                       │
│   - 6 Criteria: Activity, Popularity, Influence, CommPart, Recip, Rep  │
│   - Min-Max normalization into [0, 1]                                 │
│   - Behaviour Score & Context Profile (Language, Recent Activity)      │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Layer 4: Trust & Safety Layer                                          │
│   - Sun, Li & Deng (2020) Probability Distribution Negation MCDM       │
│   - Euclidean Distance criterion weighting                             │
│   - Simple Additive Weighting (SAW) trustworthiness score T(c)         │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Layer 5: Recommendation Engine                                         │
│   - Stage 1: Candidate Generation (2-hop + community exploration)      │
│   - Stage 2: Multi-Signal Scoring (Rel, Trust, Ctx, Beh)               │
│   - Stage 3: Diversity-Aware MMR Reranking                             │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Layer 6: Explainability Layer                                         │
│   - Evidence-based justification (paths, MCDM signals, diversity)      │
│   - Explicit missing-data disclosure notices                           │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Candidate Generation (Layer 5, Stage 1)

For target user $u$:
1. **Exclusions:**
   $$\text{Excluded}(u) = \{u\} \cup \{ v \in V \mid (u, v) \in E_{\text{follow}} \}$$
2. **Two-Hop Structural Neighbours:**
   $$N_2(u) = \{ c \in V \setminus \text{Excluded}(u) \mid \exists w \in V: (u, w) \in E_{\text{follow}} \land (w, c) \in E_{\text{follow}} \}$$
   Common connectors are tracked: $\text{Connectors}(u, c) = \{ w \mid (u, w) \in E_{\text{follow}} \land (w, c) \in E_{\text{follow}} \}$.
3. **Cross-Community Exploration Candidates:**
   Target account belongs to detected Louvain community $C(u)$. To prevent network insularity, accounts from outside communities $C' \neq C(u)$ are sampled up to proportion $p_{\text{explore}} = 0.30$, prioritizing complete accounts with high structural PageRank.
4. **Cold-Start Safeguard:**
   If $u$ has out-degree 0, candidates are generated from global high-influence community representatives with an explicit cold-start indicator.

---

## 4. Multi-Signal Scoring (Layer 5, Stage 2)

Four normalized signals $S(u, c) \in [0, 1]$ are computed:

### 4.1 Relevance Signal $S_{\text{rel}}(u, c)$
Combines follow-graph proximity and observed hashtag similarity:
- **Graph Proximity:**
  $$S_{\text{graph}}(u, c) = \begin{cases}
  \min\left(1.0, 0.50 + 0.30 \cdot \frac{|\text{Connectors}(u,c)|}{3} + 0.20 \cdot \frac{\text{PR}(c)}{\max(\text{PR})}\right) & \text{if } c \in N_2(u) \\
  0.40 + 0.30 \cdot \frac{\text{PR}(c)}{\max(\text{PR})} & \text{if co-following} \\
  0.20 + 0.40 \cdot \frac{\text{PR}(c)}{\max(\text{PR})} & \text{if exploration}
  \end{cases}$$
- **Content Similarity:**
  If both $u$ and $c$ have non-empty observed top hashtags $H_u, H_c$:
  $$J(H_u, H_c) = \frac{|H_u \cap H_c|}{|H_u \cup H_c|}, \quad S_{\text{rel}} = 0.60 S_{\text{graph}} + 0.40 J(H_u, H_c)$$
  If either hashtag set is empty/unobserved: $S_{\text{rel}} = S_{\text{graph}}$, and flag `hashtags_missing = True`.

### 4.2 Context Signal $S_{\text{ctx}}(u, c)$
$$S_{\text{ctx}}(u, c) = 0.50 \cdot S_{\text{lang}}(u, c) + 0.50 \cdot S_{\text{recent}}(c)$$
- $S_{\text{lang}}(u, c) = 1.0$ if observed languages match; $0.25$ if they differ; $0.50$ (neutral) if unobserved.
- $S_{\text{recent}}(c) = \text{recent\_activity\_score}(c)$ if observed, else $0.20$ neutral fallback.

### 4.3 Behaviour Signal $S_{\text{beh}}(c)$
Reuses `behaviour_score` from Layer 3 (composite of reply ratio, reblog ratio, mention ratio, posting regularity):
- If candidate has collected status behavioural data: $S_{\text{beh}}(c) = \text{behaviour\_score}(c)$.
- If unobserved: $S_{\text{beh}}(c) = 0.012$ (dataset median of complete accounts), flag `behaviour_missing = True`.

### 4.4 Trust Signal $S_{\text{trust}}(c)$
Continuous ranking signal from Layer 4 MCDM Simple Additive Weighting:
$$S_{\text{trust}}(c) = T(c) = \sum_{j=1}^6 w_j X'_{j}(c)$$
- If complete account: $S_{\text{trust}}(c) = T(c)$.
- If stub account ($T(c) = \text{NULL}$): $S_{\text{trust}}(c) = 0.025$ (dataset mean), flag `trust_missing = True`.

### 4.5 Composite Linear Ranking Score
$$\text{Score}(u, c) = w_{\text{rel}} S_{\text{rel}}(u, c) + w_{\text{trust}} S_{\text{trust}}(c) + w_{\text{ctx}} S_{\text{ctx}}(u, c) + w_{\text{beh}} S_{\text{beh}}(c)$$
Default prototype weights: $w_{\text{rel}} = 0.40, w_{\text{trust}} = 0.30, w_{\text{ctx}} = 0.15, w_{\text{beh}} = 0.15$ ($\sum w = 1.0$).

---

## 5. Diversity-Aware MMR Reranking (Layer 5, Stage 3)

To counter echo chambers, candidates are reranked using Maximal Marginal Relevance (MMR) adapted for community modularity:

At step $t \in \{1, \dots, K\}$, given currently selected recommendations $S$:
$$c^* = \arg\max_{c \in \text{Pool} \setminus S} \left[ (1 - \lambda) \cdot \text{Score}(u, c) + \lambda \cdot \text{Novelty}(c, S) \right]$$
where community novelty is defined as:
$$\text{Novelty}(c, S) = \begin{cases}
1.0 & \text{if } C(c) \notin \{ C(s) \mid s \in S \} \\
\frac{1}{1 + \sum_{s \in S} \mathbb{I}[C(s) = C(c)]} & \text{otherwise}
\end{cases} + 0.10 \cdot \mathbb{I}[C(c) \neq C(u)]$$
bounded in $[0, 1]$.

- $\lambda = 0.0$: Pure score ranking.
- $\lambda = 0.30$ (default): Balanced trade-off ensuring diverse viewpoints while keeping high relevance and trust.

---

## 6. Explainability Layer (Layer 6)

For every candidate in $S_K(u)$, a structured explanation record is generated:
1. **Primary Justification:** Human-readable summary (e.g. cross-community exploration or 2-hop structural link).
2. **Evidence Bullets:** Explicit facts derived from the database:
   - Intermediate connecting accounts: $\{w \in \text{Connectors}(u, c)\}$.
   - Observed topic hashtags: $H_u \cap H_c$.
   - MCDM Trust score estimate: $T(c)$ with relative rank categorization.
   - Community ID and diversity role.
3. **Missing Data Disclosure:** Full transparency notice whenever hashtags, language, behaviour, or trust were unobserved.
4. **Scientific Disclaimer:** Reiteration that trust estimates are observational relative scores rather than moral character or safety guarantees.
