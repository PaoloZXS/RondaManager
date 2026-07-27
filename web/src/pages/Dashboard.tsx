import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSupabaseClient } from '../services/supabase';

export default function Dashboard() {
  const [stats, setStats] = useState({
    sedi: 0,
    guardie: 0,
    punti: 0,
    percorsi: 0,
    turni: 0,
  });
  const navigate = useNavigate();

  useEffect(() => {
    caricaStatistiche();
  }, []);

  async function caricaStatistiche() {
    try {
      const supabase = getSupabaseClient();
      const [{ count: s }, { count: g }, { count: p }, { count: pe }, { count: t }] =
        await Promise.all([
          supabase.from('sedi').select('*', { count: 'exact', head: true }),
          supabase.from('guardie').select('*', { count: 'exact', head: true }),
          supabase.from('punti_controllo').select('*', { count: 'exact', head: true }),
          supabase.from('percorsi').select('*', { count: 'exact', head: true }),
          supabase.from('turni').select('*', { count: 'exact', head: true }),
        ]);

      setStats({
        sedi: s ?? 0,
        guardie: g ?? 0,
        punti: p ?? 0,
        percorsi: pe ?? 0,
        turni: t ?? 0,
      });
    } catch (err) {
      console.error('Errore caricamento statistiche:', err);
    }
  }

  return (
    <div>
      <h1 style={{ marginBottom: 32 }}>Dashboard</h1>

      <div className="stats-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16,
      }}>
        {[
          { label: 'Sedi', value: stats.sedi, icon: '🏢', color: '#1565c0', path: '/sedi' },
          { label: 'Sorveglianti', value: stats.guardie, icon: '👤', color: '#0a1128', path: '/guardie' },
          { label: 'Punti di Controllo', value: stats.punti, icon: '📍', color: '#2e7d32', path: '/punti-controllo' },
          { label: 'Percorsi Ronde', value: stats.percorsi, icon: '🗺️', color: '#e65100', path: '/percorsi' },
          { label: 'Ronde Completate', value: stats.turni, icon: '🕐', color: '#6a1b9a', path: '/turni' },
        ].map((card) => (
          <div
            key={card.label}
            className="stat-card"
            onClick={() => navigate(card.path)}
            style={{
              background: 'white',
              borderRadius: 12,
              padding: 24,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              borderLeft: `4px solid ${card.color}`,
              cursor: 'pointer',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>{card.icon}</div>
            <div style={{ fontSize: 28, fontWeight: 'bold', color: card.color }}>{card.value}</div>
            <div style={{ color: '#666', marginTop: 4 }}>{card.label}</div>
          </div>
        ))}
      </div>

      <div style={{ textAlign: 'center', marginTop: 120 }}>
        <img src="/logo.png?v=2" alt="StrigeKeeper" style={{ width: 200, height: 200 }} />
      </div>
    </div>
  );
}
