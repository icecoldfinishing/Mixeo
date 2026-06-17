import React from 'react';
import { FiUser } from "react-icons/fi";
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Mp3Crud } from './components/Mp3Crud';
import { PlaylistBuilder } from './components/PlayListBuilder';
import { Auth } from './components/Auth';

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

interface UserState {
  id: number;
  username: string;
}

const AppInner: React.FC = () => {
  const [user, setUser] = React.useState<UserState | null>(() => {
    const saved = localStorage.getItem('mixeo_user');
    return saved ? JSON.parse(saved) : null;
  });

  const handleLoginSuccess = (loggedInUser: UserState) => {
    setUser(loggedInUser);
    localStorage.setItem('mixeo_user', JSON.stringify(loggedInUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('mixeo_user');
  };

  if (!user) {
    return <Auth onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div style={s.root}>
      <nav style={s.nav}>
        <div style={s.brand}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e8e6e1" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
            <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
          </svg>
          <span style={s.brandName}>Mixeo</span>
        </div>
        <div style={s.navLinks}>
          <NavLink to="/">Bibliothèque</NavLink>
          <NavLink to="/playlists">Playlists</NavLink>
          <span style={s.userInfo}>
            <FiUser style={{ marginRight: "8px" }} />
            {user.username}
          </span>
          <button onClick={handleLogout} style={s.logoutBtn}>
            Déconnexion
          </button>
        </div>
      </nav>
      <main style={s.main}>
        <Routes>
          <Route path="/" element={<Mp3Crud />} />
          <Route path="/playlists" element={<PlaylistBuilder />} />
        </Routes>
      </main>
    </div>
  );
};

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
  userInfo: {
    fontSize: 13,
    color: '#888',
    marginLeft: 15,
    marginRight: 5,
  },
  logoutBtn: {
    padding: '5px 12px',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 500,
    border: '0.5px solid rgba(255,255,255,0.1)',
    backgroundColor: 'transparent',
    color: '#e8e6e1',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
  main: {
    flex: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
};