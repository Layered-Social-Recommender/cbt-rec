import React from 'react';
import { PROBLEM_LIMITATIONS, PROJECT_OBJECTIVES } from '../data/projectData';

export default function ProblemObjectives() {
  return (
    <div className="section">
      <div className="container">
        {/* Header */}
        <div className="section-header">
          <span className="section-tag">Research Scope &amp; Foundations</span>
          <h2>Problem Statement &amp; Project Objectives</h2>
          <p className="section-description">
            Addressing fundamental structural and ethical flaws in existing social recommendation algorithms: popularity bias, echo-chamber entrapment, lack of trust verification, and opacity.
          </p>
        </div>

        {/* Section 1: Problem Statement */}
        <div style={{ marginBottom: '4.5rem' }}>
          <div className="card" style={{ background: '#141417', border: '1px solid rgba(212, 168, 67, 0.35)', marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <span className="badge badge-gold">Problem Formulation</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>OSN Account Recommendation</span>
            </div>
            
            <h3 style={{ fontSize: '1.75rem', color: '#ffffff', marginBottom: '1rem' }}>
              The Social Link Recommendation Dilemma in Decentralized Networks
            </h3>
            
            <p style={{ fontSize: '1.05rem', lineHeight: '1.8', color: 'var(--text-secondary)' }}>
              Online Social Networks (OSNs) connect millions of individuals, but contemporary account recommendation mechanisms remain fundamentally brittle. Recommending an account is fundamentally distinct from recommending an e-commerce product or movie: connecting establishes an asymmetric communication pathway that exposes users to information cascades, potential manipulation, and social echo chambers.
            </p>

            <div style={{ background: '#101014', borderLeft: '3px solid var(--accent-gold)', borderRadius: '4px 8px 8px 4px', padding: '1.25rem 1.5rem', margin: '1.5rem 0', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#ffffff', fontWeight: 600, marginBottom: '0.5rem' }}>
                Mathematical Graph Formulation:
              </div>
              <p style={{ margin: 0, fontSize: '0.92rem', color: '#e2e8f0', lineHeight: '1.7', fontFamily: 'Georgia, "Times New Roman", serif' }}>
                Let <span style={{ fontStyle: 'italic' }}>G</span> = (<span style={{ fontStyle: 'italic' }}>V</span>, <span style={{ fontStyle: 'italic' }}>E</span><sub>follow</sub>, <span style={{ fontStyle: 'italic' }}>E</span><sub>int</sub>) be a social network where <span style={{ fontStyle: 'italic' }}>V</span> is the set of observed accounts (|<span style={{ fontStyle: 'italic' }}>V</span>| = 270), <span style={{ fontStyle: 'italic' }}>E</span><sub>follow</sub> is the set of directed follow edges (|<span style={{ fontStyle: 'italic' }}>E</span><sub>follow</sub>| = 214), and <span style={{ fontStyle: 'italic' }}>E</span><sub>int</sub> is the set of aggregated interaction edges (replies, mentions, reblogs; |<span style={{ fontStyle: 'italic' }}>E</span><sub>int</sub>| = 128).
                <br /><br />
                For target user <span style={{ fontStyle: 'italic' }}>u</span> &isin; <span style={{ fontStyle: 'italic' }}>V</span>, the objective is to produce a ranked Top-<em>K</em> candidate list <span style={{ fontStyle: 'italic' }}>S</span><sub><em>K</em></sub>(<span style={{ fontStyle: 'italic' }}>u</span>) &sub; <span style={{ fontStyle: 'italic' }}>V</span> &setminus; ({'{'}<span style={{ fontStyle: 'italic' }}>u</span>{'}'} &cup; Follows(<span style={{ fontStyle: 'italic' }}>u</span>)) maximizing both candidate relevance and objective trustworthiness, while enforcing community diversity to prevent network balkanization.
              </p>
            </div>

            <p style={{ fontSize: '1rem', lineHeight: '1.7', color: 'var(--text-secondary)' }}>
              Traditional approaches optimize solely for connection likelihood <span style={{ fontStyle: 'italic', fontFamily: 'Georgia, serif' }}>P</span>(follow). Consequently, they trap users within tight homophilic clusters, systematically starve niche authoritative accounts, ignore behavioral red flags (e.g., spamming bots or unreciprocated broadcast accounts), and generate uninterpretable suggestions.
            </p>
          </div>

          {/* Limitations of Conventional Approaches Table / Cards */}
          <h3 style={{ fontSize: '1.4rem', marginBottom: '1.25rem' }}>
            Specific Limitations Addressed by CBT-Rec
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {PROBLEM_LIMITATIONS.map((lim, idx) => (
              <div key={lim.id} className="card" style={{ padding: '1.5rem 2rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--accent-rose)', fontWeight: 700 }}>
                      GAP {idx + 1}
                    </span>
                    <h4 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>
                      {lim.title}
                    </h4>
                  </div>
                  <span className="badge badge-completed">CBT-Rec Solution Verified</span>
                </div>

                <div className="grid-2" style={{ gap: '1.5rem', marginTop: '0.75rem' }}>
                  <div style={{ background: 'rgba(244, 63, 94, 0.05)', border: '1px solid rgba(244, 63, 94, 0.15)', borderRadius: '8px', padding: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-rose)', marginBottom: '0.35rem' }}>
                      Conventional Approach Flaw
                    </div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                      {lim.problem}
                    </div>
                  </div>

                  <div style={{ background: 'rgba(52, 211, 153, 0.05)', border: '1px solid rgba(52, 211, 153, 0.15)', borderRadius: '8px', padding: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-emerald)', marginBottom: '0.35rem' }}>
                      CBT-Rec Architectural Resolution
                    </div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                      {lim.cbtRecSolution}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: Concrete Project Objectives */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <span className="section-tag">Target Outcomes</span>
              <h3 style={{ fontSize: '1.75rem', margin: 0 }}>
                Formal Project Objectives &amp; Delivery Status
              </h3>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <span className="badge badge-completed">5 Completed</span>
              <span className="badge badge-planned">2 Planned Extensions</span>
            </div>
          </div>

          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '8%' }}>ID</th>
                  <th style={{ width: '22%' }}>Objective</th>
                  <th style={{ width: '40%' }}>Description</th>
                  <th style={{ width: '15%' }}>Status</th>
                  <th style={{ width: '15%' }}>Repository Evidence</th>
                </tr>
              </thead>
              <tbody>
                {PROJECT_OBJECTIVES.map((obj) => (
                  <tr key={obj.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent-blue)' }}>
                      {obj.id.toUpperCase()}
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {obj.title}
                    </td>
                    <td style={{ lineHeight: '1.6' }}>
                      {obj.description}
                    </td>
                    <td>
                      <span className={`badge ${obj.status === 'Completed' ? 'badge-completed' : 'badge-planned'}`}>
                        {obj.status}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {obj.evidence}
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
