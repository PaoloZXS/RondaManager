import { useEffect } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { getSupabaseClient } from '../services/supabase';
import './Layout.css';
import ConfirmDialog from './ConfirmDialog';
import AlertToast from './AlertToast';

const navItems = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/sedi', label: 'Sedi', icon: '🏢' },
  { path: '/punti-controllo', label: 'Punti di controllo', icon: '📍' },
  { path: '/percorsi', label: 'Percorsi Ronde', icon: '🗺️' },
  { path: '/telefoni', label: 'Telefoni', icon: '📱' },
  { path: '/guardie', label: 'Sorveglianti', icon: '👤' },
  { path: '/turni', label: 'Ronde Completate', icon: '🕐' },
  { path: '/archivio', label: 'Ronde Archiviate', icon: '🗂️' },
  { path: '/anomalie', label: 'Anomalie riscontrate', icon: '⚠️' },
  { path: '/impostazioni', label: 'Impostazioni', icon: '⚙️' },
];

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('auth');
    localStorage.removeItem('is_superuser');
    localStorage.removeItem('username');
    localStorage.removeItem('login_time');
    localStorage.removeItem('last_activity');
    navigate('/login');
  };

  const isLoggedIn = localStorage.getItem('auth') === 'true';

  useEffect(() => {
    if (!isLoggedIn && location.pathname !== '/login') {
      navigate('/login', { replace: true });
    }
  }, [isLoggedIn, location.pathname, navigate]);

  // Scadenza sessione: controlla ogni 30s last_activity vs session_timeout_minutes
  useEffect(() => {
    if (!isLoggedIn) return;

    // Legge il timeout sessione (minuti) da Supabase, fallback 480
    let sessionTimeoutMinutes = 480;
    (async () => {
      try {
        const supabase = getSupabaseClient();
        const { data } = await supabase
          .from('impostazioni')
          .select('valore')
          .eq('chiave', 'session_timeout_minutes')
          .maybeSingle();
        if (data) {
          const parsed = parseInt(String(data.valore), 10);
          if (!isNaN(parsed) && parsed > 0) sessionTimeoutMinutes = parsed;
        }
      } catch (_) {}
    })();

    // Aggiorna last_activity a ogni interazione utente
    const aggiornaAttivita = () => {
      localStorage.setItem('last_activity', new Date().toISOString());
    };
    window.addEventListener('click', aggiornaAttivita);
    window.addEventListener('keydown', aggiornaAttivita);

    // Controllo di scadenza ogni 30 secondi
    const interval = setInterval(() => {
      const last = localStorage.getItem('last_activity');
      if (!last) return;
      const lastTs = new Date(last).getTime();
      if (isNaN(lastTs)) return;
      const minutiTrascorsi = (Date.now() - lastTs) / 60000;
      if (minutiTrascorsi >= sessionTimeoutMinutes) {
        localStorage.removeItem('auth');
        localStorage.removeItem('is_superuser');
        localStorage.removeItem('username');
        localStorage.removeItem('login_time');
        localStorage.removeItem('last_activity');
        navigate('/login', { replace: true });
      }
    }, 30000);

    return () => {
      window.removeEventListener('click', aggiornaAttivita);
      window.removeEventListener('keydown', aggiornaAttivita);
      clearInterval(interval);
    };
  }, [isLoggedIn, navigate]);

  if (!isLoggedIn) {
    return <Outlet />;
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <img src="/logo.png?v=2" alt="StrigeKeeper" style={{ width: 32, height: 32, marginRight: 8 }} />
          <h2><span style={{ fontWeight: 500, fontSize: 16, color: '#c7d2fe' }}>{localStorage.getItem('username') || ''}</span> RondaManager</h2>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <button
              key={item.path}
              type="button"
              onClick={() => navigate(item.path)}
              className={`nav-item ${
                location.pathname === item.path ? 'active' : ''
              }`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            🚪 Esci
          </button>
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
      <ConfirmDialog />
      <AlertToast />
    </div>
  );
}
