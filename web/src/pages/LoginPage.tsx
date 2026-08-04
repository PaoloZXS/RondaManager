import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSupabaseClient } from '../services/supabase';
import './LoginPage.css';

const SUPERUSER_PASSWORD = 'admin123';
const DEFAULT_PASSWORD = '00000';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [mostraCambioPwd, setMostraCambioPwd] = useState(false);
  const [nuovaPwd, setNuovaPwd] = useState('');
  const [confermaPwd, setConfermaPwd] = useState('');
  const [mostraBloccato, setMostraBloccato] = useState(false);
  const [mostraSuccesso, setMostraSuccesso] = useState(false);
  const [mostraPwdLogin, setMostraPwdLogin] = useState(false);
  const [mostraNuovaPwd, setMostraNuovaPwd] = useState(false);
  const [mostraConfermaPwd, setMostraConfermaPwd] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const saved = sessionStorage.getItem('login_username');
    if (saved) {
      setUsername(saved);
      sessionStorage.removeItem('login_username');
    }
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password === SUPERUSER_PASSWORD) {
      const now = new Date().toISOString();
      localStorage.setItem('auth', 'true');
      localStorage.setItem('is_superuser', 'true');
      localStorage.setItem('username', 'Admin');
      localStorage.setItem('login_time', now);
      localStorage.setItem('last_activity', now);
      navigate('/');
      return;
    }

    if (!username.trim()) {
      setError('Inserisci il nome utente');
      return;
    }

    const supabase = getSupabaseClient();
    const { data: utente } = await supabase
      .from('utenti')
      .select('*')
      .eq('username', username.trim())
      .single();

    if (!utente) {
      setError('Utente non trovato');
      return;
    }

    if (utente.bloccato) {
      setMostraBloccato(true);
      return;
    }

    if (utente.password !== password) {
      setError('Password errata');
      return;
    }

    if (password === DEFAULT_PASSWORD && !utente.password_modificata) {
      setMostraCambioPwd(true);
      return;
    }

    const now = new Date().toISOString();
    localStorage.setItem('auth', 'true');
    localStorage.setItem('username', utente.username);
    localStorage.setItem('login_time', now);
    localStorage.setItem('last_activity', now);
    navigate('/');
  }

  async function handleCambioPassword() {
    if (nuovaPwd.length < 4) {
      setError('La password deve essere almeno 4 caratteri');
      return;
    }
    if (nuovaPwd !== confermaPwd) {
      setError('Le password non coincidono');
      return;
    }

    const supabase = getSupabaseClient();
    const { error: err } = await supabase
      .from('utenti')
      .update({ password: nuovaPwd, password_modificata: true })
      .eq('username', username.trim());

    if (err) {
      setError('Errore nel salvataggio');
      return;
    }

    setMostraCambioPwd(false);
    setPassword('');
    setNuovaPwd('');
    setConfermaPwd('');
    setError('');
    sessionStorage.setItem('login_username', username.trim());
    setMostraSuccesso(true);
  }

  if (mostraBloccato) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🚫</div>
            <h2>Accesso Bloccato</h2>
            <p style={{ color: '#666', fontSize: 14, lineHeight: 1.6, marginTop: 16 }}>
              Problemi con l'avvio del software.<br />
              Per maggiori informazioni, contatta il fornitore del software.
            </p>
            <button onClick={() => { setMostraBloccato(false); setUsername(''); setPassword(''); }}
              className="btn-primary" style={{ width: 'auto', padding: '10px 24px' }}>
              OK
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mostraCambioPwd) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-icon">🔑</div>
          <h1>Cambio Password</h1>
          <p style={{ color: '#666', marginBottom: 20, fontSize: 14, textAlign: 'center' }}>
            Prima di continuare, imposta una nuova password per l'utente <strong>{username}</strong>
          </p>
          <form onSubmit={(e) => { e.preventDefault(); handleCambioPassword(); }}>
            <div className="form-group">
              <label>Nuova Password</label>
              <div style={{ position: 'relative' }}>
                <input type={mostraNuovaPwd ? 'text' : 'password'} value={nuovaPwd} onChange={(e) => setNuovaPwd(e.target.value)}
                  placeholder="Inserisci nuova password" autoFocus
                  style={{ width: '100%', paddingRight: 40, boxSizing: 'border-box' }} />
                <span onClick={() => setMostraNuovaPwd(!mostraNuovaPwd)} style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  cursor: 'pointer', userSelect: 'none', fontSize: 18,
                }}>{mostraNuovaPwd ? '👁️' : '👁️‍🗨️'}</span>
              </div>
            </div>
            <div className="form-group">
              <label>Conferma Password</label>
              <div style={{ position: 'relative' }}>
                <input type={mostraConfermaPwd ? 'text' : 'password'} value={confermaPwd} onChange={(e) => setConfermaPwd(e.target.value)}
                  placeholder="Conferma nuova password"
                  style={{ width: '100%', paddingRight: 40, boxSizing: 'border-box' }} />
                <span onClick={() => setMostraConfermaPwd(!mostraConfermaPwd)} style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  cursor: 'pointer', userSelect: 'none', fontSize: 18,
                }}>{mostraConfermaPwd ? '👁️' : '👁️‍🗨️'}</span>
              </div>
            </div>
            {error && <p className="error-text">{error}</p>}
            <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '10px 24px' }}>
              Salva e continua
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <img src="/logo.png?v=2" alt="StrigeKeeper" style={{ width: 200, height: 200, marginBottom: 16 }} />
        <form onSubmit={handleLogin} style={{ marginTop: 24 }}>
          <div className="form-group">
            <label htmlFor="username">Utente</label>
            <input id="username" type="text" value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nome utente" autoFocus={!username} />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div style={{ position: 'relative' }}>
              <input id="password" type={mostraPwdLogin ? 'text' : 'password'} value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Inserisci la password" autoFocus={!!username}
                style={{ width: '100%', paddingRight: 40, boxSizing: 'border-box' }} />
              <span onClick={() => setMostraPwdLogin(!mostraPwdLogin)} style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                cursor: 'pointer', userSelect: 'none', fontSize: 18,
              }}>{mostraPwdLogin ? '👁️' : '👁️‍🗨️'}</span>
            </div>
          </div>
          {error && <p className="error-text">{error}</p>}
          <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '10px 24px' }}>
            Accedi
          </button>
        </form>
      </div>

      {/* Modal successo cambio password */}
      {mostraSuccesso && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1060,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.45)',
        }}>
          <div style={{
            background: '#fff', borderRadius: 12, padding: '32px 36px 24px',
            maxWidth: 400, width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Password Modificata</div>
            <p style={{ fontSize: 14, color: '#555', lineHeight: 1.5, margin: '0 0 20px' }}>
              Password modificata con successo! Accedi con la nuova password.
            </p>
            <button onClick={() => {
              setMostraSuccesso(false);
              setPassword('');
              setNuovaPwd('');
              setConfermaPwd('');
            }} style={{
              padding: '8px 32px', borderRadius: 8, border: 'none',
              background: '#4f46e5', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600,
            }}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
}
