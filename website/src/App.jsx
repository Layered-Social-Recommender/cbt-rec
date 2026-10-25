import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './components/Home';
import ProblemObjectives from './components/ProblemObjectives';
import Methodology from './components/Methodology';
import DatasetsExperiments from './components/DatasetsExperiments';
import ProgressTimeline from './components/ProgressTimeline';
import Documentation from './components/Documentation';
import Team from './components/Team';
import GitHubSection from './components/GitHubSection';
import NetworkBackground from './components/NetworkBackground';
import LiveDemo from './components/LiveDemo';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');

  // Handle browser hash navigation if present (e.g. #methodology)
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (['home', 'problem', 'methodology', 'datasets', 'progress', 'documentation', 'livedemo', 'team', 'github'].includes(hash)) {
        setActiveTab(hash);
      } else if (hash === 'demos') {
        setActiveTab('livedemo');
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    window.location.hash = tab;
  };

  return (
    <div className="portal-app" style={{ position: 'relative', minHeight: '100vh', overflowX: 'hidden' }}>
      <NetworkBackground />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <Navbar activeTab={activeTab} setActiveTab={handleTabChange} />

      <main>
        {activeTab === 'home' && <Home setActiveTab={handleTabChange} />}
        {activeTab === 'problem' && <ProblemObjectives />}
        {activeTab === 'methodology' && <Methodology />}
        {activeTab === 'datasets' && <DatasetsExperiments />}
        {activeTab === 'progress' && <ProgressTimeline />}
        {activeTab === 'documentation' && <Documentation />}
        {activeTab === 'livedemo' && <LiveDemo />}
        {activeTab === 'team' && <Team />}
        {activeTab === 'github' && <GitHubSection />}
      </main>

        <Footer setActiveTab={handleTabChange} />
      </div>
    </div>
  );
}
