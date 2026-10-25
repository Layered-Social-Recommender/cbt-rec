/**
 * Centralized, verified project data for CBT-Rec Documentation Portal.
 * All metrics, numbers, and algorithm details are verified against the CBT-Rec repository:
 * - README.md
 * - docs/METHODOLOGY.md
 * - data/processed/mastodon/cbt_rec_dataset.db
 * - data/processed/mastodon/ml_baseline_experiments.json
 * - data/processed/mastodon/stage3_hybrid_experiments.json
 * - data/processed/mastodon/recommendation_experiments.json
 */

export const PROJECT_METADATA = {
  title: "CBT-Rec: Layered Social Recommendation Systems for Online Social Networks",
  shortTitle: "CBT-Rec",
  tagline: "A Six-Layer Framework for Trustworthy, Diversity-Aware, and Explainable Social Recommendations in Decentralized Networks",
  program: "Final Year B.Tech CSE · 23CSE498",
  course: "23CSE498 – Project Phase 2 (Panel Review 1)",
  teamNumber: "30",
  projectType: "Type 1: Research Project",
  university: "Amrita Vishwa Vidyapeetham",
  department: "Department of Computer Science and Engineering",
  academicYear: "2026 - 2027",
  githubUrl: "https://github.com/Layered-Social-Recommender/cbt-rec",
  liveAppUrl: "https://cbt-rec.vercel.app",
  backendUrl: "https://cbt-rec.onrender.com",
  status: "Stage 3 Complete · Live Cloud Prototype Deployed",
  repositoryVisibility: "Public",
  license: "MIT Open Source Academic License"
};

export const CORE_METRICS = [
  { label: "Observed Accounts", value: "270", detail: "205 Complete · 65 Stubs · 1 Bot" },
  { label: "Follow Graph Edges", value: "214", detail: "Directed network relations" },
  { label: "Detected Communities", value: "68", detail: "Louvain modularity clusters" },
  { label: "Community Expansion", value: "2.66x", detail: "7.01 communities in Top-10 (λ=0.30)" },
  { label: "Cross-Community Discovery", value: "+125%", detail: "28.9% → 65.1% outside reach" },
  { label: "Regression Test Suite", value: "60 / 60", detail: "100% passing unit & integration tests" }
];

export const PROBLEM_LIMITATIONS = [
  {
    id: "lim-1",
    title: "Popularity Bias & Monopolization",
    problem: "Traditional collaborative filtering and graph random walks overwhelmingly promote a tiny fraction of hyper-connected accounts, starving relevant niche creators.",
    cbtRecSolution: "Combines 2-hop structural candidates with PageRank-normalized cross-community discovery, guaranteeing candidate diversity before scoring."
  },
  {
    id: "lim-2",
    title: "Neglect of Behavioral Trust & Safety",
    problem: "Most link prediction algorithms equate connection frequency with reliability, frequently recommending spam bots, bad actors, or volatile accounts.",
    cbtRecSolution: "Layer 4 implements Sun, Li & Deng (2020) Probability Distribution Negation MCDM across 6 behavioral criteria to compute an evidence-grounded trust signal."
  },
  {
    id: "lim-3",
    title: "Algorithmic Echo Chambers & Filter Bubbles",
    problem: "Homophilic recommendation algorithms trap users inside tight ideological and topic clusters, isolating them from outside perspectives.",
    cbtRecSolution: "Layer 5 applies community-aware Maximal Marginal Relevance (MMR) with a tunable diversity parameter (λ=0.30), expanding community representation from 2.67 to 7.01."
  },
  {
    id: "lim-4",
    title: "Black-Box Opacity & Hallucinated Justifications",
    problem: "Deep neural recommenders offer zero interpretable justification for why an account was suggested, eroding user agency and trust.",
    cbtRecSolution: "Layer 6 generates deterministic, factual explanations linking intermediate graph paths, mutual hashtags, and explicit missing-data disclosures."
  },
  {
    id: "lim-5",
    title: "Cold-Start Account Fragility",
    problem: "New accounts with few or no follow edges are either omitted entirely or assigned artificial zero scores.",
    cbtRecSolution: "Strict stub-account protocol treats missing values as unobserved (NULL) rather than penalizing accounts, utilizing global prior fallbacks with clear disclosures."
  }
];

export const PROJECT_OBJECTIVES = [
  {
    id: "obj-1",
    title: "Layered Modular Architecture",
    description: "Design and implement a clean six-layer OSI-inspired pipeline (Data, Graph, Features, Trust, Recommendation, Explainability) with strict encapsulation.",
    status: "Completed",
    evidence: "src/ directory structure with 6 independent modules and 60 passing tests."
  },
  {
    id: "obj-2",
    title: "Real-World OSN Data Collection & Schema",
    description: "Collect real decentralized social network data from Mastodon REST API without fabricating profiles, maintaining relational integrity and stub account tracking.",
    status: "Completed",
    evidence: "data/processed/mastodon/cbt_rec_dataset.db containing 270 users, 214 relationships, 128 interactions."
  },
  {
    id: "obj-3",
    title: "Multi-Criteria Trust Estimation (MCDM)",
    description: "Implement the Sun, Li & Deng (2020) Probability Distribution Negation and Euclidean Distance MCDM weighting to objectively derive trustworthiness scores.",
    status: "Completed",
    evidence: "src/trust_layer/mcdm.py calculating weights across 6 criteria with Simple Additive Weighting."
  },
  {
    id: "obj-4",
    title: "Directed Graph Representation & Baseline Benchmark",
    description: "Implement Directed LightGCN with dual source/target personas alongside classic graph heuristics (Common Neighbours, Adamic-Adar, Jaccard, BPR-MF) on stratified holdout splits.",
    status: "Completed",
    evidence: "src/recommendation_layer/ml/ with verified offline evaluation in ml_baseline_experiments.json."
  },
  {
    id: "obj-5",
    title: "Diversity-Preserving Reranking & Explainability",
    description: "Adapt Maximal Marginal Relevance (MMR) for network modularity to break echo chambers, and generate transparent evidence-backed justifications.",
    status: "Completed",
    evidence: "src/recommendation_layer/reranker.py and src/explainability_layer/explainer.py."
  },
  {
    id: "obj-6",
    title: "Cross-Domain Benchmark on Multi-Source Datasets",
    description: "Extend experimental evaluation to benchmark datasets such as FilmTrust, Epinions, Ciao, and LastFM to test cross-domain generalization.",
    status: "Planned",
    evidence: "Dataset specifications documented; multi-dataset loading planned for Phase 4."
  },
  {
    id: "obj-7",
    title: "Deep Semantic NLP Integration",
    description: "Incorporate fine-tuned BERT/RoBERTa embeddings for status content to complement lexical hashtag Jaccard similarity.",
    status: "Planned",
    evidence: "Feature layer interface designed to accept 768-dim dense embedding vectors in future release."
  }
];

export const LAYERS_DETAIL = [
  {
    number: 1,
    name: "Data Layer",
    tech: "SQLite, Python REST Client, JSON Schema",
    summary: "Bounded Mastodon API collection, relational preservation, stub account isolation, and referential integrity.",
    inputs: "Mastodon REST API endpoints (/api/v1/accounts, /followers, /following, /statuses)",
    outputs: "Relational SQLite tables (users, relationships, statuses, interactions)",
    keyMechanisms: [
      "Rate-limited recursive crawler with exponential backoff",
      "Stub-account preservation: accounts referenced in edges without full profiles are flagged with is_stub=1",
      "No data fabrication: unobserved signals stored as NULL rather than artificial zeroes"
    ],
    status: "Implemented & Validated"
  },
  {
    number: 2,
    name: "Social Graph Layer",
    tech: "NetworkX, Louvain Modularity, Scipy Sparse",
    summary: "MultiDiGraph modeling, directed follow subgraphs, PageRank centrality, and community structure detection.",
    inputs: "Relational follow edges and interaction records from Layer 1",
    outputs: "MultiDiGraph (cbt_rec_graph.graphml), node PageRank, Louvain community partitions (68 clusters)",
    keyMechanisms: [
      "Directed edge separation: differentiates incoming followers from outgoing following",
      "Louvain Modularity optimization for unsupervised community cluster identification",
      "Structural metrics: in-degree, out-degree, reciprocal edges, local clustering coefficients"
    ],
    status: "Implemented & Validated"
  },
  {
    number: 3,
    name: "Feature & Context Layer",
    tech: "NumPy, Pandas, Min-Max Scalers",
    summary: "Feature engineering across 6 normalized MCDM criteria, composite behavioral scoring, and context profiles.",
    inputs: "Graph metrics (Layer 2) and user activity records (Layer 1)",
    outputs: "6-dim normalized criterion matrix X' in [0, 1], Behaviour Score, Language & Recency Context Profiles",
    keyMechanisms: [
      "6 Criteria: Activity, Popularity, Influence, Community Participation, Reciprocity, Reputation",
      "Behaviour Score: composite of reply ratio, reblog ratio, mention ratio, posting regularity",
      "Context Profile: ISO language match indicator and exponential recency decay score"
    ],
    status: "Implemented & Validated"
  },
  {
    number: 4,
    name: "Trust & Safety Layer",
    tech: "Sun, Li & Deng (2020) Probability Distribution Negation MCDM",
    summary: "Objective Multi-Criteria Decision Making weighting and Simple Additive Weighting (SAW) trustworthiness scoring.",
    inputs: "Normalized feature criteria matrix X' from Layer 3",
    outputs: "MCDM criterion weight vector W, continuous trust score T(c) in [0, 1] per account",
    keyMechanisms: [
      "Probability distribution conversion of criterion values",
      "Negation distribution calculation via Deng entropy principles",
      "Euclidean distance measurement between original and negated distributions to objectively weight criteria",
      "Simple Additive Weighting (SAW) aggregation: T(c) = sum(w_j * x'_jc)"
    ],
    status: "Implemented & Validated"
  },
  {
    number: 5,
    name: "Recommendation Engine",
    tech: "Directed LightGCN, Multi-Signal Scorer, MMR Reranker",
    summary: "2-hop candidate generation + cross-community exploration, 4-signal hybrid scoring, and diversity-aware MMR reranking.",
    inputs: "Target account ID, candidate pool, Layer 3 & 4 scores, tunable weights (w_rel, w_trust, w_ctx, w_beh), diversity λ",
    outputs: "Ranked Top-K recommended accounts with component scores and exploration tags",
    keyMechanisms: [
      "Stage 1: 2-hop structural candidates + 30% exploration candidates sampled from outside communities",
      "Stage 2: Linear combination Score(u, c) = w_rel*S_rel + w_trust*S_trust + w_ctx*S_ctx + w_beh*S_beh",
      "Stage 3: Maximal Marginal Relevance (MMR) balancing composite score against community novelty (λ=0.30)",
      "Directed LightGCN: dual-persona node embeddings with directed message passing"
    ],
    status: "Implemented & Validated"
  },
  {
    number: 6,
    name: "Explainability Layer",
    tech: "Graph Traversal, Dynamic Template Synthesis, Auditing",
    summary: "Truthful, evidence-based justification generation linking graph paths, MCDM trust contributions, and disclosures.",
    inputs: "Selected Top-K recommendations, connector node sets, common hashtags, missing flags",
    outputs: "Structured JSON explanation record with primary justification, evidence bullets, and data disclosures",
    keyMechanisms: [
      "Graph path extraction: identifies intermediate accounts w connecting target u to candidate c",
      "Lexical evidence: highlights shared topic hashtags",
      "Full transparency disclosure: explicitly flags when language, hashtags, behaviour, or trust were unobserved",
      "Scientific disclaimer: reiterates that trust is a relative observational metric, not moral judgment"
    ],
    status: "Implemented & Validated"
  }
];

export const ALGORITHM_STATUS_MATRIX = [
  {
    category: "Recommendation & Link Prediction",
    name: "Directed LightGCN",
    role: "Core Hybrid Model",
    status: "Implemented & Validated",
    details: "Custom dual-persona (source/target) directed graph convolution with BPR pairwise loss. Evaluated on holdout splits (L=1, L=2)."
  },
  {
    category: "Recommendation & Link Prediction",
    name: "BPR Matrix Factorization",
    role: "Collaborative Baseline",
    status: "Implemented & Validated",
    details: "Implicit feedback matrix factorization with Bayesian Personalized Ranking and learned target bias."
  },
  {
    category: "Recommendation & Link Prediction",
    name: "Graph Structural Heuristics",
    role: "Classical Baselines",
    status: "Implemented & Validated",
    details: "Directed Common Neighbours, Adamic-Adar, Jaccard Coefficient, and In-Degree Popularity."
  },
  {
    category: "Trust & Safety Modeling",
    name: "PDN + Euclidean Distance MCDM",
    role: "Trust Weighting Framework",
    status: "Implemented & Validated",
    details: "Sun, Li & Deng (2020) probability distribution negation and Euclidean distance over 6 network criteria."
  },
  {
    category: "Diversity & Exploration",
    name: "Community-Modularity MMR",
    role: "Diversity Reranker",
    status: "Implemented & Validated",
    details: "Maximal Marginal Relevance with community novelty bonus, tested across λ in [0.0, 0.60]."
  },
  {
    category: "Explainability",
    name: "Evidence-Based Template Synthesizer",
    role: "Transparent Justification",
    status: "Implemented & Validated",
    details: "Extracts real database paths, connector accounts, shared hashtags, and missing data notices."
  },
  {
    category: "Deep Graph Learning",
    name: "GraphSAGE",
    role: "Inductive Representation",
    status: "Proposed / Next Phase",
    details: "Candidate for scaling to dynamically arriving new accounts via neighborhood feature aggregation."
  },
  {
    category: "Neural Collaborative Filtering",
    name: "NCF (He et al., 2017)",
    role: "Non-Linear Interaction Baseline",
    status: "Proposed / Next Phase",
    details: "MLP-based user-item interaction modeling proposed for ablation study comparison."
  },
  {
    category: "Attention Mechanisms",
    name: "Graph Attention Networks (GAT)",
    role: "Edge Weight Learning",
    status: "Proposed / Next Phase",
    details: "Self-attention mechanism to learn non-uniform edge importance across interaction types."
  },
  {
    category: "Trust-Aware Factorization",
    name: "TrustSVD / SocialMF",
    role: "Explicit Trust Baselines",
    status: "Surveyed / Candidate Benchmark",
    details: "Surveyed trust-regularized matrix factorization models for cross-domain benchmarking."
  },
  {
    category: "NLP & Content Analysis",
    name: "BERT / RoBERTa",
    role: "Deep Semantic Text Modeling",
    status: "Proposed / Next Phase",
    details: "Planned to replace lexical hashtag Jaccard similarity with 768-dim dense semantic embeddings."
  }
];

export const DATASET_CATALOG = [
  {
    id: "mastodon",
    name: "Mastodon Social Network (Bounded Snapshot)",
    domain: "Decentralized Social Network (Fediverse)",
    purpose: "Primary empirical implementation, validation dataset, and interactive prototype foundation.",
    dataTypes: "User profiles, directed follow graph, microblog statuses, interactions (reblogs, mentions, replies)",
    structure: "Directed MultiDiGraph with Louvain modularity clusters and complete/stub account metadata",
    size: "270 accounts · 214 follow edges · 128 interactions · 120 statuses · 68 communities",
    status: "Active & Validated",
    isPrimary: true
  },
  {
    id: "filmtrust",
    name: "FilmTrust",
    domain: "Movie Ratings & Trust Social Network",
    purpose: "Benchmark for explicit trust-aware recommendation algorithms (Guo et al., 2013).",
    dataTypes: "User-item ratings (1-8 scale), explicit directional user-to-user trust statements (0 or 1)",
    structure: "Bipartite user-item rating matrix + directed social trust network",
    size: "1,508 users · 2,071 items · 35,497 ratings · 1,853 trust edges",
    status: "Surveyed / Candidate Benchmark",
    isPrimary: false
  },
  {
    id: "epinions",
    name: "Epinions",
    domain: "Consumer Product Review & Trust Network",
    purpose: "Standard benchmark for trust and distrust propagation in social recommendation (Massa & Avesani, 2007).",
    dataTypes: "Product reviews, 1-5 ratings, explicit user-to-user trust and distrust relationships",
    structure: "Signed directed trust graph + bipartite user-product rating graph",
    size: "49,289 users · 139,738 items · 664,824 ratings · 487,183 trust edges",
    status: "Surveyed / Literature Baseline",
    isPrimary: false
  },
  {
    id: "ciao",
    name: "Ciao / CiaoDVD",
    domain: "E-Commerce Review Network",
    purpose: "Cross-category social recommendation benchmark with explicit trust links (Tang et al., 2012).",
    dataTypes: "Multi-category product ratings, timestamps, explicit social trust network",
    structure: "Directed trust network + multi-relational product review graph",
    size: "7,375 users · 99,746 items · 284,086 ratings · 111,781 trust edges",
    status: "Surveyed / Candidate Benchmark",
    isPrimary: false
  },
  {
    id: "lastfm",
    name: "LastFM (HetRec 2011)",
    domain: "Music Social Network & Tagging",
    purpose: "Multimodal music discovery benchmark combining bidirectional friendship and collaborative tagging.",
    dataTypes: "User listening counts, music artist tags, mutual social friendships",
    structure: "Undirected social friendship graph + heterogeneous user-artist-tag hypergraph",
    size: "1,892 users · 17,632 artists · 12,717 bi-directional friendships · 186,479 tagging records",
    status: "Surveyed / Candidate Benchmark",
    isPrimary: false
  },
  {
    id: "higgs",
    name: "Higgs Twitter",
    domain: "Information Propagation & Social Cascade",
    purpose: "Benchmark for modeling social contagion, retweets, mentions, and reply dynamics during viral events.",
    dataTypes: "Directed follows, timestamped retweets, mentions, replies during the Higgs boson discovery",
    structure: "Static directed follower graph + 3 temporal interaction MultiDiGraphs",
    size: "456,626 users · 14,855,846 follow edges · 563,069 interactions",
    status: "Surveyed / Candidate Baseline",
    isPrimary: false
  },
  {
    id: "reddit",
    name: "Reddit Hyperlink Network",
    domain: "Cross-Community Subreddit Links",
    purpose: "Structural study of cross-community linking behavior, sentiment, and echo-chamber boundaries.",
    dataTypes: "Community-to-community hyperlinks, post timestamps, sentiment scores, text embeddings",
    structure: "Directed weighted community-to-community network",
    size: "55,863 subreddits · 858,490 directed cross-community hyperlinks",
    status: "Surveyed / Structural Reference",
    isPrimary: false
  },
  {
    id: "advogato",
    name: "Advogato",
    domain: "Open Source Developer Trust Network",
    purpose: "Foundational benchmark for discrete certification levels and trust metric propagation (Levien, 2002).",
    dataTypes: "4 discrete trust levels (Observer, Apprentice, Journeyer, Master) among software developers",
    structure: "Directed weighted trust graph with explicit certification levels",
    size: "6,541 users · 51,127 directed certifications",
    status: "Surveyed / Foundational Reference",
    isPrimary: false
  },
  {
    id: "snap-github",
    name: "SNAP GitHub Social",
    domain: "Collaborative Software Development",
    purpose: "Developer social network combining follower graphs with shared repository participation (Rozemberczki et al., 2019).",
    dataTypes: "Directed follows, public repository stars, language tags, mutual contributions",
    structure: "Directed social graph + bipartite developer-repository graph",
    size: "37,700 developers · 289,003 directed follow edges · 177,000 repositories",
    status: "Surveyed / Candidate Benchmark",
    isPrimary: false
  }
];

export const ML_BASELINE_RESULTS = [
  {
    model: "In-Degree Popularity",
    type: "Heuristic Baseline",
    mrr: 0.2147,
    p5: 0.0800,
    r5: 0.4000,
    ndcg5: 0.2524,
    p10: 0.0400,
    r10: 0.4000,
    ndcg10: 0.2524,
    notes: "Non-personalized baseline ranking entirely by total followers."
  },
  {
    model: "Common Neighbours (Directed)",
    type: "Graph Structural",
    mrr: 0.1600,
    p5: 0.0400,
    r5: 0.2000,
    ndcg5: 0.1693,
    p10: 0.0200,
    r10: 0.2000,
    ndcg10: 0.1693,
    notes: "Requires shared intermediate followees; fails on cold-start users."
  },
  {
    model: "Adamic-Adar (Directed)",
    type: "Graph Structural",
    mrr: 0.1600,
    p5: 0.0400,
    r5: 0.2000,
    ndcg5: 0.1693,
    p10: 0.0200,
    r10: 0.2000,
    ndcg10: 0.1693,
    notes: "Log-degree inverted weighting; identical performance due to sparse 2-hop overlap."
  },
  {
    model: "Jaccard Coefficient (Directed)",
    type: "Graph Structural",
    mrr: 0.1600,
    p5: 0.0400,
    r5: 0.2000,
    ndcg5: 0.1693,
    p10: 0.0200,
    r10: 0.2000,
    ndcg10: 0.1693,
    notes: "Normalized neighborhood overlap; zero for disjoint neighborhoods."
  },
  {
    model: "BPR Matrix Factorization",
    type: "Latent Factor Model",
    mrr: 0.2241,
    p5: 0.0800,
    r5: 0.3000,
    ndcg5: 0.2338,
    p10: 0.0400,
    r10: 0.3000,
    ndcg10: 0.2338,
    notes: "Pairwise ranking optimization; learns target bias and 32-dim latent embeddings."
  },
  {
    model: "Directed LightGCN (L=1)",
    type: "Graph Neural Network",
    mrr: 0.2452,
    p5: 0.0800,
    r5: 0.4000,
    ndcg5: 0.2858,
    p10: 0.0400,
    r10: 0.4000,
    ndcg10: 0.2858,
    notes: "1-layer directed normalized convolution with dual source/target roles."
  },
  {
    model: "Directed LightGCN (L=2)",
    type: "Graph Neural Network",
    mrr: 0.2619,
    p5: 0.1200,
    r5: 0.4667,
    ndcg5: 0.3129,
    p10: 0.0600,
    r10: 0.4667,
    ndcg10: 0.3129,
    notes: "Top-performing ML baseline: +22.0% MRR and +24.0% NDCG@5 over popularity baseline."
  }
];

export const TRUST_DIVERSITY_TRADEOFF_RESULTS = [
  {
    configuration: "Relevance-Only Baseline",
    weights: "w_rel=1.0, others=0.0",
    lambda: 0.0,
    meanTrust: 0.1637,
    meanRelevance: 0.6375,
    topKCommunities: 2.63,
    crossCommunityRatio: "28.8%",
    shannonEntropy: 0.905,
    takeaway: "High relevance but lowest trust and trapped in 2.6 local communities."
  },
  {
    configuration: "Relevance + Trust",
    weights: "w_rel=0.57, w_trust=0.43",
    lambda: 0.0,
    meanTrust: 0.1882,
    meanRelevance: 0.6365,
    topKCommunities: 2.67,
    crossCommunityRatio: "28.9%",
    shannonEntropy: 0.921,
    takeaway: "+15.0% boost in trustworthiness, but still severe echo chamber entrapment."
  },
  {
    configuration: "Hybrid CBT-Rec (No Diversity)",
    weights: "w_rel=0.40, w_trust=0.30, w_ctx=0.15, w_beh=0.15",
    lambda: 0.0,
    meanTrust: 0.1882,
    meanRelevance: 0.6365,
    topKCommunities: 2.67,
    crossCommunityRatio: "28.9%",
    shannonEntropy: 0.921,
    takeaway: "Incorporates context & behaviour signals; baseline community coverage unchanged."
  },
  {
    configuration: "Full CBT-Rec (Default λ=0.30)",
    weights: "w_rel=0.40, w_trust=0.30, w_ctx=0.15, w_beh=0.15",
    lambda: 0.30,
    meanTrust: 0.1759,
    meanRelevance: 0.4626,
    topKCommunities: 7.01,
    crossCommunityRatio: "65.1%",
    shannonEntropy: 2.322,
    takeaway: "Optimal sweet spot: expands community reach by 2.66x (7.01 clusters) and doubles cross-community discovery (+125%)."
  },
  {
    configuration: "CBT-Rec High Diversity (λ=0.60)",
    weights: "w_rel=0.40, w_trust=0.30, w_ctx=0.15, w_beh=0.15",
    lambda: 0.60,
    meanTrust: 0.1696,
    meanRelevance: 0.4486,
    topKCommunities: 7.35,
    crossCommunityRatio: "65.1%",
    shannonEntropy: 2.390,
    takeaway: "Maximizes entropy; slight trade-off in mean trustworthiness."
  }
];

export const PROJECT_MILESTONES = [
  {
    id: "m-1",
    phase: "Phase 1: Foundation",
    title: "Literature Survey & Research Problem Formulation",
    status: "Completed",
    period: "Month 1 - 2",
    deliverables: "Comprehensive state-of-the-art review, formalization of OSN recommendation challenges, and OSI-inspired 6-layer architecture specification.",
    verifiedEvidence: "docs/METHODOLOGY.md & README.md formulation"
  },
  {
    id: "m-2",
    phase: "Phase 1: Foundation",
    title: "Mastodon REST API Ingestion & Relational Storage",
    status: "Completed",
    period: "Month 2 - 3",
    deliverables: "Rate-limited collector, raw JSON preservation, SQLite schema migration, and stub account isolation (is_stub=1).",
    verifiedEvidence: "src/data_layer/collector.py & data/processed/mastodon/cbt_rec_dataset.db"
  },
  {
    id: "m-3",
    phase: "Phase 2: Graph & Trust",
    title: "Multi-Graph Construction & Louvain Community Detection",
    status: "Completed",
    period: "Month 3 - 4",
    deliverables: "Master MultiDiGraph, Follow/Interaction subgraphs, PageRank centrality, reciprocity, and 68 Louvain modularity clusters.",
    verifiedEvidence: "src/graph_layer/builder.py & cbt_rec_graph.graphml"
  },
  {
    id: "m-4",
    phase: "Phase 2: Graph & Trust",
    title: "Feature Engineering & Context Modeling (Layer 3)",
    status: "Completed",
    period: "Month 4 - 5",
    deliverables: "6 normalized criteria (Activity, Popularity, Influence, CommPart, Reciprocity, Reputation), Behaviour Score, and language/recency context profiles.",
    verifiedEvidence: "src/feature_layer/extractor.py & tests/test_scoring.py"
  },
  {
    id: "m-5",
    phase: "Phase 2: Graph & Trust",
    title: "MCDM Probability Negation Trust Framework (Layer 4)",
    status: "Completed",
    period: "Month 5",
    deliverables: "Implementation of Sun, Li & Deng (2020) Probability Distribution Negation and Euclidean Distance weighting + Simple Additive Weighting.",
    verifiedEvidence: "src/trust_layer/mcdm.py & tests/validate_layer4.py"
  },
  {
    id: "m-6",
    phase: "Phase 3: Recommendation Engine",
    title: "Candidate Generation & Hybrid Multi-Signal Scoring",
    status: "Completed",
    period: "Month 6",
    deliverables: "2-hop structural candidate generator, 30% cross-community exploration sampling, and linear composite scorer across 4 signals.",
    verifiedEvidence: "src/recommendation_layer/candidate_generator.py & scorer.py"
  },
  {
    id: "m-7",
    phase: "Phase 3: Recommendation Engine",
    title: "Diversity-Aware Maximal Marginal Relevance (MMR) Reranking",
    status: "Completed",
    period: "Month 6",
    deliverables: "Modularity-based MMR algorithm with novelty bonus, parameter sweep (λ=0.0 to 0.60), and community entropy measurement.",
    verifiedEvidence: "src/recommendation_layer/reranker.py & tests/test_diversity.py"
  },
  {
    id: "m-8",
    phase: "Phase 3: Recommendation Engine",
    title: "Evidence-Based Explainability Layer (Layer 6)",
    status: "Completed",
    period: "Month 7",
    deliverables: "Automated justification generation linking intermediate graph paths, mutual hashtags, MCDM trust contributions, and missing-data disclosures.",
    verifiedEvidence: "src/explainability_layer/explainer.py & tests/test_explainability.py"
  },
  {
    id: "m-9",
    phase: "Phase 3: Recommendation Engine",
    title: "Directed LightGCN & Machine Learning Baseline Suite",
    status: "Completed",
    period: "Month 7",
    deliverables: "Directed LightGCN model with dual personas, stratified holdout split, BPR-MF, and heuristic graph baselines (60 unit tests).",
    verifiedEvidence: "src/recommendation_layer/ml/ & ml_baseline_experiments.json"
  },
  {
    id: "m-10",
    phase: "Phase 4: Prototype & Review",
    title: "Interactive Research Dashboard & Cloud Deployment",
    status: "In Progress",
    period: "Month 7 - 8 (Current)",
    deliverables: "React + Vite interactive explorer, Node/Express API with Python subprocess execution, deployed on Vercel and Render.",
    verifiedEvidence: "ui/frontend, ui/backend, and GitHub commits on main branch"
  },
  {
    id: "m-11",
    phase: "Phase 4: Prototype & Review",
    title: "Cross-Domain Benchmark on Multi-Source Datasets",
    status: "Planned",
    period: "Month 8",
    deliverables: "Evaluate CBT-Rec framework across FilmTrust, Epinions, Ciao, and LastFM to validate cross-domain generalizability.",
    verifiedEvidence: "Dataset catalog created; benchmark loaders planned"
  },
  {
    id: "m-12",
    phase: "Phase 4: Prototype & Review",
    title: "Final Review & Defense",
    status: "Planned",
    period: "Month 8 - 9",
    deliverables: "Final project report, comprehensive defense presentation, viva examination, and public open-source publication.",
    verifiedEvidence: "Scheduled for academic evaluation"
  }
];

export const TEAM_MEMBERS = [
  {
    id: "member-1",
    name: "Gauri Nandana S Pai",
    rollNumber: "CB.SC.U4CSE23120",
    email: "gaurinandana@gmail.com"
  },
  {
    id: "member-2",
    name: "Leena Sri K",
    rollNumber: "CB.SC.U4CSE23526",
    email: "leenasri0110@gmail.com"
  },
  {
    id: "member-3",
    name: "Lavishka Dhamija",
    rollNumber: "CB.SC.U4CSE23527",
    email: "lavishkadhamija@gmail.com"
  },
  {
    id: "member-4",
    name: "M Sanjana",
    rollNumber: "CB.SC.U4CSE23528",
    email: "sanjana.m@gmail.com"
  }
];

export const FACULTY_SUPERVISOR = {
  name: "Neethu M R",
  designation: "Asst. Professor",
  department: "Department of Computer Science and Engineering",
  institution: "Amrita Vishwa Vidyapeetham"
};

export const DEMO_VIDEOS = [
  {
    id: "demo-1",
    title: "Full CBT-Rec Framework & Live Prototype Walkthrough",
    duration: "08:45",
    type: "System Demonstration",
    description: "End-to-end walkthrough demonstrating the 6-layer pipeline: from data snapshot inspection to interactive recommendations with dual heuristic and LightGCN scoring modes.",
    highlights: [
      "00:00 - Introduction & Project Problem Statement",
      "01:30 - Data Layer & Graph Structure (270 accounts, 68 communities)",
      "03:15 - MCDM Trust Scoring & Criterion Weighting",
      "04:45 - Interactive Recommendation Engine & Weight Sliders",
      "06:30 - Live Diversity MMR Reranking Comparison (λ=0.0 vs λ=0.30)",
      "07:45 - Evidence-Based Explanations & Disclosures"
    ],
    status: "Placeholder · Add YouTube / Google Drive Video Link",
    embedUrl: null
  },
  {
    id: "demo-2",
    title: "MCDM Trust Estimation & Probability Negation Deep-Dive",
    duration: "06:15",
    type: "Methodology Walkthrough",
    description: "Detailed theoretical and algorithmic explanation of Sun, Li & Deng (2020) Probability Distribution Negation applied to social network criteria.",
    highlights: [
      "00:00 - Why Trust Must Not Be Conflated With Follower Counts",
      "01:45 - Deriving the 6 Normalized Network Criteria",
      "03:00 - Probability Distribution Conversion & Deng Entropy Negation",
      "04:30 - Euclidean Distance Weight Derivation and SAW Score",
      "05:30 - Stub Account Protection & NULL Value Safety"
    ],
    status: "Placeholder · Add Video Link",
    embedUrl: null
  },
  {
    id: "demo-3",
    title: "Directed LightGCN & Baseline Link Prediction Experiments",
    duration: "07:20",
    type: "Experimental Evaluation",
    description: "Presentation of the offline machine learning evaluation on stratified holdouts, comparing Directed LightGCN against classical graph heuristics and BPR-MF.",
    highlights: [
      "00:00 - Directed Graph Challenge: Why Undirected LightGCN Fails",
      "02:00 - Dual-Persona Node Roles (Follower vs Followee)",
      "03:45 - BPR Pairwise Loss Formulation",
      "05:00 - Empirical Results: +22% MRR and +24% NDCG@5 with L=2",
      "06:15 - Cold-Start Prior Fallbacks"
    ],
    status: "Placeholder · Add Video Link",
    embedUrl: null
  },
  {
    id: "demo-4",
    title: "Final Presentation & Viva Defense Walkthrough",
    duration: "12:30",
    type: "Project Review",
    description: "Formal slide presentation prepared for the faculty review panel covering background, objectives, methodology, empirical results, and viva defense.",
    highlights: [
      "00:00 - Title & Team Introduction",
      "02:00 - Research Gap & Problem Motivation",
      "04:30 - Six-Layer OSI-Inspired Architecture",
      "07:15 - Key Empirical Findings: Echo-Chamber Mitigation",
      "09:45 - Limitations & Future Research Roadmap",
      "11:00 - Conclusion & Acknowledgments"
    ],
    status: "Placeholder · Add Presentation Video Link",
    embedUrl: null
  }
];

export const VIVA_QUESTIONS = [
  {
    question: "Why did you choose a six-layer OSI-inspired architecture instead of a monolithic recommender?",
    answer: "A monolithic model entangles data collection, graph modeling, trust scoring, and ranking, making it impossible to audit individual biases or swap components. Our six-layer architecture establishes strict encapsulation: Layer 4 computes trust objectively through MCDM without knowing candidate pools, Layer 5 ranks candidates using continuous multi-signal scoring, and Layer 6 generates truthful justifications. If an algorithm is upgraded (e.g., swapping LightGCN for GraphSAGE), the remaining five layers remain completely undisturbed."
  },
  {
    question: "How does CBT-Rec prevent algorithmic echo chambers and filter bubbles?",
    answer: "Standard collaborative filtering recommends accounts from the target's immediate homophilic neighborhood, trapping users in ~2.6 communities. CBT-Rec integrates two safeguards: (1) In Stage 1 of Layer 5, 30% of candidate accounts are deliberately sampled from outside Louvain communities; (2) In Stage 3, community-aware Maximal Marginal Relevance (MMR) applies a community novelty bonus. Empirical testing on 120 users proves that setting λ=0.30 expands community representation from 2.67 to 7.01 (+162%) and doubles cross-community discovery from 28.9% to 65.1%."
  },
  {
    question: "What is the mathematical principle behind the Sun, Li & Deng (2020) MCDM trust scoring?",
    answer: "Instead of arbitrary subjective weights, the method converts normalized criterion vectors into probability distributions and computes their 'negation' distributions based on Deng entropy principles. The Euclidean distance between the original distribution and its negation measures the information discriminability of each criterion. Criteria with higher informational contrast receive proportionally higher weights, after which Simple Additive Weighting (SAW) computes an objective continuous trust score T(c) in [0, 1]."
  },
  {
    question: "How does CBT-Rec handle stub accounts and missing data without penalizing new users?",
    answer: "In real OSNs, accounts frequently appear in follow edges without having complete profile metadata collected. CBT-Rec flags these as stub accounts (is_stub=1) and stores missing attributes strictly as NULL rather than converting them to zero. In Layer 4 and 5, missing values trigger neutral global median/mean defaults with explicit missing_flags. Layer 6 transparently discloses whenever language, hashtags, behaviour, or trust were unobserved, ensuring no user is falsely penalized as untrustworthy due to missing records."
  },
  {
    question: "Why did you formulate Directed LightGCN with dual-persona representations?",
    answer: "Social follow graphs in Mastodon and Twitter are fundamentally asymmetric: account A following account B does not imply B follows A. Standard LightGCN assumes symmetric undirected bipartite graphs. We formulated Directed LightGCN by giving every node two distinct 32-dimensional base embeddings: a source persona (representing outgoing follow interests) and a target persona (representing incoming topical authority/followability), combined with directed in-degree and out-degree normalized message passing."
  }
];
