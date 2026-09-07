import { useEffect, useState } from 'react';
import { fetchFeatures, fetchFeatureById } from '../api';

const CRITERIA = ['activity', 'popularity', 'influence', 'community_participation', 'reciprocity', 'reputation'];
const CRITERIA_LABELS = {
  activity: 'Activity',
  popularity: 'Popularity',
  influence: 'Influence',
  community_participation: 'Community Participation',
  reciprocity: 'Reciprocity',
  reputation: 'Reputation',
};
const CRITERIA_DESC = {
  activity: 'Collected status volume + outgoing interaction weight.',
  popularity: 'Follow in-degree (Follow Graph) + mean reblogs/favourites on collected statuses.',
  influence: 'PageRank score on the Follow Graph.',
  community_participation: 'Louvain clustering coefficient + distinct communities interacted with.',
  reciprocity: 'Proportion of outgoing follows that are mutual.',
  reputation: 'Account age + follower-to-following ratio + lifetime post volume (log-scaled).',
};

function ScoreBar({ value }) {
  if (value === null || value === undefined) return <span style={{ color: '#94a3b8' }}>—</span>;
  const pct = (value * 100).toFixed(1);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <div style={{ flex: 1, background: '#e2e8f0', borderRadius: 9999, height: 8 }}>
        <div style={{ width: `${pct}%`, background: '#3b82f6', borderRadius: 9999, height: '100%' }} />
      </div>
      <span style={{ fontSize: '0.85rem', fontWeight: 600, minWidth: 40, fontFamily: 'monospace' }}>{Number(value).toFixed(3)}</span>
    </div>
  );
}

function FeatureRow({ label, feat, rawFeat, desc, expanded, onToggle, value }) {
  const displayVal = value !== null && value !== undefined ? value : null;
  return (
    <div style={{ borderBottom: '1px solid #e2e8f0', padding: '0.75rem 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }} onClick={onToggle}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600 }}>{label}</div>
          {displayVal !== null ? <ScoreBar value={displayVal} /> : <span style={{ color: '#94a3b8' }}>—</span>}
        </div>
        <span style={{ color: '#94a3b8', fontSize: '1.25rem' }}>{expanded ? '▲' : '▼'}</span>
      </div>
      {expanded && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.375rem', padding: '1rem', marginTop: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '2rem', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
            <div><span style={{ color: '#64748b' }}>Normalized:</span> <strong>{displayVal !== null ? displayVal.toFixed(6) : '—'}</strong></div>
            <div><span style={{ color: '#64748b' }}>Raw:</span> <strong>{rawFeat !== null && rawFeat !== undefined ? Number(rawFeat).toFixed(6) : '—'}</strong></div>
          </div>
          <p style={{ color: '#475569', fontSize: '0.875rem' }}>{desc}</p>
        </div>
      )}
    </div>
  );
}

export default function Features() {
  const [allFeatures, setAllFeatures] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [feat, setFeat] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    fetchFeatures().then(data => {
      setAllFeatures(data);
    });
  }, []);

  const filtered = allFeatures.filter(u => u.canonical_acct?.toLowerCase().includes(search.toLowerCase()));

  function select(user) {
    setSelected(user.canonical_acct);
    setLoadingDetail(true);
    fetchFeatureById(user.canonical_acct).then(data => { setFeat(data); setLoadingDetail(false); });
  }

  function toggleExpand(key) {
    setExpanded(e => ({ ...e, [key]: !e[key] }));
  }

  function nullDisplay(val) {
    if (val === null || val === undefined) return null;
    const n = Number(val);
    if (isNaN(n)) return null;
    return n;
  }

  return (
    <div>
      <h1 className="page-title">Feature & Context Layer</h1>
      <p className="page-subtitle">Layer 3 — Per-user feature profiles and context attributes</p>

      <div style={{ display: 'flex', gap: '2rem' }}>
        <div style={{ width: 280, flexShrink: 0 }}>
          <div className="card" style={{ margin: 0 }}>
            <h2>Select User</h2>
            <input className="search-input" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} style={{ marginBottom: '0.75rem' }} />
            <div style={{ maxHeight: 500, overflowY: 'auto' }}>
              {filtered.map(u => (
                <div key={u.canonical_acct} onClick={() => select(u)} style={{ padding: '0.5rem 0.75rem', cursor: 'pointer', borderRadius: '0.375rem', background: selected === u.canonical_acct ? '#dbeafe' : 'transparent', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.125rem' }}>
                  <div style={{ flex: 1, fontSize: '0.8rem', fontFamily: 'monospace', wordBreak: 'break-all' }}>{u.canonical_acct}</div>
                  {u.is_stub ? <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>Stub</span> : <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>✓</span>}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ flex: 1 }}>
          {!feat && !loadingDetail && (
            <div className="card"><p style={{ color: '#64748b' }}>Select a user to view their feature profile.</p></div>
          )}
          {loadingDetail && <div className="card"><p>Loading...</p></div>}
          {feat && !loadingDetail && (
            <>
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                  <h2 style={{ border: 'none', padding: 0, margin: 0, flex: 1 }}>{feat.canonical_acct}</h2>
                  <span className={`badge ${feat.is_stub ? 'badge-warning' : 'badge-success'}`}>{feat.is_stub ? 'Stub Account' : 'Complete'}</span>
                </div>
                {feat.is_stub ? (
                  <div className="alert alert-warning">Stub account — insufficient collected profile data for complete feature calculation. Graph-derived metrics may still be available.</div>
                ) : null}

                <h3 style={{ fontWeight: 600, marginBottom: '0.5rem', marginTop: '0.5rem' }}>Six MCDM Criteria</h3>
                {CRITERIA.map(c => (
                  <FeatureRow
                    key={c}
                    label={CRITERIA_LABELS[c]}
                    feat={feat[c]}
                    rawFeat={feat[`${c}_raw`]}
                    desc={CRITERIA_DESC[c]}
                    value={nullDisplay(feat[c])}
                    expanded={!!expanded[c]}
                    onToggle={() => toggleExpand(c)}
                  />
                ))}
              </div>

              <div className="card">
                <h2>Behaviour Score</h2>
                <div className="alert alert-info">Behaviour Score is separate from the six MCDM trust criteria and is intended for downstream recommendation ranking.</div>
                {feat.is_stub ? (
                  <p style={{ color: '#94a3b8' }}>— Not available for stub accounts.</p>
                ) : (
                  <>
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Overall Behaviour Score</div>
                      <ScoreBar value={nullDisplay(feat.behaviour_score)} />
                    </div>
                    <table>
                      <tbody>
                        <tr><td style={{ color: '#64748b' }}>Behaviour Score (raw)</td><td>{feat.behaviour_score_raw !== null ? Number(feat.behaviour_score_raw).toFixed(6) : '—'}</td></tr>
                        <tr><td style={{ color: '#64748b' }}>Reply Ratio</td><td>{feat.reply_ratio !== null && feat.reply_ratio !== undefined ? Number(feat.reply_ratio).toFixed(4) : '—'}</td></tr>
                        <tr><td style={{ color: '#64748b' }}>Reblog Ratio</td><td>{feat.reblog_ratio !== null && feat.reblog_ratio !== undefined ? Number(feat.reblog_ratio).toFixed(4) : '—'}</td></tr>
                        <tr><td style={{ color: '#64748b' }}>Mention Ratio</td><td>{feat.mention_ratio !== null && feat.mention_ratio !== undefined ? Number(feat.mention_ratio).toFixed(4) : '—'}</td></tr>
                        <tr><td style={{ color: '#64748b' }}>Posting Regularity</td><td>{feat.posting_regularity !== null && feat.posting_regularity !== undefined ? Number(feat.posting_regularity).toFixed(4) : '—'}</td></tr>
                      </tbody>
                    </table>
                  </>
                )}
              </div>

              <div className="card">
                <h2>Context Profile</h2>
                <div className="alert alert-info">Context Profile captures per-user contextual attributes for downstream pairwise context scoring. It is not a trust criterion.</div>
                {feat.is_stub ? (
                  <p style={{ color: '#94a3b8' }}>— Not available for stub accounts.</p>
                ) : (
                  <table>
                    <tbody>
                      <tr><td style={{ color: '#64748b' }}>Primary Language</td><td>{feat.primary_language ?? '—'}</td></tr>
                      <tr><td style={{ color: '#64748b' }}>Top Hashtags</td><td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{feat.top_hashtags ?? '—'}</td></tr>
                      <tr><td style={{ color: '#64748b' }}>Recent Activity Score</td><td>{feat.recent_activity_score !== null && feat.recent_activity_score !== undefined ? Number(feat.recent_activity_score).toFixed(4) : '—'}</td></tr>
                      <tr><td style={{ color: '#64748b' }}>Interaction Recency Score</td><td>{feat.interaction_recency_score !== null && feat.interaction_recency_score !== undefined ? Number(feat.interaction_recency_score).toFixed(4) : '—'}</td></tr>
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
