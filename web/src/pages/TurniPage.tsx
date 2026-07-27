import { useEffect, useState } from 'react';
import { getSupabaseClient } from '../services/supabase';
import type { Turno, Guardia, Percorso } from '../types';
import ReportViewer from '../components/ReportViewer';

export default function TurniPage() {
  const [turni, setTurni] = useState<Turno[]>([]);
  const [guardie, setGuardie] = useState<Guardia[]>([]);
  const [percorsi, setPercorsi] = useState<Percorso[]>([]);
  const [reportTurno, setReportTurno] = useState<string | null>(null);
  const [filtroGuardia, setFiltroGuardia] = useState('');
  const [filtroPercorso, setFiltroPercorso] = useState('');
  const [filtroData, setFiltroData] = useState('');

  useEffect(() => {
    caricaDati();
  }, []);

  async function caricaDati() {
    const supabase = getSupabaseClient();
    const [rTurni, rGuardie, rPercorsi] = await Promise.all([
      supabase.from('turni').select('*').order('data_inizio', { ascending: false }),
      supabase.from('guardie').select('*'),
      supabase.from('percorsi').select('*'),
    ]);
    if (rTurni.data) setTurni(rTurni.data);
    if (rGuardie.data) setGuardie(rGuardie.data);
    if (rPercorsi.data) setPercorsi(rPercorsi.data);
  }

  const turniFiltrati = turni.filter(t => {
    // Filtri manuali
    if (filtroGuardia && t.id_guardia !== filtroGuardia) return false;
    if (filtroPercorso && t.id_percorso !== filtroPercorso) return false;
    if (filtroData) {
      const giorno = t.data_inizio.slice(0, 10);
      if (giorno !== filtroData) return false;
    }
    return true;
  });

  function getNomeGuardia(id: string): string {
    const g = guardie.find((g) => g.id === id);
    return g ? g.nome : id;
  }

  function getNomePercorso(id: string): string {
    return percorsi.find((p) => p.id === id)?.nome ?? id;
  }

  function formattaData(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleString('it-IT');
  }

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <h1 style={{ whiteSpace: 'nowrap' }}>{window.location.pathname === '/archivio' ? 'Ronde Archiviate' : 'Ronde Completate'}</h1>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <select value={filtroGuardia} onChange={(e) => setFiltroGuardia(e.target.value)}
          style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 }}>
          <option value="">Tutti i sorveglianti</option>
          {guardie.map(g => (
            <option key={g.id} value={g.id}>{g.nome}</option>
          ))}
        </select>

        <select value={filtroPercorso} onChange={(e) => setFiltroPercorso(e.target.value)}
          style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 }}>
          <option value="">Tutti i percorsi</option>
          {percorsi.map(p => (
            <option key={p.id} value={p.id}>{p.nome}</option>
          ))}
        </select>

        <input type="date" value={filtroData} onChange={(e) => setFiltroData(e.target.value)}
          style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 }} />

        {(filtroGuardia || filtroPercorso || filtroData) && (
          <button onClick={() => { setFiltroGuardia(''); setFiltroPercorso(''); setFiltroData(''); }}
            style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontSize: 13 }}>
            ✕ Cancella filtri
          </button>
        )}
      </div>

      {reportTurno && (
        <ReportViewer
          turnoId={reportTurno}
          onClose={() => setReportTurno(null)}
          titolo={window.location.pathname === '/archivio' ? 'Report Ronde Archiviate' : 'Report Ronde Completate'}
        />
      )}

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Sorvegliante</th>
              <th>Percorso</th>
              <th>Inizio</th>
              <th>Fine</th>
              <th>Durata</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {turniFiltrati.map((t) => {
              const inizio = new Date(t.data_inizio);
              const fine = t.data_fine ? new Date(t.data_fine) : null;
              const durataMin = fine
                ? Math.round((fine.getTime() - inizio.getTime()) / 60000)
                : null;
              return (
                <tr key={t.id}>
                  <td>{getNomeGuardia(t.id_guardia)}</td>
                  <td>{getNomePercorso(t.id_percorso)}</td>
                  <td>{formattaData(t.data_inizio)}</td>
                  <td>{t.data_fine ? formattaData(t.data_fine) : '-'}</td>
                  <td>{durataMin != null ? `${durataMin} min` : '-'}</td>
                  <td>
                    <button title="Visualizza report turno" onClick={() => setReportTurno(t.id)}>
                      📄 Report
                    </button>
                  </td>
                </tr>
              );
            })}
            {turniFiltrati.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: '#999' }}>
                  Nessun turno ancora registrato
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>


    </div>
  );
}
