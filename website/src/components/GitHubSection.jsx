import React from 'react';
import { PROJECT_METADATA } from '../data/projectData';

export default function GitHubSection() {
  return (
    <div className="section">
      <div className="container">
        {/* Header */}
        <div className="section-header">
          <span className="section-tag">Open Science &amp; Source Code</span>
          <h2>GitHub Repository &amp; Reproducibility</h2>
          <p className="section-description">
            Complete open-source implementation, test suites, database schema, and deployment scripts hosted on GitHub.
          </p>
        </div>

        {/* Repository Hero Card */}
        <div className="card" style={{ background: '#141417', border: '1px solid rgba(212, 168, 67, 0.35)', marginBottom: '3rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '3.5rem', height: '3.5rem', borderRadius: '12px', background: '#18181b', border: '1px solid rgba(212, 168, 67, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" color="#ffffff">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
              </div>
              <div>
                <h3 style={{ fontSize: '1.6rem', color: '#ffffff', margin: '0 0 0.25rem 0' }}>
                  Layered-Social-Recommender / cbt-rec
                </h3>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Default Branch: <span style={{ color: '#ffffff' }}>main</span> · Visibility: <span style={{ color: 'var(--accent-emerald)' }}>{PROJECT_METADATA.repositoryVisibility}</span>
                </div>
              </div>
            </div>

            <a 
              href={PROJECT_METADATA.githubUrl}
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn btn-primary"
            >
              Open GitHub Repository ↗
            </a>
          </div>

          <p style={{ fontSize: '1rem', lineHeight: '1.7', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            The entire CBT-Rec pipeline—including data collectors, graph models, MCDM trust modules, recommendation engines, unit tests, and React dashboard—is version-controlled on GitHub. All empirical tables in our documentation can be reproduced from scratch using the included test suites.
          </p>

          {/* Repository Clone Snippet */}
          <div style={{ background: '#09090b', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '8px', padding: '1.25rem' }}>
            <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              Clone Repository (HTTPS):
            </div>
            <pre style={{ margin: 0, color: '#ffffff', fontSize: '0.9rem', overflowX: 'auto' }}>
{`git clone ${PROJECT_METADATA.githubUrl}.git`}
            </pre>
          </div>
        </div>

        {/* Directory Layout Card */}
        <div className="card">
          <h3 style={{ fontSize: '1.4rem', color: '#ffffff', marginBottom: '1.25rem' }}>
            Repository Directory Organization
          </h3>

          <div className="grid-2" style={{ gap: '1.5rem' }}>
            <div style={{ background: '#18181b', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '8px', padding: '1.25rem' }}>
              <div style={{ fontFamily: 'var(--font-mono)', color: '#ffffff', fontWeight: 600, marginBottom: '0.5rem' }}>
                src/ (Six-Layer Python Package)
              </div>
              <ul style={{ paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <li><code>data_layer/</code> — REST collector &amp; SQLite processor</li>
                <li><code>graph_layer/</code> — MultiDiGraph &amp; Louvain modularity</li>
                <li><code>feature_layer/</code> — 6 normalized criteria &amp; context</li>
                <li><code>trust_layer/</code> — Sun et al. MCDM trust estimator</li>
                <li><code>recommendation_layer/</code> — LightGCN, hybrid scorer &amp; MMR</li>
                <li><code>explainability_layer/</code> — Evidence-based justification</li>
              </ul>
            </div>

            <div style={{ background: 'rgba(7, 11, 20, 0.6)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '1.25rem' }}>
              <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-emerald)', fontWeight: 600, marginBottom: '0.5rem' }}>
                data/, tests/, ui/ &amp; website/
              </div>
              <ul style={{ paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <li><code>data/processed/</code> — SQLite database &amp; CSV exports</li>
                <li><code>tests/</code> — 60 unit, regression &amp; integration tests</li>
                <li><code>ui/frontend/</code> — React research dashboard (Vercel)</li>
                <li><code>ui/backend/</code> — Node/Express API server (Render)</li>
                <li><code>website/</code> — Dedicated Academic Documentation Portal</li>
                <li><code>docs/</code> — Formal mathematical methodology document</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
