import React from 'react';
import { TEAM_MEMBERS, FACULTY_SUPERVISOR } from '../data/projectData';

export default function Team() {
  return (
    <div className="section">
      <div className="container">
        {/* Header */}
        <div className="section-header">
          <span className="section-tag">Project Authors &amp; Guidance</span>
          <h2>Team Details &amp; Faculty Supervision</h2>
          <p className="section-description">
            Final Year B.Tech Computer Science &amp; Engineering project team and supervisory guidance.
          </p>
        </div>

        {/* Project Context Pill Ribbon: TEAM NO: 30 & TAG: Network systems and security */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          justifyContent: 'center',
          marginBottom: '3rem'
        }}>
          <div style={{
            background: '#141417',
            border: '1px solid rgba(212, 168, 67, 0.4)',
            borderRadius: '999px',
            padding: '0.45rem 1.35rem',
            fontSize: '0.875rem',
            color: '#ffffff',
            fontFamily: 'var(--font-mono)',
            boxShadow: '0 2px 10px rgba(0,0,0,0.5)'
          }}>
            <strong style={{ color: 'var(--accent-gold)' }}>TEAM NO :</strong> 30
          </div>
          <div style={{
            background: '#141417',
            border: '1px solid rgba(212, 168, 67, 0.4)',
            borderRadius: '999px',
            padding: '0.45rem 1.35rem',
            fontSize: '0.875rem',
            color: '#ffffff',
            fontFamily: 'var(--font-mono)',
            boxShadow: '0 2px 10px rgba(0,0,0,0.5)'
          }}>
            <strong style={{ color: 'var(--accent-gold)' }}>TAG :</strong> Network systems and security
          </div>
        </div>

        {/* Faculty Supervisor Card */}
        <div style={{ marginBottom: '3.5rem' }}>
          <h3 style={{ fontSize: '1.35rem', marginBottom: '1.25rem', color: '#ffffff', letterSpacing: '0.02em' }}>
            Faculty Project Supervisor
          </h3>

          <div className="card" style={{
            background: '#141417',
            border: '1px solid rgba(212, 168, 67, 0.35)',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h4 style={{ fontSize: '1.45rem', color: '#ffffff', margin: '0 0 0.35rem 0', fontWeight: 600 }}>
                  {FACULTY_SUPERVISOR.name}
                </h4>
                <div style={{ color: '#e4e4e7', fontSize: '0.95rem', fontWeight: 500, marginBottom: '0.25rem' }}>
                  {FACULTY_SUPERVISOR.designation}
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  {FACULTY_SUPERVISOR.department} · {FACULTY_SUPERVISOR.institution}
                </div>
              </div>
              <span className="badge badge-gold" style={{ fontSize: '0.8rem', padding: '0.4rem 1rem' }}>
                Project Guide
              </span>
            </div>
          </div>
        </div>

        {/* Student Team Cards */}
        <div>
          <h3 style={{ fontSize: '1.35rem', marginBottom: '1.25rem', color: '#ffffff', letterSpacing: '0.02em' }}>
            Team Members
          </h3>

          <div className="grid-2" style={{ gap: '1.5rem' }}>
            {TEAM_MEMBERS.map((member, idx) => (
              <div 
                key={member.id} 
                className="card" 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'center',
                  background: '#141417',
                  border: '1px solid rgba(212, 168, 67, 0.22)',
                  transition: 'all 0.25s ease',
                  padding: '1.75rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                  <span style={{ 
                    fontSize: '0.75rem', 
                    fontFamily: 'var(--font-mono)', 
                    color: '#e4e4e7',
                    background: '#18181b',
                    border: '1px solid rgba(212, 168, 67, 0.3)',
                    padding: '0.2rem 0.65rem',
                    borderRadius: '4px',
                    fontWeight: 600
                  }}>
                    Member 0{idx + 1}
                  </span>
                </div>

                <h4 style={{ fontSize: '1.35rem', color: '#ffffff', margin: '0 0 0.4rem 0', fontWeight: 600 }}>
                  {member.name}
                </h4>

                <div style={{ 
                  fontFamily: 'var(--font-mono)', 
                  fontSize: '0.95rem', 
                  color: '#d4d4d8', 
                  letterSpacing: '0.04em'
                }}>
                  {member.rollNumber}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
