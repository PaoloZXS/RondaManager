import { useEffect } from 'react';
import { useNavigate, Outlet, Link, useLocation } from 'react-router-dom';
import './Layout.css';
import ConfirmDialog from './ConfirmDialog';
import AlertToast from './AlertToast';

const navItems = [
  { path: '/', label: 'Dashboard', icon: '📊', title: '' },
  { path: '/sedi', label: 'Sedi', icon: '🏢', title: 'Inserimento delle sedi da gestire' },
  { path: '/punti-controllo', label: 'Punti di controllo', icon: '📍', title: 'Inserimento dei Punti di controllo dei Percorsi Ronde' },
  { path: '/percorsi', label: 'Percorsi Ronde', icon: '🗺️', title: 'Configurazione del percorso del sorvegliante' },
  { path: '/telefoni', label: 'Telefoni', icon: '📱', title: 'Configurazione del Telefono da usare per la lettura dei TAG' },
  { path: '/guardie', label: 'Sorveglianti', icon: '👤', title: 'Inserimento dei Sorveglianti abilitati alle Ronde' },
  { path: '/turni', label: 'Ronde Completate', icon: '🕐', title: 'Gestione Ronde completate dai Sorveglianti' },
  { path: '/archivio', label: 'Ronde Archiviate', icon: '🗂️', title: 'Gestione delle Ronde già gestite dall\'Admin' },
  { path: '/anomalie', label: 'Anomalie riscontrate', icon: '⚠️', title: 'Gestione delle anomalie sulle Ronde eseguite' },
  { path: '/impostazioni', label: 'Impostazioni', icon: '⚙️', title: 'Modifica Impostazioni Admin' },
];

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('auth');
    localStorage.removeItem('is_superuser');
    localStorage.removeItem('username');
    navigate('/login');
  };

  const isLoggedIn = localStorage.getItem('auth') === 'true';

  useEffect(() => {
    if (!isLoggedIn && location.pathname !== '/login') {
      navigate('/login', { replace: true });
    }
  }, [isLoggedIn, location.pathname, navigate]);

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
            <Link
              key={item.path}
              to={item.path}
              title={item.title}
              className={`nav-item ${
                location.pathname === item.path ? 'active' : ''
              }`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </Link>
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
