import { NavLink } from 'react-router-dom';

export default function Sidebar() {
  return (
    <div className="sidebar">
      <h1>CBT-Rec</h1>
      <nav>
        <div className="nav-section">
          <NavLink to="/" end className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
            Dashboard
          </NavLink>
        </div>
        <div className="nav-section">
          <div className="nav-label">Pipeline</div>
          <NavLink to="/data" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
            Data Layer
          </NavLink>
          <NavLink to="/graph" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
            Social Graph
          </NavLink>
          <NavLink to="/features" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
            Features
          </NavLink>
          <NavLink to="/trust" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
            Trust &amp; MCDM
          </NavLink>
        </div>
        <div className="nav-section">
          <div className="nav-label">Next</div>
          <span className="nav-link disabled">
            Recommendation Engine
            <br />
            <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>Coming Next</span>
          </span>
        </div>
      </nav>
    </div>
  );
}
