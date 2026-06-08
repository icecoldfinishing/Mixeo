import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Mp3Crud } from './components/Mp3Crud';

const NavLink: React.FC<{ to: string; children: React.ReactNode }> = ({ to, children }) => {
  const location = useLocation();
  const active = location.pathname === to;
  return (
    <Link
      to={to}
      style={{
        padding: '5px 12px',
        borderRadius: 6,
        fontSize: 13,
        fontWeight: 500,
        textDecoration: 'none',
        color: active ? '#e8e6e1' : '#555',
        background: active ? 'rgba(255,255,255,0.06)' : 'transparent',
        border: active ? '0.5px solid rgba(255,255,255,0.1)' : '0.5px solid transparent',
        transition: 'color 0.15s, background 0.15s',
      }}
    >
      {children}
    </Link>
  );
};

const PlaylistsPage: React.FC = () => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: 12,
    color: '#333',
  }}>
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" aria-hidden="true">
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
      <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
      <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
    <p style={{ fontSize: 13, color: '#444' }}>Le module de playlists sera intégré ici.</p>
  </div>
);

const AppInner: React.FC = () => (
  <div style={s.root}>
    <nav style={s.nav}>
      <div style={s.brand}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e8e6e1" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
          <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
        </svg>
        <span style={s.brandName}>Mixeo</span>
      </div>
      <div style={s.navLinks}>
        <NavLink to="/">Bibliothèque</NavLink>
        <NavLink to="/playlists">Playlists</NavLink>
      </div>
    </nav>
    <main style={s.main}>
      <Routes>
        <Route path="/" element={<Mp3Crud />} />
        <Route path="/playlists" element={<PlaylistsPage />} />
      </Routes>
    </main>
  </div>
);

function App() {
  return (
    <Router>
      <AppInner />
    </Router>
  );
}

export default App;

const s: Record<string, React.CSSProperties> = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: '#0d0d0d',
    fontFamily: "'DM Sans', system-ui, sans-serif",
    color: '#e8e6e1',
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 20px',
    borderBottom: '0.5px solid rgba(255,255,255,0.08)',
    flexShrink: 0,
    backgroundColor: '#0d0d0d',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 9,
  },
  brandName: {
    fontSize: 14,
    fontWeight: 500,
    letterSpacing: '-0.01em',
    color: '#e8e6e1',
  },
  navLinks: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  main: {
    flex: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
};