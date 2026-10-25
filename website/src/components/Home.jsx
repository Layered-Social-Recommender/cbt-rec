import React, { useState } from 'react';
import { PROJECT_METADATA, CORE_METRICS, LAYERS_DETAIL } from '../data/projectData';
import { MathText } from './MathFormulas';

export default function Home({ setActiveTab }) {
  const [selectedLayer, setSelectedLayer] = useState(LAYERS_DETAIL[4]); // Default to Layer 5

  return (
    <div>
      {/* Hero Section */}
      <section className="hero">
        <div className="container hero-content">
          <div className="hero-pill">
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-gold)', boxShadow: '0 0 8px rgba(212, 168, 67, 0.6)' }}></span>
            TEAM NO : 30 · TAG: Network systems and security
          </div>

          <h1 className="hero-title">
            Layered Social Recommendation Systems for Online Social Networks
          </h1>

          <p className="hero-subtitle">
            A six-layer OSI-inspired research architecture combining Multi-Criteria Decision Making (MCDM) behavioral trust estimation, Directed LightGCN representation learning, and community-aware diversity reranking to mitigate echo chambers.
          </p>

          <div className="hero-actions">
            <button onClick={() => setActiveTab('methodology')} className="btn btn-primary">
              Explore 6-Layer Architecture
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
            <button onClick={() => setActiveTab('datasets')} className="btn btn-secondary">
              View Empirical Results
            </button>
            <a 
              href={PROJECT_METADATA.githubUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn btn-outline"
            >
              GitHub Repository
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          </div>

          {/* Core Metrics Ribbon */}
          <div className="metrics-grid">
            {CORE_METRICS.map((metric, idx) => (
              <div key={idx} className="metric-item">
                <div className="metric-value">{metric.value}</div>
                <div className="metric-label">{metric.label}</div>
                <div className="metric-detail">{metric.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Core Research Question */}
      <section className="section section-alt">
        <div className="container">
          <div className="section-header">
            <span className="section-tag">Central Research Question</span>
            <h2>Bridging Relevance, Safety, and Perspective Diversity</h2>
            <p className="section-description">
              Conventional social recommenders optimize strictly for local link formation, creating insular algorithmic echo chambers and amplifying untrustworthy accounts.
            </p>
          </div>

          <div style={{ maxWidth: '900px', margin: '0 auto', background: '#141417', border: '1px solid rgba(212, 168, 67, 0.35)', borderRadius: '16px', padding: '2.5rem', boxShadow: '0 8px 32px rgba(0,0,0,0.7)', textAlign: 'center' }}>
            <span style={{ fontSize: '2.5rem', color: 'var(--accent-gold)', display: 'block', marginBottom: '0.5rem', lineHeight: '1' }}>“</span>
            <p style={{ fontSize: '1.35rem', fontStyle: 'italic', color: '#ffffff', lineHeight: '1.6', marginBottom: '1.25rem', fontFamily: 'var(--font-display)' }}>
              Which new user accounts are relevant and trustworthy enough for a target user to consider connecting with, while preserving opportunities to discover other communities and viewpoints?
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <span className="badge badge-gold">Trustworthy (MCDM Layer 4)</span>
              <span className="badge badge-in-progress">Diverse (MMR Reranking Layer 5)</span>
              <span className="badge badge-neutral">Explainable (Evidence Layer 6)</span>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive 6-Layer Architecture Visualizer */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <span className="section-tag">System Architecture</span>
            <h2>Six-Layer OSI-Inspired Recommendation Framework</h2>
            <p className="section-description">
              CBT-Rec decouples social recommendation into six strictly encapsulated layers. Click on any layer to inspect its inputs, mathematical mechanisms, and outputs.
            </p>
          </div>

          <div className="grid-2" style={{ alignItems: 'start' }}>
            {/* Interactive Layer Pipeline Stack */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {LAYERS_DETAIL.map((layer) => {
                const isSelected = selectedLayer.number === layer.number;
                return (
                  <div
                    key={layer.number}
                    onClick={() => setSelectedLayer(layer)}
                    className="card-interactive"
                    style={{
                      background: isSelected ? '#1c1c22' : '#141417',
                      border: isSelected ? '1px solid #d4a843' : '1px solid rgba(255, 255, 255, 0.06)',
                      boxShadow: isSelected ? '0 0 16px rgba(212, 168, 67, 0.15)' : 'var(--shadow-sm)',
                      borderRadius: '12px',
                      padding: '1.25rem 1.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1.25rem',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{
                      width: '2.5rem',
                      height: '2.5rem',
                      borderRadius: '8px',
                      background: '#18181b',
                      border: isSelected ? '1px solid #d4a843' : '1px solid rgba(255, 255, 255, 0.1)',
                      color: isSelected ? '#ffffff' : '#a1a1aa',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'var(--font-display)',
                      fontWeight: '800',
                      fontSize: '1.1rem',
                      flexShrink: 0
                    }}>
                      L{layer.number}
                    </div>

                    <div style={{ flexGrow: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                        <h4 style={{ margin: 0, color: '#ffffff' }}>
                          {layer.name}
                        </h4>
                        <span className="badge badge-gold" style={{ fontSize: '0.7rem' }}>
                          Validated
                        </span>
                      </div>
                      <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                        {layer.tech}
                      </div>
                    </div>

                    <div style={{ color: isSelected ? '#ffffff' : 'var(--text-muted)' }}>
                      ➔
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected Layer Inspector Panel */}
            <div className="card" style={{ position: 'sticky', top: '5.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <span className="section-tag" style={{ margin: 0 }}>
                  Layer {selectedLayer.number} Detailed Specification
                </span>
                <span className="badge badge-completed">{selectedLayer.status}</span>
              </div>

              <h3 style={{ fontSize: '1.6rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                {selectedLayer.name}
              </h3>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--accent-indigo)', marginBottom: '1.25rem' }}>
                Technologies: {selectedLayer.tech}
              </div>

              <p style={{ lineHeight: '1.7', marginBottom: '1.5rem' }}>
                {selectedLayer.summary}
              </p>

              <div style={{ background: 'rgba(18, 18, 18, 0.8)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--accent-gold)', fontWeight: 700, marginBottom: '0.25rem' }}>
                  Input Artifacts
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  <MathText text={selectedLayer.inputs} />
                </div>
              </div>

              <div style={{ background: 'rgba(18, 18, 18, 0.8)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--accent-emerald)', fontWeight: 700, marginBottom: '0.25rem' }}>
                  Output Produced
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  <MathText text={selectedLayer.outputs} />
                </div>
              </div>

              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                Key Technical Mechanisms:
              </div>
              <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                {selectedLayer.keyMechanisms.map((mech, i) => (
                  <li key={i}><MathText text={mech} /></li>
                ))}
              </ul>

              <div style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button onClick={() => setActiveTab('methodology')} className="btn btn-outline btn-sm">
                  Full Mathematical Formulation ➔
                </button>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Unit Test Tested
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Navigation Cards */}
      <section className="section section-alt">
        <div className="container">
          <div className="section-header">
            <span className="section-tag">Portal Sections</span>
            <h2>Evaluation &amp; Project Deliverables</h2>
            <p className="section-description">
              Explore the individual requirements for our B.Tech CSE Final Year Project evaluation.
            </p>
          </div>

          <div className="grid-3">
            <div className="card card-interactive" onClick={() => setActiveTab('problem')}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>🎯</div>
              <h3>Problem &amp; Objectives</h3>
              <p>Formal problem statement, 5 concrete project objectives, and comparison against conventional recommender limitations.</p>
              <div style={{ color: '#ffffff', fontWeight: 600, fontSize: '0.875rem' }}>View Objectives ➔</div>
            </div>

            <div className="card card-interactive" onClick={() => setActiveTab('methodology')}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>⚙️</div>
              <h3>Methodology &amp; Algorithms</h3>
              <p>Step-by-step pipeline walkthrough, Deng entropy negation MCDM formulas, Directed LightGCN equations, and MMR algorithm.</p>
              <div style={{ color: '#ffffff', fontWeight: 600, fontSize: '0.875rem' }}>View Methodology ➔</div>
            </div>

            <div className="card card-interactive" onClick={() => setActiveTab('datasets')}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>📊</div>
              <h3>Datasets &amp; Results</h3>
              <p>Full 9-dataset catalog (Mastodon + FilmTrust, Epinions, Ciao, etc.) and verified baseline link prediction benchmark tables.</p>
              <div style={{ color: '#ffffff', fontWeight: 600, fontSize: '0.875rem' }}>View Empirical Results ➔</div>
            </div>

            <div className="card card-interactive" onClick={() => setActiveTab('progress')}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>📈</div>
              <h3>Progress &amp; Milestones</h3>
              <p>12-stage milestone tracker detailing completed work, verified repository evidence, and scheduled deliverables.</p>
              <div style={{ color: '#ffffff', fontWeight: 600, fontSize: '0.875rem' }}>View Milestones ➔</div>
            </div>

            <div className="card card-interactive" onClick={() => setActiveTab('documentation')}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>📖</div>
              <h3>Documentation Portal</h3>
              <p>Complete installation guides, REST API reference tables, missing data protocols, and viva defense panel questions.</p>
              <div style={{ color: '#ffffff', fontWeight: 600, fontSize: '0.875rem' }}>Read Documentation ➔</div>
            </div>

            <div className="card card-interactive" onClick={() => setActiveTab('livedemo')}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>⚡</div>
              <h3>Interactive System Demo</h3>
              <p>Live exploration of the 6-layer pipeline: social graph, MCDM trust derivation, dynamic weight tuning, and recommendations.</p>
              <div style={{ color: '#ffffff', fontWeight: 600, fontSize: '0.875rem' }}>View Demo ➔</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
