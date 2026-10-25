import React, { useState } from 'react';
import { PROJECT_METADATA } from '../data/projectData';
import { MCDMFormulas, LightGCNFormulas, MMRFormula } from './MathFormulas';

export default function Documentation() {
  const [activeDocSection, setActiveDocSection] = useState('setup');

  const docTabs = [
    { id: 'setup', label: '1. Setup & Execution' },
    { id: 'architecture', label: '2. System Architecture' },
    { id: 'algorithms', label: '3. Mathematical Formulations' },
    { id: 'api', label: '4. REST API Reference' },
    { id: 'ethics', label: '5. Ethics & Disclosures' },
  ];

  return (
    <div className="section">
      <div className="container">
        {/* Header */}
        <div className="section-header">
          <span className="section-tag">Academic Knowledge Base</span>
          <h2>Project Documentation &amp; Technical Manual</h2>
          <p className="section-description">
            Complete technical specification, reproduction instructions, REST API contract, and algorithmic design.
          </p>
        </div>

        {/* Tab Bar */}
        <div className="tab-bar">
          {docTabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveDocSection(t.id)}
              className={`tab-btn ${activeDocSection === t.id ? 'active' : ''}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Setup & Execution */}
        {activeDocSection === 'setup' && (
          <div className="card">
            <h3 style={{ fontSize: '1.6rem', color: '#ffffff', marginBottom: '1rem' }}>
              Installation &amp; Local Execution Guide
            </h3>
            <p>
              Follow these steps to run the complete CBT-Rec system locally on your development machine.
            </p>

            <div style={{ marginBottom: '2rem' }}>
              <h4 style={{ color: 'var(--accent-blue)', marginBottom: '0.75rem' }}>A. Prerequisites</h4>
              <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <li>Python 3.10+ (tested with Python 3.13 on Windows and Ubuntu Linux)</li>
                <li>Node.js 18+ and npm (for frontend and backend API)</li>
                <li>Git</li>
              </ul>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <h4 style={{ color: 'var(--accent-blue)', marginBottom: '0.75rem' }}>B. Clone Repository &amp; Set Up Python Environment</h4>
              <pre style={{ background: '#040711', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '1.25rem', color: '#38bdf8', overflowX: 'auto', fontSize: '0.875rem' }}>
{`# 1. Clone the repository
git clone ${PROJECT_METADATA.githubUrl}.git
cd cbt-rec

# 2. Create and activate Python virtual environment
python -m venv venv
# On Windows:
.\\venv\\Scripts\\activate
# On Linux / macOS:
source venv/bin/activate

# 3. Install core dependencies (scipy, numpy, networkx, pandas, requests)
pip install -r requirements.txt`}
              </pre>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <h4 style={{ color: 'var(--accent-blue)', marginBottom: '0.75rem' }}>C. Run Full Test Suite</h4>
              <p>Execute all 60 regression, unit, and integration tests covering Layers 1 through 6:</p>
              <pre style={{ background: '#040711', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '1rem', color: '#34d399', fontSize: '0.875rem' }}>
{`python -m unittest discover -s tests -p "test_*.py"`}
              </pre>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <h4 style={{ color: 'var(--accent-blue)', marginBottom: '0.75rem' }}>D. Run Recommendation Engine via CLI</h4>
              <pre style={{ background: '#040711', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '1rem', color: '#e2e8f0', fontSize: '0.875rem' }}>
{`# Generate Top-10 recommendations for a specific user:
python -m src.recommendation_layer.engine --target "Mastodon@mastodon.social" --top_k 10

# Run in Hybrid LightGCN mode:
python -m src.recommendation_layer.engine --target "Mastodon@mastodon.social" --scoring_mode hybrid_lightgcn --json`}
              </pre>
            </div>

            <div>
              <h4 style={{ color: 'var(--accent-blue)', marginBottom: '0.75rem' }}>E. Launch Research Dashboard UI</h4>
              <pre style={{ background: '#040711', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '1.25rem', color: '#f8fafc', overflowX: 'auto', fontSize: '0.875rem' }}>
{`# Terminal 1: Backend Express Server (port 3001)
cd ui/backend
npm install
node server.js

# Terminal 2: Frontend React Dashboard (port 5173)
cd ui/frontend
npm install
npm run dev

# Open http://localhost:5173 in browser`}
              </pre>
            </div>
          </div>
        )}

        {/* Tab 2: System Architecture */}
        {activeDocSection === 'architecture' && (
          <div className="card">
            <h3 style={{ fontSize: '1.6rem', color: '#ffffff', marginBottom: '1rem' }}>
              Six-Layer OSI-Inspired Design Philosophy
            </h3>
            <p>
              CBT-Rec decouples the social recommendation pipeline into distinct, auditable layers to ensure explainability and modular replacement.
            </p>

            <div className="table-wrapper" style={{ margin: '1.5rem 0' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Layer</th>
                    <th>Module</th>
                    <th>Input Artifact</th>
                    <th>Transformation Method</th>
                    <th>Output Artifact</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: 700, color: 'var(--accent-blue)' }}>L1: Data</td>
                    <td><code>data_layer</code></td>
                    <td>Mastodon REST API</td>
                    <td>Rate-limited ingestion &amp; stub account tagging</td>
                    <td><code>cbt_rec_dataset.db</code></td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 700, color: 'var(--accent-indigo)' }}>L2: Graph</td>
                    <td><code>graph_layer</code></td>
                    <td>Relational SQLite tables</td>
                    <td>MultiDiGraph, PageRank &amp; Louvain modularity</td>
                    <td><code>cbt_rec_graph.graphml</code></td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 700, color: 'var(--accent-purple)' }}>L3: Features</td>
                    <td><code>feature_layer</code></td>
                    <td>Network topology &amp; statuses</td>
                    <td>6 normalized criteria &amp; context profiles</td>
                    <td>Feature matrices &amp; scores</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 700, color: 'var(--accent-emerald)' }}>L4: Trust</td>
                    <td><code>trust_layer</code></td>
                    <td>Normalized criteria (L3)</td>
                    <td>Probability Distribution Negation MCDM (Sun et al.)</td>
                    <td>Continuous Trust T(c) &isin; [0, 1]</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 700, color: 'var(--accent-amber)' }}>L5: Rec Engine</td>
                    <td><code>recommendation_layer</code></td>
                    <td>Graph (L2), Features (L3), Trust (L4)</td>
                    <td>2-hop generation, 4-signal scoring &amp; MMR</td>
                    <td>Ranked Top-K candidate list</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 700, color: 'var(--accent-rose)' }}>L6: Explainability</td>
                    <td><code>explainability_layer</code></td>
                    <td>Ranked candidates &amp; connectors</td>
                    <td>Path traversal &amp; missing data disclosures</td>
                    <td>Structured explanation JSON</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ background: '#141417', border: '1px solid rgba(212, 168, 67, 0.3)', borderRadius: '8px', padding: '1rem', fontSize: '0.9rem' }}>
              <strong>Encapsulation Benefit:</strong> Unlike end-to-end black-box neural recommenders, any layer can be scrutinized independently. For instance, an auditor can inspect Layer 4 trust weights without knowing the target candidate list, or swap Layer 5 ranking algorithms while keeping Layer 6 explainability intact.
            </div>
          </div>
        )}

        {/* Tab 3: Mathematical Formulations */}
        {activeDocSection === 'algorithms' && (
          <div className="card">
            <h3 style={{ fontSize: '1.6rem', color: '#ffffff', marginBottom: '1rem' }}>
              Mathematical Formulations &amp; Algorithms
            </h3>

            <div style={{ marginBottom: '2.5rem' }}>
              <h4 style={{ color: 'var(--accent-gold)', marginBottom: '0.75rem' }}>
                1. Sun, Li &amp; Deng (2020) Probability Distribution Negation MCDM
              </h4>
              <p style={{ fontSize: '0.95rem', marginBottom: '1rem' }}>
                Derives objective weights across the 6 normalized network criteria X&prime;<sub>1</sub>, &hellip;, X&prime;<sub>6</sub> without subjective tuning:
              </p>
              <MCDMFormulas />
            </div>

            <div style={{ marginBottom: '2.5rem' }}>
              <h4 style={{ color: 'var(--accent-gold)', marginBottom: '0.75rem' }}>
                2. Directed LightGCN Asymmetric Convolution
              </h4>
              <p style={{ fontSize: '0.95rem', marginBottom: '1rem' }}>
                Dual-persona base representations for asymmetric social follow graphs (&Acirc;<sub>uv</sub> = 1 &hArr; u &rarr; v):
              </p>
              <LightGCNFormulas />
            </div>

            <div>
              <h4 style={{ color: 'var(--accent-gold)', marginBottom: '0.75rem' }}>
                3. Diversity-Aware Maximal Marginal Relevance (MMR)
              </h4>
              <MMRFormula />
            </div>
          </div>
        )}

        {/* Tab 4: REST API Reference */}
        {activeDocSection === 'api' && (
          <div className="card">
            <h3 style={{ fontSize: '1.6rem', color: '#ffffff', marginBottom: '1rem' }}>
              REST API Endpoint Reference
            </h3>
            <p>
              The Express backend (running on port 3001) exposes 12 endpoints serving data, metrics, and on-demand recommendations.
            </p>

            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '10%' }}>Method</th>
                    <th style={{ width: '28%' }}>Endpoint</th>
                    <th style={{ width: '42%' }}>Description &amp; Parameters</th>
                    <th style={{ width: '20%' }}>Response Type</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { m: 'GET', ep: '/api/health', desc: 'Service health status ping and timestamp', res: 'JSON {status, timestamp}' },
                    { m: 'GET', ep: '/api/summary', desc: 'High-level entity and edge counts across all 6 layers', res: 'JSON {users, relationships, ...}' },
                    { m: 'GET', ep: '/api/users', desc: 'List of observed accounts with stub indicators (is_stub)', res: 'JSON Array' },
                    { m: 'GET', ep: '/api/relationships', desc: 'Declarative directed follow edges', res: 'JSON Array' },
                    { m: 'GET', ep: '/api/interactions', desc: 'Microblog behavioral interactions (reblogs, replies, mentions)', res: 'JSON Array' },
                    { m: 'GET', ep: '/api/graph/metrics', desc: 'Graph-level modularity score and detected community counts', res: 'JSON {modularity, communities}' },
                    { m: 'GET', ep: '/api/graph/nodes', desc: 'Node-level network metrics: in-degree, PageRank, community_id', res: 'JSON Array' },
                    { m: 'GET', ep: '/api/features', desc: 'Layer 3 extracted feature criterion vectors for complete users', res: 'JSON Array' },
                    { m: 'GET', ep: '/api/trust/weights', desc: 'Layer 4 derived MCDM criterion weights (Activity, Popularity, etc.)', res: 'JSON Object' },
                    { m: 'GET', ep: '/api/trust/scores', desc: 'Layer 4 continuous trustworthiness estimates T(c)', res: 'JSON Array' },
                    { m: 'GET', ep: '/api/recommendations/targets', desc: 'List of candidate target accounts eligible for recommendation', res: 'JSON Array' },
                    { m: 'GET', ep: '/api/recommendations/:id', desc: 'Get Top-K recommendations for user :id. Query: ?scoring_mode=heuristic|hybrid_lightgcn', res: 'JSON {recommendations, ...}' },
                    { m: 'POST', ep: '/api/recommendations/custom', desc: 'Dynamic recalculation with custom weights and diversity_lambda', res: 'JSON {recommendations, ...}' },
                  ].map((row, idx) => (
                    <tr key={idx}>
                      <td>
                        <span className={`badge ${row.m === 'GET' ? 'badge-in-progress' : 'badge-completed'}`}>
                          {row.m}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#ffffff' }}>
                        {row.ep}
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {row.desc}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--accent-indigo)' }}>
                        {row.res}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 5: Ethics & Disclosures */}
        {activeDocSection === 'ethics' && (
          <div className="card">
            <h3 style={{ fontSize: '1.6rem', color: '#ffffff', marginBottom: '1rem' }}>
              Research Ethics, Trust Disclaimers &amp; Transparency
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ background: 'rgba(251, 191, 36, 0.05)', border: '1px solid rgba(251, 191, 36, 0.25)', borderRadius: '8px', padding: '1.25rem' }}>
                <h4 style={{ color: 'var(--accent-amber)', marginBottom: '0.5rem' }}>
                  1. Trust as an Observational Metric, Not Moral Character
                </h4>
                <p style={{ fontSize: '0.925rem', lineHeight: '1.7', margin: 0, color: '#e2e8f0' }}>
                  Trustworthiness scores computed by Layer 4 represent strictly observational structural and behavioral consistency within the observed network (reciprocity, participation, non-spam regularity). They do not constitute objective moral judgment, personal safety guarantees, or censorship criteria.
                </p>
              </div>

              <div style={{ background: '#141417', border: '1px solid rgba(212, 168, 67, 0.3)', borderRadius: '8px', padding: '1.25rem' }}>
                <h4 style={{ color: '#ffffff', marginBottom: '0.5rem' }}>
                  2. Continuous Ranking vs. Hard Exclusion Filters
                </h4>
                <p style={{ fontSize: '0.925rem', lineHeight: '1.7', margin: 0, color: '#e2e8f0' }}>
                  Trust is integrated as a continuous weighting signal in Layer 5 (w<sub>trust</sub> = 0.30), rather than a binary threshold. This ensures accounts with low or unmeasured trust are not unilaterally de-platformed or silenced, enabling healthy exploratory discovery.
                </p>
              </div>

              <div style={{ background: 'rgba(52, 211, 153, 0.05)', border: '1px solid rgba(52, 211, 153, 0.25)', borderRadius: '8px', padding: '1.25rem' }}>
                <h4 style={{ color: 'var(--accent-emerald)', marginBottom: '0.5rem' }}>
                  3. Respect for User Privacy &amp; Public API Boundaries
                </h4>
                <p style={{ fontSize: '0.925rem', lineHeight: '1.7', margin: 0, color: '#e2e8f0' }}>
                  All network data is gathered exclusively through public Mastodon API endpoints in strict accordance with server rate limits. No private messages, deleted posts, or restricted visibility content is collected or processed.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
