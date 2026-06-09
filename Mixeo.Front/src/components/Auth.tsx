import React, { useState } from 'react';

interface AuthProps {
  onLoginSuccess: (user: { id: number; username: string }) => void;
}

export const Auth: React.FC<AuthProps> = ({ onLoginSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('rohy');
  const [password, setPassword] = useState('rohy');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Veuillez remplir tous les champs.');
      return;
    }

    setError(null);
    setLoading(true);

    const url = isRegister 
      ? 'http://localhost:5021/api/auth/register' 
      : 'http://localhost:5021/api/auth/login';

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Une erreur est survenue.');
      }

      if (isRegister) {
        // Login automatique après inscription
        const loginResponse = await fetch('http://localhost:5021/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });

        const loginData = await loginResponse.json();

        if (!loginResponse.ok) {
          throw new Error(loginData.message || 'Connexion automatique échouée.');
        }
        onLoginSuccess(loginData);
      } else {
        onLoginSuccess(data);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur de connexion au serveur.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.container}>
      <div style={s.card}>
        <div style={s.header}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e8e6e1" strokeWidth="1.75" strokeLinecap="round">
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
          <h1 style={s.title}>Mixeo</h1>
          <p style={s.subtitle}>
            {isRegister ? 'Créez votre espace personnel' : 'Connectez-vous à votre espace'}
          </p>
        </div>

        {error && <div style={s.error}>{error}</div>}

        <form onSubmit={handleSubmit} style={s.form}>
          <div style={s.formGroup}>
            <label style={s.label}>Nom d'utilisateur</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={s.input}
              placeholder="e.g. music_lover"
              required
            />
          </div>

          <div style={s.formGroup}>
            <label style={s.label}>Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={s.input}
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" disabled={loading} style={s.button}>
            {loading ? 'Chargement...' : isRegister ? "S'inscrire" : 'Se connecter'}
          </button>
        </form>

        <div style={s.toggle}>
          <span>
            {isRegister ? 'Déjà un compte ?' : 'Pas encore de compte ?'}
          </span>
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setError(null);
            }}
            style={s.toggleBtn}
          >
            {isRegister ? 'Se connecter' : "S'inscrire"}
          </button>
        </div>
      </div>
    </div>
  );
};

const s: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',        // ← Correction principale
    width: '100%',
    background: 'radial-gradient(circle at top left, #1a120b 0%, #0d0d0d 100%)',
  },
  card: {
    width: '380px',
    padding: '40px 36px',
    borderRadius: '16px',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    backdropFilter: 'blur(10px)',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    letterSpacing: '-0.02em',
    color: '#e8e6e1',
    margin: 0,
  },
  subtitle: {
    fontSize: '13px',
    color: '#888',
    margin: 0,
    textAlign: 'center',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '12px',
    color: '#aaa',
    fontWeight: 500,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    padding: '11px 14px',
    color: '#e8e6e1',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  button: {
    backgroundColor: '#e8e6e1',
    color: '#0d0d0d',
    border: 'none',
    borderRadius: '8px',
    padding: '13px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '8px',
    transition: 'opacity 0.2s',
  },
  error: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',   // ← Couleur plus harmonieuse
    border: '1px solid rgba(239, 68, 68, 0.25)',
    borderRadius: '8px',
    padding: '11px 14px',
    color: '#f87171',                           // ← Rouge plus doux
    fontSize: '13px',
    textAlign: 'center',
  },
  toggle: {
    display: 'flex',
    justifyContent: 'center',
    gap: '6px',
    fontSize: '13px',
    color: '#888',
  },
  toggleBtn: {
    background: 'none',
    border: 'none',
    color: '#e8e6e1',
    fontWeight: 500,
    cursor: 'pointer',
    padding: 0,
    textDecoration: 'underline',
  },
};