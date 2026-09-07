import { Routes, Route } from 'react-router-dom';
import Sidebar from './Sidebar';
import Dashboard from './pages/Dashboard';
import DataLayer from './pages/DataLayer';
import SocialGraph from './pages/SocialGraph';
import Features from './pages/Features';
import TrustMCDM from './pages/TrustMCDM';

export default function App() {
  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/data" element={<DataLayer />} />
          <Route path="/graph" element={<SocialGraph />} />
          <Route path="/features" element={<Features />} />
          <Route path="/trust" element={<TrustMCDM />} />
        </Routes>
      </main>
    </div>
  );
}
