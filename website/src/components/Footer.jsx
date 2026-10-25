import React from 'react';
import { PROJECT_METADATA } from '../data/projectData';

export default function Footer({ setActiveTab }) {
  const handleNav = (tab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-col">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div className="brand-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
              </div>
              <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{PROJECT_METADATA.shortTitle}</h3>
            </div>
            <p style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
              A six-layer research framework for trustworthy, explainable, and diversity-aware social recommendations in online social networks, implemented and empirically validated on bounded real-world Mastodon data.
            </p>
          </div>

          <div className="footer-col">
            <h4>Project Structure</h4>
            <ul className="footer-links">
              <li><button onClick={() => handleNav('problem')} className="footer-link" style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}>Problem Statement</button></li>
              <li><button onClick={() => handleNav('methodology')} className="footer-link" style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}>Six-Layer Pipeline</button></li>
              <li><button onClick={() => handleNav('datasets')} className="footer-link" style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}>Datasets &amp; Benchmarks</button></li>
              <li><button onClick={() => handleNav('progress')} className="footer-link" style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}>Milestone Tracker</button></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Resources &amp; Portal</h4>
            <ul className="footer-links">
              <li><button onClick={() => handleNav('documentation')} className="footer-link" style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}>Setup Instructions</button></li>
              <li><button onClick={() => handleNav('documentation')} className="footer-link" style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}>REST API Reference</button></li>
              <li><button onClick={() => handleNav('documentation')} className="footer-link" style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}>Ethics &amp; Disclosures</button></li>
              <li><button onClick={() => handleNav('livedemo')} className="footer-link" style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}>View Demo</button></li>
              <li><button onClick={() => handleNav('team')} className="footer-link" style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}>Team &amp; Supervisor</button></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>External Links</h4>
            <ul className="footer-links">
              <li>
                <a href={PROJECT_METADATA.liveAppUrl} target="_blank" rel="noopener noreferrer" className="footer-link">
                  Live Vercel Frontend ↗
                </a>
              </li>
              <li>
                <a href="https://joinmastodon.org/" target="_blank" rel="noopener noreferrer" className="footer-link">
                  Mastodon Fediverse ↗
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
