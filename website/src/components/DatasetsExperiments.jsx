import React, { useState } from 'react';
import { DATASET_CATALOG, ML_BASELINE_RESULTS, TRUST_DIVERSITY_TRADEOFF_RESULTS } from '../data/projectData';
import { MathText } from './MathFormulas';

export default function DatasetsExperiments() {
  const [selectedDatasetTab, setSelectedDatasetTab] = useState('all');
  const [activeExpConfig, setActiveExpConfig] = useState(TRUST_DIVERSITY_TRADEOFF_RESULTS[3]); // Default to Full CBT-Rec

  const filteredDatasets = selectedDatasetTab === 'all'
    ? DATASET_CATALOG
    : selectedDatasetTab === 'primary'
      ? DATASET_CATALOG.filter(d => d.isPrimary)
      : DATASET_CATALOG.filter(d => !d.isPrimary);

  return (
    <div className="section">
      <div className="container">
        {/* Header */}
        <div className="section-header">
          <span className="section-tag">Empirical Grounding</span>
          <h2>Datasets &amp; Experimental Evaluation</h2>
          <p className="section-description">
            Complete documentation of the primary validated Mastodon dataset, benchmark literature networks, and verified offline experimental findings.
          </p>
        </div>

        {/* Section 1: Datasets Catalog */}
        <div style={{ marginBottom: '4.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.75rem', margin: 0 }}>
                Dataset Provenance &amp; Benchmark Catalog
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
                1 primary implemented snapshot + 8 literature reference benchmarks surveyed for cross-domain evaluation.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                onClick={() => setSelectedDatasetTab('all')} 
                className={`btn btn-sm ${selectedDatasetTab === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              >
                All Datasets ({DATASET_CATALOG.length})
              </button>
              <button 
                onClick={() => setSelectedDatasetTab('primary')} 
                className={`btn btn-sm ${selectedDatasetTab === 'primary' ? 'btn-primary' : 'btn-secondary'}`}
              >
                Primary Validated (1)
              </button>
              <button 
                onClick={() => setSelectedDatasetTab('benchmark')} 
                className={`btn btn-sm ${selectedDatasetTab === 'benchmark' ? 'btn-primary' : 'btn-secondary'}`}
              >
                Surveyed Literature (8)
              </button>
            </div>
          </div>

          <div className="grid-3">
            {filteredDatasets.map((ds) => (
              <div 
                key={ds.id} 
                className="card"
                style={{
                  background: ds.isPrimary ? 'linear-gradient(135deg, rgba(16, 26, 46, 0.95) 0%, rgba(14, 30, 56, 0.95) 100%)' : 'var(--bg-card)',
                  borderColor: ds.isPrimary ? 'var(--accent-blue)' : 'var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <h4 style={{ margin: 0, fontSize: '1.15rem', color: ds.isPrimary ? 'var(--accent-blue)' : 'var(--text-primary)' }}>
                      {ds.name}
                    </h4>
                    <span className={`badge ${ds.isPrimary ? 'badge-completed' : 'badge-neutral'}`} style={{ flexShrink: 0, fontSize: '0.7rem' }}>
                      {ds.status}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-indigo)', marginBottom: '0.75rem' }}>
                    {ds.domain}
                  </div>

                  <p style={{ fontSize: '0.85rem', lineHeight: '1.6', marginBottom: '1rem' }}>
                    {ds.purpose}
                  </p>

                  <div style={{ background: 'rgba(7, 11, 20, 0.5)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '0.75rem', marginBottom: '0.75rem', fontSize: '0.8rem' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>Structure:</div>
                    <div style={{ color: 'var(--text-secondary)' }}>{ds.structure}</div>
                  </div>
                </div>

                <div style={{ paddingTop: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)', fontSize: '0.775rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                  Size: {ds.size}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: Experiment 1 - ML Baseline Link Prediction Benchmark */}
        <div style={{ marginBottom: '4.5rem' }}>
          <div className="section-header" style={{ marginBottom: '2rem', textAlign: 'left' }}>
            <span className="section-tag">Experiment 1: Offline Link Prediction</span>
            <h3 style={{ fontSize: '1.75rem', margin: 0 }}>
              Directed LightGCN vs. Machine Learning Baselines
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.5rem' }}>
              Evaluated on bounded Mastodon snapshot (270 nodes, 178 train edges, 21 warm test edges, 15 cold test edges) using macro-averaged ranking metrics across target users. Source: <code style={{ color: 'var(--accent-blue)' }}>ml_baseline_experiments.json</code>.
            </p>
          </div>

          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '22%' }}>Model</th>
                  <th style={{ width: '15%' }}>Architecture Type</th>
                  <th style={{ width: '10%' }}>MRR</th>
                  <th style={{ width: '10%' }}>P@5</th>
                  <th style={{ width: '10%' }}>R@5</th>
                  <th style={{ width: '11%' }}>NDCG@5</th>
                  <th style={{ width: '11%' }}>NDCG@10</th>
                  <th style={{ width: '11%' }}>Key Finding</th>
                </tr>
              </thead>
              <tbody>
                {ML_BASELINE_RESULTS.map((res, i) => (
                  <tr key={i} style={{ background: res.model.includes('Directed LightGCN (L=2)') ? 'rgba(212, 168, 67, 0.12)' : 'transparent' }}>
                    <td style={{ fontWeight: 700, color: res.model.includes('Directed LightGCN') ? 'var(--accent-gold)' : 'var(--text-primary)' }}>
                      {res.model}
                      {res.model.includes('Directed LightGCN (L=2)') && (
                        <span className="badge badge-gold" style={{ marginLeft: '0.5rem', fontSize: '0.65rem' }}>
                          Best Model
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize: '0.825rem', color: 'var(--accent-indigo)' }}>
                      {res.type}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#ffffff' }}>
                      {res.mrr.toFixed(4)}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>
                      {res.p5.toFixed(4)}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>
                      {res.r5.toFixed(4)}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: res.model.includes('Directed LightGCN') ? 'var(--accent-emerald)' : 'inherit' }}>
                      {res.ndcg5.toFixed(4)}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>
                      {res.ndcg10.toFixed(4)}
                    </td>
                    <td style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                      {res.notes}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ background: '#141417', border: '1px solid rgba(212, 168, 67, 0.3)', borderRadius: '8px', padding: '1rem', marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <strong>Empirical Finding:</strong> Directed LightGCN with L=2 layers achieves the highest ranking accuracy across all metrics (MRR: <strong>0.2619</strong>, NDCG@5: <strong>0.3129</strong>, Recall@5: <strong>0.4667</strong>), outperforming In-Degree Popularity by <strong>+22.0% in MRR</strong> and <strong>+24.0% in NDCG@5</strong>, proving the value of asymmetric directed message passing.
          </div>
        </div>

        {/* Section 3: Experiment 2 - Trust vs Diversity Trade-off */}
        <div>
          <div className="section-header" style={{ marginBottom: '2rem', textAlign: 'left' }}>
            <span className="section-tag">Experiment 2: Algorithmic Diversity Evaluation</span>
            <h3 style={{ fontSize: '1.75rem', margin: 0 }}>
              Trust-Diversity Trade-off Across 120 Target Accounts
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.5rem' }}>
              Systematic comparison across 5 configurations on all connected target accounts (<em>K</em> = 10). Source: <code style={{ color: '#ffffff' }}>recommendation_experiments.json</code>.
            </p>
          </div>

          <div className="table-wrapper" style={{ marginBottom: '2rem' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '25%' }}>Configuration</th>
                  <th style={{ width: '12%' }}>Mean Trust</th>
                  <th style={{ width: '13%' }}>Mean Relevance</th>
                  <th style={{ width: '16%' }}>Top-10 Communities</th>
                  <th style={{ width: '16%' }}>Cross-Community %</th>
                  <th style={{ width: '18%' }}>Shannon Entropy</th>
                </tr>
              </thead>
              <tbody>
                {TRUST_DIVERSITY_TRADEOFF_RESULTS.map((row, i) => (
                  <tr 
                    key={i} 
                    onClick={() => setActiveExpConfig(row)}
                    style={{ 
                      cursor: 'pointer',
                      background: activeExpConfig.configuration === row.configuration ? '#1c1c22' : 'transparent' 
                    }}
                  >
                    <td style={{ fontWeight: 700, color: activeExpConfig.configuration === row.configuration ? '#ffffff' : 'var(--text-primary)' }}>
                      {row.configuration}
                      {row.lambda === 0.30 && (
                        <span className="badge badge-gold" style={{ marginLeft: '0.5rem', fontSize: '0.65rem' }}>
                          CBT-Rec Default
                        </span>
                      )}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                      {row.meanTrust.toFixed(4)}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>
                      {row.meanRelevance.toFixed(4)}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: row.topKCommunities > 5 ? 'var(--accent-emerald)' : 'inherit', fontWeight: 600 }}>
                      {row.topKCommunities.toFixed(2)}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: row.lambda > 0 ? 'var(--accent-emerald)' : 'inherit', fontWeight: 600 }}>
                      {row.crossCommunityRatio}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>
                      {row.shannonEntropy.toFixed(3)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Interactive Configuration Deep-Dive Card */}
          <div className="card" style={{ background: 'linear-gradient(135deg, rgba(16, 26, 46, 0.95) 0%, rgba(13, 21, 39, 0.95) 100%)', borderColor: 'var(--accent-blue)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span className="section-tag" style={{ margin: 0 }}>
                Selected Configuration Analysis
              </span>
              <span className="badge badge-in-progress">
                λ = {activeExpConfig.lambda.toFixed(2)}
              </span>
            </div>

            <h4 style={{ fontSize: '1.4rem', color: '#ffffff', marginBottom: '0.5rem' }}>
              {activeExpConfig.configuration}
            </h4>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--accent-indigo)', marginBottom: '1.25rem' }}>
              Weights: <MathText text={activeExpConfig.weights} />
            </div>

            <div className="grid-3" style={{ gap: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ background: 'rgba(7, 11, 20, 0.6)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Average Trustworthiness</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-blue)', fontFamily: 'var(--font-mono)' }}>
                  {activeExpConfig.meanTrust.toFixed(4)}
                </div>
              </div>

              <div style={{ background: 'rgba(7, 11, 20, 0.6)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Communities in Top-10</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-emerald)', fontFamily: 'var(--font-mono)' }}>
                  {activeExpConfig.topKCommunities.toFixed(2)}
                </div>
              </div>

              <div style={{ background: 'rgba(7, 11, 20, 0.6)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Outside Community Reach</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-purple)', fontFamily: 'var(--font-mono)' }}>
                  {activeExpConfig.crossCommunityRatio}
                </div>
              </div>
            </div>

            <div style={{ fontSize: '0.925rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              <strong>Key Evaluation Takeaway:</strong> {activeExpConfig.takeaway}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
