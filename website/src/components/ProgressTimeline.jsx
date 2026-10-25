import React, { useState } from 'react';
import { PROJECT_MILESTONES } from '../data/projectData';

export default function ProgressTimeline() {
  const [filter, setFilter] = useState('All');

  const filteredMilestones = filter === 'All'
    ? PROJECT_MILESTONES
    : PROJECT_MILESTONES.filter(m => m.status.toLowerCase() === filter.toLowerCase());

  const completedCount = PROJECT_MILESTONES.filter(m => m.status === 'Completed').length;
  const inProgressCount = PROJECT_MILESTONES.filter(m => m.status === 'In Progress').length;
  const plannedCount = PROJECT_MILESTONES.filter(m => m.status === 'Planned').length;

  return (
    <div className="section">
      <div className="container">
        {/* Header */}
        <div className="section-header">
          <span className="section-tag">Development Lifecycle</span>
          <h2>Project Progress &amp; Milestone Roadmap</h2>
          <p className="section-description">
            A chronological record of achieved deliverables, verified repository evidence, and scheduled project milestones.
          </p>
        </div>

        {/* Milestone Summary Ribbon */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '3rem' }}>
          <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Milestones</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-display)' }}>
              {PROJECT_MILESTONES.length}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>End-to-End Scope</div>
          </div>

          <div className="card" style={{ padding: '1.25rem', textAlign: 'center', borderColor: 'rgba(52, 211, 153, 0.3)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Completed &amp; Validated</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-emerald)', fontFamily: 'var(--font-display)' }}>
              {completedCount}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)' }}>Verified by Tests</div>
          </div>

          <div className="card" style={{ padding: '1.25rem', textAlign: 'center', borderColor: 'rgba(212, 168, 67, 0.35)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Active / In Progress</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-display)' }}>
              {inProgressCount}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#e4e4e7' }}>Cloud Deployment</div>
          </div>

          <div className="card" style={{ padding: '1.25rem', textAlign: 'center', borderColor: 'rgba(192, 132, 252, 0.3)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Planned Deliverables</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-purple)', fontFamily: 'var(--font-display)' }}>
              {plannedCount}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--accent-purple)' }}>Defense &amp; Extension</div>
          </div>
        </div>

        {/* Filter Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.4rem', margin: 0 }}>
            Chronological Timeline
          </h3>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {['All', 'Completed', 'In Progress', 'Planned'].map((st) => (
              <button
                key={st}
                onClick={() => setFilter(st)}
                className={`btn btn-sm ${filter === st ? 'btn-primary' : 'btn-secondary'}`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Visual Timeline */}
        <div className="timeline">
          {filteredMilestones.map((m, idx) => {
            const statusClass = m.status === 'Completed' 
              ? 'completed' 
              : m.status === 'In Progress' 
                ? 'in-progress' 
                : 'planned';

            return (
              <div key={m.id} className="timeline-item">
                <div className={`timeline-marker ${statusClass}`}>
                  {m.status === 'Completed' ? '✓' : idx + 1}
                </div>

                <div className="timeline-card">
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-indigo)', marginBottom: '0.25rem' }}>
                        {m.phase} · {m.period}
                      </div>
                      <h4 style={{ margin: 0, fontSize: '1.25rem', color: '#ffffff' }}>
                        {m.title}
                      </h4>
                    </div>
                    <span className={`badge badge-${statusClass}`}>
                      {m.status}
                    </span>
                  </div>

                  <p style={{ fontSize: '0.925rem', lineHeight: '1.7', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                    {m.deliverables}
                  </p>

                  <div style={{ background: 'rgba(7, 11, 20, 0.6)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '0.65rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <strong>Repository Evidence:</strong> <code style={{ color: 'var(--accent-blue)' }}>{m.verifiedEvidence}</code>
                    </div>
                    <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-emerald)' }}>
                      {m.status === 'Completed' ? 'Verified in git history' : 'Scheduled on roadmap'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
