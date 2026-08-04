import { useEffect } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
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
