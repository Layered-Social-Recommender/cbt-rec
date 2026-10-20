import { useState, useEffect } from 'react';
import { fetchRecommendationTargets, fetchRecommendations, fetchCustomRecommendations } from '../api';

const DEFAULT_HEURISTIC_WEIGHTS = {
  relevance: 0.40,
  trust: 0.30,
  context: 0.15,
  behaviour: 0.15,
};

const DEFAULT_HYBRID_WEIGHTS = {
  gcn: 0.35,
  trust: 0.30,
  proximity: 0.10,
  context: 0.15,
  behaviour: 0.10,
};

/**
 * formatSnapshotDate(ts)
 * Safely format a timestamp string for display.
 * Handles:
 *   - null / undefined  → 'Date unavailable'
 *   - doubly-suffixed DB strings like '...+00:00Z' → strip extra '+00:00' then parse
 *   - already-valid ISO-8601 Z strings → parse directly
 *   - anything else that produces an invalid Date → 'Date unavailable'
 */
function formatSnapshotDate(ts) {
  if (!ts) return 'Date unavailable';
  // Normalise doubly-suffixed timestamps stored by older precomputed runs.
  let normalised = ts.replace(/\+00:00Z$/, 'Z').replace(/\+00:00$/, 'Z');
  const d = new Date(normalised);
  if (isNaN(d.getTime())) return 'Date unavailable';
  return d.toLocaleString();
}

export default function Recommendations() {
  const [targets, setTargets] = useState([]);
  const [selectedTarget, setSelectedTarget] = useState('Mastodon@mastodon.social');
  const [scoringMode, setScoringMode] = useState('heuristic');
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState(null);

  // Configuration sliders
  const [weights, setWeights] = useState(DEFAULT_HEURISTIC_WEIGHTS);
  const [diversityLambda, setDiversityLambda] = useState(0.30);
  const [topK, setTopK] = useState(10);
  const [showConfig, setShowConfig] = useState(false);

  // Load target options on mount
  useEffect(() => {
    let isMounted = true;
    fetchRecommendationTargets()
      .then(data => {
        if (!isMounted) return;
        if (Array.isArray(data)) {
          setTargets(data);
          if (data.length > 0 && !selectedTarget) {
            setSelectedTarget(data[0].canonical_acct);
          }
        }
      })
      .catch(err => {
        console.error('Failed to load recommendation targets', err);
      });

    return () => { isMounted = false; };
  }, []);

  // Load recommendations when selectedTarget or scoringMode changes
  useEffect(() => {
    if (!selectedTarget) return;
    let isMounted = true;
    setLoading(true);
    setError(null);

    fetchRecommendations(selectedTarget, scoringMode)
      .then(data => {
        if (!isMounted) return;
        if (data.error) {
          setError(data.error);
        } else {
          setRecommendations(data);
        }
        setLoading(false);
      })
      .catch(err => {
        if (!isMounted) return;
        setError(err.message || 'Failed to fetch recommendations');
        setLoading(false);
      });

    return () => { isMounted = false; };
  }, [selectedTarget, scoringMode]);

  const handleModeChange = (newMode) => {
    setScoringMode(newMode);
    if (newMode === 'hybrid_lightgcn') {
      setWeights(DEFAULT_HYBRID_WEIGHTS);
    } else {
      setWeights(DEFAULT_HEURISTIC_WEIGHTS);
    }
  };

  const handleApplyCustom = async () => {
    setCalculating(true);
    setError(null);
    try {
      const res = await fetchCustomRecommendations({
        target_acct: selectedTarget,
        scoring_mode: scoringMode,
        weights: weights,
        diversity_lambda: diversityLambda,
        top_k: topK,
      });
      if (res.error) {
        setError(res.error);
      } else {
        setRecommendations(res);
      }
    } catch (err) {
      setError(err.message || 'Error computing custom recommendations');
    } finally {
      setCalculating(false);
    }
  };

  const handleResetDefaults = () => {
    if (scoringMode === 'hybrid_lightgcn') {
      setWeights(DEFAULT_HYBRID_WEIGHTS);
    } else {
      setWeights(DEFAULT_HEURISTIC_WEIGHTS);
    }
    setDiversityLambda(0.30);
    setTopK(10);
  };

  // Derive target metadata
  const currentTargetMeta = targets.find(t => t.canonical_acct === selectedTarget);

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 600, color: '#171717', margin: 0 }}>
          Account Recommendations (Layer 5 &amp; 6)
        </h1>
        <p style={{ color: '#52525b', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Evaluate and compare trust-aware heuristic ranking against the Directed LightGCN + MCDM trust hybrid model.
        </p>
      </div>

      {/* Target Selector & Algorithm Mode Controls */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Target Account Dropdown */}
          <div style={{ flex: '1 1 260px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#52525b', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
              Select Target Account
            </label>
            <select
              id="target-account-select"
              value={selectedTarget}
              onChange={(e) => setSelectedTarget(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                borderRadius: '4px',
                border: '1px solid #d4d4d8',
                fontSize: '0.9rem',
                backgroundColor: '#ffffff',
                color: '#171717',
              }}
            >
              {targets.map(t => (
                <option key={t.canonical_acct} value={t.canonical_acct}>
                  {t.canonical_acct} (Comm #{t.community_id !== null ? t.community_id : '?'}, Trust: {t.trust_score ? t.trust_score.toFixed(3) : '0.000'})
                </option>
              ))}
            </select>
          </div>

          {/* Scoring Mode Selector */}
          <div style={{ flex: '1 1 260px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#52525b', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
              Scoring Engine Mode
            </label>
            <select
              id="scoring-mode-select"
              value={scoringMode}
              onChange={(e) => handleModeChange(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                borderRadius: '4px',
                border: scoringMode === 'hybrid_lightgcn' ? '1px solid #4f46e5' : '1px solid #d4d4d8',
                fontSize: '0.9rem',
                backgroundColor: scoringMode === 'hybrid_lightgcn' ? '#f5f3ff' : '#ffffff',
                color: scoringMode === 'hybrid_lightgcn' ? '#4338ca' : '#171717',
                fontWeight: 600,
              }}
            >
              <option value="heuristic">Existing Heuristic Engine (Default Baseline)</option>
              <option value="hybrid_lightgcn">LightGCN + Trust Hybrid (Stage 3 Research)</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
            <button
              id="toggle-config-btn"
              onClick={() => setShowConfig(!showConfig)}
              style={{
                padding: '0.55rem 1rem',
                borderRadius: '4px',
                border: '1px solid #d4d4d8',
                backgroundColor: showConfig ? '#f4f4f5' : '#ffffff',
                color: '#171717',
                fontSize: '0.85rem',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              {showConfig ? 'Hide Experiment Controls' : 'Configure Weights & Diversity'}
            </button>
            <button
              id="recalculate-btn"
              onClick={handleApplyCustom}
              disabled={calculating || loading}
              style={{
                padding: '0.55rem 1.25rem',
                borderRadius: '4px',
                border: '1px solid #171717',
                backgroundColor: '#171717',
                color: '#ffffff',
                fontSize: '0.85rem',
                cursor: (calculating || loading) ? 'not-allowed' : 'pointer',
                fontWeight: 500,
                opacity: (calculating || loading) ? 0.7 : 1,
              }}
            >
              {calculating ? 'Re-ranking...' : 'Recalculate'}
            </button>
          </div>
        </div>

        {/* Experiment / Weight Tuning Drawer */}
        {showConfig && (
          <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid #e4e4e7' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#171717' }}>
                  Signal Weights &amp; Diversification Tuning
                </span>
                <span style={{ fontSize: '0.8rem', color: '#71717a', marginLeft: '0.5rem' }}>
                  ({scoringMode === 'hybrid_lightgcn' ? 'Directed LightGCN + MCDM Hybrid' : 'Layer 5 Heuristic Baseline'})
                </span>
              </div>
              <button
                onClick={handleResetDefaults}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#71717a',
                  fontSize: '0.75rem',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                }}
              >
                Reset to Defaults
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
              {scoringMode === 'hybrid_lightgcn' ? (
                <>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                      <span>LightGCN Affinity (w_gcn):</span>
                      <strong>{(weights.gcn ?? 0.35).toFixed(2)}</strong>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={weights.gcn ?? 0.35}
                      onChange={(e) => setWeights({ ...weights, gcn: parseFloat(e.target.value) })}
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                      <span>Trust Weight (w_trust):</span>
                      <strong>{(weights.trust ?? 0.30).toFixed(2)}</strong>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={weights.trust ?? 0.30}
                      onChange={(e) => setWeights({ ...weights, trust: parseFloat(e.target.value) })}
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                      <span>Proximity Weight (w_prox):</span>
                      <strong>{(weights.proximity ?? 0.10).toFixed(2)}</strong>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={weights.proximity ?? 0.10}
                      onChange={(e) => setWeights({ ...weights, proximity: parseFloat(e.target.value) })}
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                      <span>Context Weight (w_ctx):</span>
                      <strong>{(weights.context ?? 0.15).toFixed(2)}</strong>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={weights.context ?? 0.15}
                      onChange={(e) => setWeights({ ...weights, context: parseFloat(e.target.value) })}
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                      <span>Behaviour Weight (w_beh):</span>
                      <strong>{(weights.behaviour ?? 0.10).toFixed(2)}</strong>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={weights.behaviour ?? 0.10}
                      onChange={(e) => setWeights({ ...weights, behaviour: parseFloat(e.target.value) })}
                      style={{ width: '100%' }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                      <span>Relevance Weight (w_rel):</span>
                      <strong>{(weights.relevance ?? 0.40).toFixed(2)}</strong>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={weights.relevance ?? 0.40}
                      onChange={(e) => setWeights({ ...weights, relevance: parseFloat(e.target.value) })}
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                      <span>Trust Weight (w_trust):</span>
                      <strong>{(weights.trust ?? 0.30).toFixed(2)}</strong>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={weights.trust ?? 0.30}
                      onChange={(e) => setWeights({ ...weights, trust: parseFloat(e.target.value) })}
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                      <span>Context Weight (w_ctx):</span>
                      <strong>{(weights.context ?? 0.15).toFixed(2)}</strong>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={weights.context ?? 0.15}
                      onChange={(e) => setWeights({ ...weights, context: parseFloat(e.target.value) })}
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                      <span>Behaviour Weight (w_beh):</span>
                      <strong>{(weights.behaviour ?? 0.15).toFixed(2)}</strong>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={weights.behaviour ?? 0.15}
                      onChange={(e) => setWeights({ ...weights, behaviour: parseFloat(e.target.value) })}
                      style={{ width: '100%' }}
                    />
                  </div>
                </>
              )}

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                  <span>Diversity Lambda (λ):</span>
                  <strong>{diversityLambda.toFixed(2)}</strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={diversityLambda}
                  onChange={(e) => setDiversityLambda(parseFloat(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                  <span>Top-K Results:</span>
                  <strong>{topK}</strong>
                </div>
                <input
                  type="range"
                  min="3"
                  max="20"
                  step="1"
                  value={topK}
                  onChange={(e) => setTopK(parseInt(e.target.value, 10))}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Target Account Summary Banner */}
      {currentTargetMeta && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}>
          <div className="card" style={{ padding: '0.85rem 1.15rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#71717a', textTransform: 'uppercase', fontWeight: 600 }}>Target Community</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#171717', marginTop: '0.2rem' }}>
              #{currentTargetMeta.community_id !== null ? currentTargetMeta.community_id : 'N/A'}
            </div>
          </div>

          <div className="card" style={{ padding: '0.85rem 1.15rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#71717a', textTransform: 'uppercase', fontWeight: 600 }}>MCDM Trust Estimate</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#171717', marginTop: '0.2rem' }}>
              {currentTargetMeta.trust_score ? currentTargetMeta.trust_score.toFixed(4) : 'N/A'}
            </div>
          </div>

          <div className="card" style={{ padding: '0.85rem 1.15rem', borderLeft: scoringMode === 'hybrid_lightgcn' ? '3px solid #6366f1' : '3px solid #10b981' }}>
            <div style={{ fontSize: '0.75rem', color: '#71717a', textTransform: 'uppercase', fontWeight: 600 }}>Active Scoring Engine</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#171717', marginTop: '0.25rem' }}>
              {scoringMode === 'hybrid_lightgcn' ? 'LightGCN + Trust Hybrid' : 'Existing Heuristic'}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.15rem' }}>
              {scoringMode === 'hybrid_lightgcn' ? 'Stage 3 (2-Layer GCN + MCDM)' : 'Layer 5 Baseline'}
            </div>
          </div>

          <div className="card" style={{ padding: '0.85rem 1.15rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#71717a', textTransform: 'uppercase', fontWeight: 600 }}>Engine Version</div>
            <div style={{ fontSize: '0.85rem', color: '#52525b', marginTop: '0.35rem', fontFamily: 'monospace' }}>
              {recommendations?.algorithm_version || (scoringMode === 'hybrid_lightgcn' ? 'CBT-Rec-v1.1-Hybrid-LightGCN-MMR' : 'CBT-Rec-v1.0-Hybrid-MMR')}
            </div>
          </div>

          <div className="card" style={{ padding: '0.85rem 1.15rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#71717a', textTransform: 'uppercase', fontWeight: 600 }}>Active Hyperparameters</div>
            <div style={{ fontSize: '0.85rem', color: '#27272a', marginTop: '0.35rem' }}>
              λ = {recommendations?.diversity_lambda ?? diversityLambda} | K = {recommendations?.top_k ?? topK}
            </div>
          </div>
        </div>
      )}

      {/* Error / Loading States */}
      {loading && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ color: '#71717a', fontSize: '0.95rem' }}>
            Evaluating candidate accounts and computing {scoringMode === 'hybrid_lightgcn' ? 'LightGCN hybrid' : 'heuristic'} rankings...
          </div>
        </div>
      )}

      {error && (
        <div className="card" style={{ borderLeft: '4px solid #dc2626', backgroundColor: '#fef2f2' }}>
          <strong style={{ color: '#991b1b' }}>Recommendation Notice:</strong>
          <div style={{ color: '#b91c1c', marginTop: '0.25rem', fontSize: '0.9rem' }}>{error}</div>
        </div>
      )}

      {/* Recommendations Results List */}
      {!loading && !error && recommendations && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#171717', margin: 0 }}>
              Ranked Account Recommendations ({recommendations.recommendations?.length || 0})
            </h2>
            <div style={{ fontSize: '0.8rem', color: '#71717a' }}>
              Mode: <strong>{recommendations.scoring_mode || scoringMode}</strong> · Snapshot: {formatSnapshotDate(recommendations.timestamp)}
            </div>
          </div>

          {(!recommendations.recommendations || recommendations.recommendations.length === 0) ? (
            <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
              <p style={{ color: '#71717a', margin: 0 }}>
                No candidate accounts could be generated for this user under current constraints.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {recommendations.recommendations.map((rec) => {
                const expl = rec.explanation || {};
                const scores = rec.scores || {};
                const isExploration = rec.is_exploration;
                const isHybridItem = rec.scoring_mode === 'hybrid_lightgcn' || scores.gcn !== undefined;

                return (
                  <div key={rec.candidate_acct} className="card" style={{ padding: '1.25rem' }}>
                    {/* Header: Rank, Account, Overall Score */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.85rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          backgroundColor: '#171717',
                          color: '#ffffff',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                        }}>
                          {rec.rank}
                        </span>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '1.05rem', color: '#171717' }}>
                            {rec.candidate_acct}
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                            <span style={{
                              fontSize: '0.75rem',
                              padding: '0.15rem 0.5rem',
                              borderRadius: '3px',
                              border: '1px solid #e4e4e7',
                              backgroundColor: '#f4f4f5',
                              color: '#27272a',
                            }}>
                              Community #{rec.candidate_community}
                            </span>
                            {isExploration && (
                              <span style={{
                                fontSize: '0.75rem',
                                padding: '0.15rem 0.5rem',
                                borderRadius: '3px',
                                border: '1px solid #171717',
                                backgroundColor: '#171717',
                                color: '#ffffff',
                                fontWeight: 500,
                              }}>
                                Cross-Community Discovery
                              </span>
                            )}
                            {isHybridItem && (
                              <span style={{
                                fontSize: '0.75rem',
                                padding: '0.15rem 0.5rem',
                                borderRadius: '3px',
                                border: '1px solid #818cf8',
                                backgroundColor: '#eef2ff',
                                color: '#4338ca',
                                fontWeight: 500,
                              }}>
                                LightGCN Hybrid
                              </span>
                            )}
                            {rec.is_cold_start_source && (
                              <span style={{
                                fontSize: '0.75rem',
                                padding: '0.15rem 0.5rem',
                                borderRadius: '3px',
                                border: '1px solid #f59e0b',
                                backgroundColor: '#fffbeb',
                                color: '#b45309',
                              }}>
                                Cold-Start Target
                              </span>
                            )}
                            {rec.source_type === '2_hop' && (
                              <span style={{ fontSize: '0.75rem', color: '#71717a' }}>
                                (2-hop follow path)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Overall Composite Score Badge */}
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.75rem', color: '#71717a', textTransform: 'uppercase', fontWeight: 600 }}>Overall Score</div>
                        <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#171717' }}>
                          {rec.overall_score !== undefined ? rec.overall_score.toFixed(4) : '0.0000'}
                        </div>
                      </div>
                    </div>

                    {/* Component Sub-scores Breakdown Bar */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                      gap: '0.75rem',
                      padding: '0.75rem 1rem',
                      backgroundColor: '#fafafa',
                      border: '1px solid #f4f4f5',
                      borderRadius: '4px',
                      marginBottom: '0.85rem',
                    }}>
                      {isHybridItem ? (
                        <>
                          <div>
                            <div style={{ fontSize: '0.7rem', color: '#71717a', textTransform: 'uppercase' }}>
                              LightGCN ({rec.weights?.gcn !== undefined ? rec.weights.gcn : '0.35'})
                            </div>
                            <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#171717' }}>
                              {scores.gcn !== undefined ? scores.gcn.toFixed(3) : '-'}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.7rem', color: '#71717a', textTransform: 'uppercase' }}>
                              Trust ({rec.weights?.trust !== undefined ? rec.weights.trust : '0.30'})
                            </div>
                            <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#171717' }}>
                              {scores.trust !== undefined ? scores.trust.toFixed(3) : '-'}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.7rem', color: '#71717a', textTransform: 'uppercase' }}>
                              Proximity ({rec.weights?.proximity !== undefined ? rec.weights.proximity : '0.10'})
                            </div>
                            <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#171717' }}>
                              {scores.proximity !== undefined ? scores.proximity.toFixed(3) : '-'}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.7rem', color: '#71717a', textTransform: 'uppercase' }}>
                              Context ({rec.weights?.context !== undefined ? rec.weights.context : '0.15'})
                            </div>
                            <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#171717' }}>
                              {scores.context !== undefined ? scores.context.toFixed(3) : '-'}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.7rem', color: '#71717a', textTransform: 'uppercase' }}>
                              Behaviour ({rec.weights?.behaviour !== undefined ? rec.weights.behaviour : '0.10'})
                            </div>
                            <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#171717' }}>
                              {scores.behaviour !== undefined ? scores.behaviour.toFixed(3) : '-'}
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <div style={{ fontSize: '0.7rem', color: '#71717a', textTransform: 'uppercase' }}>
                              Relevance (w={rec.weights?.relevance ?? (weights.relevance ?? 0.40)})
                            </div>
                            <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#171717' }}>
                              {scores.relevance !== undefined ? scores.relevance.toFixed(3) : '-'}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.7rem', color: '#71717a', textTransform: 'uppercase' }}>
                              Trust (w={rec.weights?.trust ?? (weights.trust ?? 0.30)})
                            </div>
                            <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#171717' }}>
                              {scores.trust !== undefined ? scores.trust.toFixed(3) : '-'}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.7rem', color: '#71717a', textTransform: 'uppercase' }}>
                              Context (w={rec.weights?.context ?? (weights.context ?? 0.15)})
                            </div>
                            <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#171717' }}>
                              {scores.context !== undefined ? scores.context.toFixed(3) : '-'}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.7rem', color: '#71717a', textTransform: 'uppercase' }}>
                              Behaviour (w={rec.weights?.behaviour ?? (weights.behaviour ?? 0.15)})
                            </div>
                            <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#171717' }}>
                              {scores.behaviour !== undefined ? scores.behaviour.toFixed(3) : '-'}
                            </div>
                          </div>
                        </>
                      )}

                      {rec.diversity_contribution > 0 && (
                        <div>
                          <div style={{ fontSize: '0.7rem', color: '#71717a', textTransform: 'uppercase' }}>Diversity Novelty</div>
                          <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#171717' }}>
                            +{rec.diversity_contribution.toFixed(2)}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Layer 6 Explanation Card */}
                    <div style={{
                      borderLeft: '3px solid #171717',
                      paddingLeft: '0.85rem',
                      marginTop: '0.5rem',
                    }}>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#171717', marginBottom: '0.35rem' }}>
                        {expl.primary_reason || 'Evidence-based justification:'}
                      </div>

                      {expl.evidence_bullets && expl.evidence_bullets.length > 0 && (
                        <ul style={{ margin: '0 0 0.5rem 1.15rem', padding: 0, fontSize: '0.83rem', color: '#3f3f46', lineHeight: '1.45' }}>
                          {expl.evidence_bullets.map((bullet, idx) => (
                            <li key={idx} style={{ marginBottom: '0.2rem' }}>{bullet}</li>
                          ))}
                        </ul>
                      )}

                      {/* Missing Data Disclosure Notice */}
                      {expl.missing_data_notice && (
                        <div style={{ fontSize: '0.75rem', color: '#71717a', fontStyle: 'italic', marginBottom: '0.25rem' }}>
                          {expl.missing_data_notice}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Research Methodology Footnote */}
      <div className="card" style={{ marginTop: '2rem', backgroundColor: '#fcfcfc', border: '1px solid #e4e4e7' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#171717', margin: '0 0 0.4rem 0' }}>
          Methodological Constraints &amp; Research Disclaimers
        </h3>
        <p style={{ fontSize: '0.82rem', color: '#52525b', lineHeight: '1.6', margin: 0 }}>
          Account recommendations are generated from a bounded, verified research snapshot of Mastodon social data (270 accounts, 214 follow edges). 
          Trust scores represent relative observational estimates derived via multi-criteria decision making (MCDM) over graph reciprocity, activity, influence, 
          and community participation; they do not represent objective moral character or guarantee absolute safety. Missing behavioural or hashtag data 
          is explicitly disclosed rather than falsely imputed as zero.
        </p>
        <p style={{ fontSize: '0.82rem', color: '#52525b', lineHeight: '1.6', margin: '0.5rem 0 0 0' }}>
          <strong>Algorithmic Comparison Notice:</strong> The LightGCN + Trust Hybrid model is provided as an experimental comparative path, not asserted as unconditionally superior. 
          In leak-free offline evaluations, both the Heuristic Baseline and the LightGCN + Trust + MMR Hybrid model achieve an identical macro-averaged NDCG@10 of 0.3653 on warm-start test users (N=5), 
          due to offsetting rank trade-offs across test hits, while MMR community diversification expands unique community coverage from 2.60 to 10.00. 
          For cold-start users (N=15), ranking is driven by learned candidate popularity biases (b_in) and MCDM trust.
        </p>
      </div>
    </div>
  );
}
