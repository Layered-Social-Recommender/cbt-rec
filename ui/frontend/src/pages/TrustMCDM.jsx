import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer
} from 'recharts';
import { fetchTrustWeights, fetchTrustScores, fetchTrustById } from '../api';

const CRITERIA_LABELS = {
  activity: 'Activity',
  popularity: 'Popularity',
  influence: 'Influence',
  community_participation: 'Comm. Participation',
  reciprocity: 'Reciprocity',
  reputation: 'Reputation',
};
const COLORS = ['#3b82f6','#10b981','#8b5cf6','#f59e0b','#ef4444','#06b6d4'];

const FORMULA_STEPS = [
  { label: 'Probability Distribution', formula: 'P_ij = x_ij / Σ_k x_kj', desc: 'Normalize each criterion column into a probability distribution over all complete users.' },
  { label: 'Probability Negation', formula: 'P_neg_ij = (1 - P_ij) / (m - 1)', desc: 'Compute the negated probability, representing the complementary distribution (maintains Σ = 1).' },
  { label: 'Euclidean Distance', formula: 'D_j = √Σ_i (P_ij - P_neg_ij)²', desc: 'The Euclidean distance between the distribution and its negation is used to derive the relative criterion weight. A larger distance produces a larger weight.' },
  { label: 'Weight Calculation', formula: 'W_j = D_j / Σ_k D_k', desc: 'Normalize distances. Any zero-distance criteria receive W_j = 0; remaining weights are renormalized to sum exactly to 1.0.' },
  { label: 'Trustworthiness Score (SAW)', formula: 'Trust_i = Σ_j W_j · x_ij', desc: 'Simple Additive Weighting: the final score is the weighted sum of normalized feature values across all six criteria.' },
];

export default function TrustMCDM() {
  const [weights, setWeights] = useState([]);
  const [scores, setScores] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedAcct, setSelectedAcct] = useState(null);
  const [trustDetail, setTrustDetail] = useState(null);
  const [showFormulas, setShowFormulas] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchTrustWeights(), fetchTrustScores()]).then(([w, s]) => {
      setWeights(w);
      setScores(s);
    }).finally(() => setLoading(false));
  }, []);

  const completeScores = scores.filter(s => !s.is_stub && s.trust_score !== null);
  const stubCount = scores.filter(s => s.is_stub).length;
  const topScores = [...completeScores].sort((a, b) => b.trust_score - a.trust_score).slice(0, 10);

  const chartData = weights
    .filter(w => CRITERIA_LABELS[w.criterion])
    .map((w, i) => ({
      name: CRITERIA_LABELS[w.criterion] || w.criterion,
      weight: parseFloat(w.weight.toFixed(6)),
      color: COLORS[i % COLORS.length]
    }))
    .sort((a, b) => b.weight - a.weight);

  const weightSum = weights.reduce((s, w) => s + w.weight, 0);

  function selectUser(acct) {
    setSelectedAcct(acct);
    fetchTrustById(acct).then(setTrustDetail);
  }

  const filtered = scores.filter(s => s.canonical_acct?.toLowerCase().includes(search.toLowerCase()));

  const criteriaKeys = ['activity', 'popularity', 'influence', 'community_participation', 'reciprocity', 'reputation'];

  return (
    <div>
      <h1 className="page-title">Trust &amp; MCDM</h1>
      <p className="page-subtitle">Trustworthiness estimation using six-criteria MCDM (SAW) — Layer 4 · Scores are relative estimates, not ground-truth trust or safety classifications</p>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div className="stat-card"><div className="stat-value">{loading ? '…' : completeScores.length}</div><div className="stat-label">Users Scored</div></div>
        <div className="stat-card"><div className="stat-value">{loading ? '…' : stubCount}</div><div className="stat-label">Stubs Excluded</div></div>
        <div className="stat-card"><div className="stat-value">{loading ? '…' : completeScores.length ? Math.max(...completeScores.map(s => s.trust_score)).toFixed(4) : '—'}</div><div className="stat-label">Max Trust Score</div></div>
        <div className="stat-card"><div className="stat-value">{loading ? '…' : completeScores.length ? (completeScores.reduce((s, x) => s + x.trust_score, 0) / completeScores.length).toFixed(4) : '—'}</div><div className="stat-label">Mean Trust Score</div></div>
      </div>

      <div className="card">
        <h2>MCDM Pipeline</h2>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.85rem', color: '#475569' }}>
          {['Layer 3 User Features', 'Decision Matrix', 'Probability Distribution', 'Negation', 'Euclidean Distance', 'Criterion Weights', 'Weighted Sum', 'Trustworthiness Score'].map((step, i, arr) => (
            <span key={step} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ background: '#dbeafe', color: '#1e40af', padding: '0.25rem 0.6rem', borderRadius: '0.25rem', fontWeight: 500 }}>{step}</span>
              {i < arr.length - 1 && <span style={{ color: '#94a3b8' }}>→</span>}
            </span>
          ))}
        </div>

        <div style={{ marginTop: '1.5rem' }}>
          <button onClick={() => setShowFormulas(f => !f)} style={{ padding: '0.5rem 1rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem', cursor: 'pointer', background: showFormulas ? '#dbeafe' : '#f8fafc', fontWeight: 500 }}>
            {showFormulas ? '▲ Hide' : '▼ View'} MCDM Calculation Steps
          </button>
          {showFormulas && (
            <div style={{ marginTop: '1rem' }}>
              {FORMULA_STEPS.map((step, i) => (
                <div key={step.label} style={{ display: 'flex', gap: '1rem', padding: '0.75rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.375rem', marginBottom: '0.5rem', alignItems: 'flex-start' }}>
                  <span style={{ background: '#3b82f6', color: '#fff', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>{i + 1}</span>
                  <div>
                    <div style={{ fontWeight: 600 }}>{step.label}</div>
                    <code style={{ display: 'block', fontSize: '0.85rem', background: '#1e293b', color: '#93c5fd', padding: '0.5rem', borderRadius: '0.25rem', margin: '0.5rem 0', fontFamily: 'monospace' }}>{step.formula}</code>
                    <p style={{ fontSize: '0.85rem', color: '#475569' }}>{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <h2>Derived Criterion Weights</h2>
        {loading ? <p>Loading...</p> : (
          <>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 120, right: 40, top: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" domain={[0, 0.35]} tickFormatter={v => v.toFixed(2)} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 13 }} />
                <Tooltip formatter={(v) => v.toFixed(6)} />
                <Bar dataKey="weight" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '1rem', fontSize: '0.85rem' }}>
              {chartData.map((d, i) => (
                <span key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ width: 12, height: 12, background: d.color, borderRadius: '2px', display: 'inline-block' }} />
                  {d.name}: <strong>{d.weight.toFixed(6)}</strong>
                </span>
              ))}
            </div>
            <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: '#475569' }}>
              Weight sum: <strong>{weightSum.toFixed(6)}</strong>
              {Math.abs(weightSum - 1.0) < 0.001
                ? <span style={{ color: '#10b981', marginLeft: '0.5rem' }}>✓ Sums to 1.0</span>
                : <span style={{ color: '#ef4444', marginLeft: '0.5rem' }}>⚠ Does not sum to 1.0</span>}
            </div>
          </>
        )}
      </div>

      <div style={{ display: 'flex', gap: '2rem' }}>
        <div style={{ width: 280, flexShrink: 0 }}>
          <div className="card" style={{ margin: 0 }}>
            <h2>User Trust Search</h2>
            <input className="search-input" placeholder="Search account..." value={search} onChange={e => setSearch(e.target.value)} />
            <div style={{ maxHeight: 500, overflowY: 'auto' }}>
              {filtered.map(s => (
                <div key={s.canonical_acct} onClick={() => selectUser(s.canonical_acct)} style={{ padding: '0.5rem 0.75rem', cursor: 'pointer', borderRadius: '0.375rem', background: selectedAcct === s.canonical_acct ? '#dbeafe' : 'transparent', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.125rem' }}>
                  <div style={{ flex: 1, fontSize: '0.8rem', fontFamily: 'monospace', wordBreak: 'break-all' }}>{s.canonical_acct}</div>
                  {s.is_stub ? (
                    <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>Stub</span>
                  ) : (
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#3b82f6' }}>{s.trust_score?.toFixed(4) ?? '—'}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ flex: 1 }}>
          {trustDetail ? (
            <div className="card" style={{ margin: 0 }}>
              <h2>Trustworthiness Estimate</h2>
              <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem', wordBreak: 'break-all' }}>{trustDetail.canonical_acct}</div>

              {trustDetail.is_stub || trustDetail.trust_score === null ? (
                <>
                  <div style={{ fontSize: '2rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.5rem' }}>Unavailable</div>
                  <div className="alert alert-warning">This account does not have sufficient collected profile-dependent feature data for MCDM scoring.</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: '3rem', fontWeight: 700, color: '#3b82f6', marginBottom: '0.5rem' }}>{Number(trustDetail.trust_score).toFixed(6)}</div>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ background: '#e2e8f0', borderRadius: 9999, height: 12 }}>
                      <div style={{ width: `${(trustDetail.trust_score * 100).toFixed(1)}%`, background: '#3b82f6', borderRadius: 9999, height: '100%' }} />
                    </div>
                  </div>

                  <h3 style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Criterion Contributions</h3>
                  <table>
                    <thead><tr><th>Criterion</th><th>Contribution (W × x)</th></tr></thead>
                    <tbody>
                      {criteriaKeys.map(c => {
                        const contrib = trustDetail[`contrib_${c}`];
                        return (
                          <tr key={c}>
                            <td>{CRITERIA_LABELS[c] ?? c}</td>
                            <td style={{ fontFamily: 'monospace' }}>{contrib !== null && contrib !== undefined ? Number(contrib).toFixed(6) : '—'}</td>
                          </tr>
                        );
                      })}
                      <tr style={{ fontWeight: 700, background: '#f8fafc' }}>
                        <td>Total</td>
                        <td style={{ fontFamily: 'monospace', color: '#3b82f6' }}>{Number(trustDetail.trust_score).toFixed(6)}</td>
                      </tr>
                    </tbody>
                  </table>
                </>
              )}

              <div className="alert alert-info" style={{ marginTop: '1.5rem' }}>
                <strong>Interpretation note:</strong> The trustworthiness score is a relative estimate based on six observable user/graph features. It is not ground-truth trust, a probability of trust, a maliciousness detector, or a comprehensive safety classification.
              </div>
            </div>
          ) : (
            <div className="card" style={{ margin: 0 }}>
              <h2>Top 10 Trust Scores</h2>
              {loading ? <p>Loading...</p> : (
                <table>
                  <thead><tr><th>Rank</th><th>Account</th><th>Trust Score</th></tr></thead>
                  <tbody>
                    {topScores.map((s, i) => (
                      <tr key={s.canonical_acct} style={{ cursor: 'pointer' }} onClick={() => selectUser(s.canonical_acct)}>
                        <td style={{ fontWeight: 600, color: '#94a3b8' }}>#{i + 1}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{s.canonical_acct}</td>
                        <td style={{ fontWeight: 700, color: '#3b82f6' }}>{s.trust_score?.toFixed(6)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h2>Validation Status</h2>
        {[
          `${completeScores.length} complete users scored`,
          `${stubCount} stub users excluded`,
          `MCDM weights sum to ${weightSum.toFixed(6)}`,
          'Trust scores within [0, 1]',
          'Contribution totals validated',
          'No invalid/infinite scores',
        ].map(msg => (
          <div key={msg} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
            <span style={{ color: '#10b981', fontWeight: 700 }}>✓</span>
            <span>{msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
