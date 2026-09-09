import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchSummary } from '../api';

const layers = [
  { name: 'Data Layer', path: '/data', status: 'Implemented', layer: 1 },
  { name: 'Social Graph', path: '/graph', status: 'Implemented', layer: 2 },
  { name: 'Feature & Context Layer', path: '/features', status: 'Implemented', layer: 3 },
  { name: 'Trust / MCDM', path: '/trust', status: 'Implemented', layer: 4 },
  { name: 'Recommendation Engine', path: null, status: 'Coming Next', layer: 5 },
];

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSummary()
      .then(setSummary)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="page-title">CBT-Rec</h1>
        <p className="page-subtitle">Layered Social Recommendation System — Research Dashboard</p>
      </div>

      {error && <div className="alert alert-warning">Backend connection error: {error}. Ensure the Node.js server is running on port 3001.</div>}

      {loading ? (
        <p>Loading summary...</p>
      ) : summary && (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{summary.users}</div>
              <div className="stat-label">Observed Accounts</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{summary.completeUsers}</div>
              <div className="stat-label">Complete Accounts</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{summary.stubUsers}</div>
              <div className="stat-label">Stub Accounts</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{summary.relationships}</div>
              <div className="stat-label">Follow Relationships</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{summary.statuses}</div>
              <div className="stat-label">Collected Statuses</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{summary.interactions}</div>
              <div className="stat-label">Interaction Records</div>
            </div>
          </div>
        </>
      )}

      <div className="card">
        <h2>CBT-Rec Pipeline</h2>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0' }}>
          {layers.map((l, i) => (
            <div key={l.layer} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.5rem', background: '#ffffff', border: '1px solid #d4d4d4', borderRadius: '0.25rem', minWidth: 350 }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#71717a' }}>L{l.layer}</span>
                <div style={{ flex: 1 }}>
                  {l.path ? (
                    <Link to={l.path} style={{ fontWeight: 600, textDecoration: 'none', color: '#171717' }}>{l.name}</Link>
                  ) : (
                    <span style={{ fontWeight: 600, color: '#a1a1aa' }}>{l.name}</span>
                  )}
                </div>
                <span className={`badge ${l.status === 'Coming Next' ? 'badge-muted' : 'badge-success'}`}>{l.status}</span>
              </div>
              {i < layers.length - 1 && (
                <div style={{ paddingLeft: '1.6rem', color: '#71717a', fontSize: '1.25rem', lineHeight: '1.5' }}>↓</div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2>About This Research Prototype</h2>
        <p style={{ color: '#52525b', lineHeight: '1.75' }}>
          CBT-Rec is a layered, trust-aware and context-aware social recommendation research framework built on real Mastodon network data. This dashboard allows inspection of each pipeline layer — from raw data collection (Layer 1) through social graph construction (Layer 2), feature extraction (Layer 3), and MCDM-based trustworthiness estimation (Layer 4). The Recommendation Engine (Layer 5) is the next phase of implementation.
        </p>
      </div>
    </div>
  );
}
