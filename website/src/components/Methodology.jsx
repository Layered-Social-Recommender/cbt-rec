import React, { useState } from 'react';
import { LAYERS_DETAIL, ALGORITHM_STATUS_MATRIX } from '../data/projectData';
import { ModularityFormula, MCDMFormulas, CompositeScoreFormula, MMRFormula } from './MathFormulas';

export default function Methodology() {
  const [activeFilter, setActiveFilter] = useState('All');

  const filteredAlgorithms = activeFilter === 'All' 
    ? ALGORITHM_STATUS_MATRIX 
    : ALGORITHM_STATUS_MATRIX.filter(a => a.status.toLowerCase().includes(activeFilter.toLowerCase()));

  return (
    <div className="section">
      <div className="container">
        {/* Header */}
        <div className="section-header">
          <span className="section-tag">Rigorous Mathematical Pipeline</span>
          <h2>System Architecture &amp; Methodology</h2>
          <p className="section-description">
            A comprehensive, verifiable breakdown of CBT-Rec's six-layer pipeline, mathematical formulations, and algorithm verification matrix.
          </p>
        </div>

        {/* High-level Dataflow Diagram */}
        <div className="card" style={{ marginBottom: '3.5rem', background: 'rgba(11, 18, 33, 0.9)' }}>
          <h3 style={{ fontSize: '1.4rem', marginBottom: '1.25rem', textAlign: 'center' }}>
            CBT-Rec End-to-End Data Flow Pipeline
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.75rem', position: 'relative' }}>
            {[
              { num: 'L1', title: 'Data Ingestion', sub: 'REST API & SQLite', color: '#d4a843' },
              { num: 'L2', title: 'Graph Network', sub: 'MultiDiGraph & Louvain', color: '#818cf8' },
              { num: 'L3', title: 'Feature Signals', sub: '6 Criteria & Context', color: '#c084fc' },
              { num: 'L4', title: 'MCDM Trust', sub: 'Sun et al. (2020)', color: '#4ade80' },
              { num: 'L5', title: 'Rec Engine', sub: 'LightGCN & MMR', color: '#fbbf24' },
              { num: 'L6', title: 'Explainability', sub: 'Factual Disclosures', color: '#f87171' },
            ].map((box, i) => (
              <div 
                key={i} 
                style={{ 
                  background: 'rgba(18, 18, 18, 0.9)', 
                  border: `1px solid ${box.color}`, 
                  borderRadius: '10px', 
                  padding: '1.25rem 0.75rem', 
                  textAlign: 'center',
                  boxShadow: `0 0 15px ${box.color}22`
                }}
              >
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.15rem', color: box.color, marginBottom: '0.25rem' }}>
                  {box.num}
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#ffffff', marginBottom: '0.25rem' }}>
                  {box.title}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {box.sub}
                </div>
              </div>
            ))}
          </div>
          
          <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            ➔ Unidirectional Data Flow: Data Layer (L1) feeds Graph (L2) and Features (L3) ➔ Trust (L4) derives objective continuous weights ➔ Recommender (L5) generates, scores, and diversity-reranks ➔ Explainability (L6) synthesizes transparent proof.
          </div>
        </div>

        {/* Detailed Layer-by-Layer Mathematical Breakdown */}
        <div style={{ marginBottom: '4.5rem' }}>
          <h3 style={{ fontSize: '1.75rem', marginBottom: '1.75rem' }}>
            Layer-by-Layer Technical Specification
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Layer 1 */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span className="pipeline-badge" style={{ width: '2.5rem', height: '2.5rem', fontSize: '1.1rem' }}>L1</span>
                  <h4 style={{ fontSize: '1.35rem', margin: 0 }}>Layer 1: Data Collection &amp; Relational Storage</h4>
                </div>
                <span className="badge badge-completed">Implemented &amp; Verified</span>
              </div>
              <p>
                Collects public profile, follow network, status, and interaction records from the Mastodon REST API without requiring user credentials. Stores records in SQLite with strict relational schema enforcement.
              </p>
              <div style={{ background: 'rgba(7, 11, 20, 0.65)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '1rem', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#e2e8f0' }}>
                <strong>Stub-Account Protocol:</strong><br />
                Accounts appearing as followees or interactors without complete crawled profiles are marked with <code style={{ color: 'var(--accent-blue)' }}>is_stub = 1</code>.<br />
                Missing feature attributes are preserved as <code style={{ color: 'var(--accent-amber)' }}>NULL</code> to prevent data fabrication.
              </div>
            </div>

            {/* Layer 2 */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span className="pipeline-badge" style={{ width: '2.5rem', height: '2.5rem', fontSize: '1.1rem' }}>L2</span>
                  <h4 style={{ fontSize: '1.35rem', margin: 0 }}>Layer 2: Social Graph Modeling &amp; Louvain Modularity</h4>
                </div>
                <span className="badge badge-completed">Implemented &amp; Verified</span>
              </div>
              <p>
                Constructs a directed MultiDiGraph isolating follow relationships and interaction edges. Computes structural network properties including PageRank centrality, reciprocity, and Louvain modularity clusters.
              </p>
              <ModularityFormula />
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Detected 68 community clusters across 270 nodes, revealing 3 dense core sub-networks and peripheral components.</p>
            </div>

            {/* Layer 3 */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span className="pipeline-badge" style={{ width: '2.5rem', height: '2.5rem', fontSize: '1.1rem' }}>L3</span>
                  <h4 style={{ fontSize: '1.35rem', margin: 0 }}>Layer 3: Feature Engineering &amp; Context Profiles</h4>
                </div>
                <span className="badge badge-completed">Implemented &amp; Verified</span>
              </div>
              <p>
                Extracts and min-max normalizes six criteria across observed accounts, and computes composite behavioural and context profiles:
              </p>
              <div className="grid-3" style={{ gap: '1rem', margin: '1rem 0' }}>
                {[
                  { name: "C1: Activity", desc: "Normalized status count & posting frequency" },
                  { name: "C2: Popularity", desc: "Follower count / max(followers)" },
                  { name: "C3: Influence", desc: "Directed PageRank centrality score" },
                  { name: "C4: Community Participation", desc: "Ratio of intra-community interactions" },
                  { name: "C5: Reciprocity", desc: "Mutual follow ratio: |<em>F</em><sub>in</sub> &cap; <em>F</em><sub>out</sub>| / |<em>F</em><sub>out</sub>|" },
                  { name: "C6: Reputation", desc: "<em>F</em><sub>in</sub> / (<em>F</em><sub>in</sub> + <em>F</em><sub>out</sub>) ratio" },
                ].map((crit, idx) => (
                  <div key={idx} style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '0.75rem' }}>
                    <div style={{ fontWeight: 600, color: 'var(--accent-blue)', fontSize: '0.85rem' }}>{crit.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }} dangerouslySetInnerHTML={{ __html: crit.desc }} />
                  </div>
                ))}
              </div>
            </div>

            {/* Layer 4 */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span className="pipeline-badge" style={{ width: '2.5rem', height: '2.5rem', fontSize: '1.1rem' }}>L4</span>
                  <h4 style={{ fontSize: '1.35rem', margin: 0 }}>Layer 4: Sun, Li &amp; Deng (2020) MCDM Trust Framework</h4>
                </div>
                <span className="badge badge-completed">Implemented &amp; Verified</span>
              </div>
              <p>
                Replaces subjective manual weights with an objective multi-criteria decision making framework based on probability distribution negation:
              </p>
              <MCDMFormulas />
            </div>

            {/* Layer 5 */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span className="pipeline-badge" style={{ width: '2.5rem', height: '2.5rem', fontSize: '1.1rem' }}>L5</span>
                  <h4 style={{ fontSize: '1.35rem', margin: 0 }}>Layer 5: Multi-Signal Scoring &amp; Diversity MMR Reranking</h4>
                </div>
                <span className="badge badge-completed">Implemented &amp; Verified</span>
              </div>
              <p>
                Operates in three stages: candidate generation, linear multi-signal scoring, and diversity-preserving Maximal Marginal Relevance (MMR) reranking:
              </p>
              <CompositeScoreFormula />
              <MMRFormula />
            </div>

            {/* Layer 6 */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span className="pipeline-badge" style={{ width: '2.5rem', height: '2.5rem', fontSize: '1.1rem' }}>L6</span>
                  <h4 style={{ fontSize: '1.35rem', margin: 0 }}>Layer 6: Evidence-Based Explainability &amp; Disclosures</h4>
                </div>
                <span className="badge badge-completed">Implemented &amp; Verified</span>
              </div>
              <p>
                Synthesizes verifiable evidence directly from the database to justify every recommendation, avoiding hallucinated explanations:
              </p>
              <div className="grid-2" style={{ gap: '1rem', margin: '1rem 0' }}>
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '1rem' }}>
                  <div style={{ fontWeight: 600, color: 'var(--accent-blue)', marginBottom: '0.5rem' }}>Evidence Bullets</div>
                  <ul style={{ paddingLeft: '1.25rem', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                    <li>Exact intermediate mutual followees connecting <em>u</em> to <em>c</em></li>
                    <li>Observed shared topic hashtags (<em>H</em><sub>u</sub> &cap; <em>H</em><sub>c</sub>)</li>
                    <li>MCDM trust score and relative rank in community</li>
                    <li>Louvain community role (exploration vs local cluster)</li>
                  </ul>
                </div>
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '1rem' }}>
                  <div style={{ fontWeight: 600, color: 'var(--accent-amber)', marginBottom: '0.5rem' }}>Missing-Data Transparency</div>
                  <ul style={{ paddingLeft: '1.25rem', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                    <li>Explicit notices whenever language is unobserved</li>
                    <li>Discloses when behaviour score uses dataset median fallback</li>
                    <li>Declares stub accounts with imputed trust defaults</li>
                    <li>Scientific disclaimer: trust is observational, not moral truth</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Algorithm Status Matrix */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <span className="section-tag">Algorithm Verification</span>
              <h3 style={{ fontSize: '1.75rem', margin: 0 }}>
                Algorithm Implementation &amp; Testing Status
              </h3>
            </div>
            
            {/* Filter buttons */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {['All', 'Implemented', 'Proposed'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`btn btn-sm ${activeFilter === filter ? 'btn-primary' : 'btn-secondary'}`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            To preserve academic integrity, the table below clearly distinguishes algorithms that are <strong>fully implemented and verified in our codebase</strong> from those that are <strong>proposed for subsequent phases or surveyed in literature</strong>.
          </p>

          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '20%' }}>Algorithm</th>
                  <th style={{ width: '18%' }}>Category</th>
                  <th style={{ width: '18%' }}>Project Role</th>
                  <th style={{ width: '16%' }}>Current Status</th>
                  <th style={{ width: '28%' }}>Implementation Verification</th>
                </tr>
              </thead>
              <tbody>
                {filteredAlgorithms.map((algo, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                      {algo.name}
                    </td>
                    <td style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                      {algo.category}
                    </td>
                    <td style={{ fontSize: '0.825rem', color: 'var(--accent-indigo)' }}>
                      {algo.role}
                    </td>
                    <td>
                      <span className={`badge ${algo.status.includes('Implemented') ? 'badge-completed' : 'badge-planned'}`}>
                        {algo.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', lineHeight: '1.5' }}>
                      {algo.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
