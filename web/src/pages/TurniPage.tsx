import { useEffect, useState } from 'react';
import { getSupabaseClient } from '../services/supabase';
import type { Turno, Guardia, Percorso } from '../types';
import ReportViewer from '../components/ReportViewer';
import AnomalieTurnoModal from '../components/AnomalieTurnoModal';
import { showConfirm } from '../components/ConfirmDialog';
import { showAlert } from '../components/AlertToast';
import { caricaAnomalieTurno } from '../utils/anomalie';

interface ConteggioAnomalie {
  totale: number;
  aperte: number;
  risolte: number;
}

export default function TurniPage() {
  const [turni, setTurni] = useState<Turno[]>([]);
  const [guardie, setGuardie] = useState<Guardia[]>([]);
  const [percorsi, setPercorsi] = useState<Percorso[]>([]);
  const [reportTurno, setReportTurno] = useState<string | null>(null);
  const [anomalieTurno, setAnomalieTurno] = useState<string | null>(null);
  const [conteggiAnomalie, setConteggiAnomalie] = useState<Record<string, ConteggioAnomalie>>({});
  const [loadingConteggi, setLoadingConteggi] = useState(false);
  const [progressoConteggi, setProgressoConteggi] = useState(0);
  const [filtroGuardia, setFiltroGuardia] = useState('');
  const [filtroPercorso, setFiltroPercorso] = useState('');
  const [filtroData, setFiltroData] = useState('');

  const isArchivio = window.location.pathname === '/archivio';

  useEffect(() => {
    caricaDati();
  }, []);

  async function caricaDati() {
    const supabase = getSupabaseClient();
    const [rTurni, rGuardie, rPercorsi] = await Promise.all([
      supabase
        .from('turni')
        .select('*')
        .or(isArchivio ? 'archiviato.eq.true' : 'archiviato.is.null,archiviato.eq.false')
        .order('data_inizio', { ascending: false }),
      supabase.from('guardie').select('*'),
      supabase.from('percorsi').select('*'),
    ]);
    const listaTurni = rTurni.data ?? [];
    setTurni(listaTurni);
    if (rGuardie.data) setGuardie(rGuardie.data);
    if (rPercorsi.data) setPercorsi(rPercorsi.data);
    if (listaTurni.length > 0) {
      caricaConteggiAnomalie(listaTurni);
    }
  }

  async function caricaConteggiAnomalie(listaTurni: Turno[]) {
    setLoadingConteggi(true);
    setProgressoConteggi(0);
    if (listaTurni.length === 0) {
      setConteggiAnomalie({});
      setLoadingConteggi(false);
      return;
    }
    const mappa: Record<string, ConteggioAnomalie> = {};
    for (let i = 0; i < listaTurni.length; i++) {
      const t = listaTurni[i];
      try {
        const anomalie = await caricaAnomalieTurno(t.id);
        mappa[t.id] = {
          totale: anomalie.length,
          aperte: anomalie.filter((a) => !a.risolta).length,
          risolte: anomalie.filter((a) => a.risolta).length,
        };
      } catch (_) {
        mappa[t.id] = { totale: 0, aperte: 0, risolte: 0 };
      }
      setProgressoConteggi(i + 1);
    }
    setConteggiAnomalie(mappa);
    setLoadingConteggi(false);
  }

  async function eseguiArchiviazione(t: Turno) {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('turni')
      .update({ archiviato: true })
      .eq('id', t.id);
    if (error) {
      showAlert({ message: `Errore durante l'archiviazione: ${error.message}` });
      return;
    }
    caricaDati();
  }

  function archiviaTurno(t: Turno) {
    showConfirm({
      title: 'Archivia ronda',
      message: 'Archiviare questa ronda?',
      confirmText: 'Archivia',
      cancelText: 'Annulla',
      onConfirm: () => eseguiArchiviazione(t),
    });
  }

  function archiviaDaModal(idTurno: string) {
    const t = turni.find((x) => x.id === idTurno);
    if (!t) return;
    showConfirm({
      title: 'Archivia ronda',
      message: 'Archiviare questa ronda?',
      confirmText: 'Archivia',
      cancelText: 'Annulla',
      onConfirm: async () => {
        await eseguiArchiviazione(t);
        setAnomalieTurno(null);
      },
    });
  }

  function ripristinaTurno(t: Turno) {
    showConfirm({
      title: 'Ripristina ronda',
      message: "Ripristinare questa ronda? Tornerà in 'Ronde Completate'.",
      confirmText: 'Ripristina',
      cancelText: 'Annulla',
      onConfirm: async () => {
        const supabase = getSupabaseClient();
        const { error } = await supabase
          .from('turni')
          .update({ archiviato: false })
          .eq('id', t.id);
        if (error) {
          showAlert({ message: `Errore durante il ripristino: ${error.message}` });
          return;
        }
        caricaDati();
      },
    });
  }

  const turnoAnomalie = anomalieTurno ? turni.find((t) => t.id === anomalieTurno) : null;

  const turniFiltrati = turni.filter(t => {
    // Filtro per pagina: /turni → non archiviate, /archivio → archiviate
    if (isArchivio ? !t.archiviato : t.archiviato) return false;
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

      {turnoAnomalie && (
        <AnomalieTurnoModal
          turnoId={turnoAnomalie.id}
          turnoGuardiaNome={getNomeGuardia(turnoAnomalie.id_guardia)}
          turnoPercorsoNome={getNomePercorso(turnoAnomalie.id_percorso)}
          turnoDataInizio={turnoAnomalie.data_inizio}
          onClose={() => setAnomalieTurno(null)}
          onArchivia={() => archiviaDaModal(turnoAnomalie.id)}
          onAnomalieAggiornate={(totale, aperte, risolte) => {
            setConteggiAnomalie(prev => ({
              ...prev,
              [turnoAnomalie.id]: { totale, aperte, risolte },
            }));
          }}
        />
      )}

      {loadingConteggi ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ color: '#666', marginBottom: 12 }}>
            Caricamento anomalie: {progressoConteggi}/{turni.length} turni...
          </p>
          <div style={{
            background: '#e5e7eb', borderRadius: 999, height: 8, maxWidth: 320,
            margin: '0 auto', overflow: 'hidden',
          }}>
            <div style={{
              background: 'linear-gradient(90deg, #4f46e5, #6366f1)',
              height: '100%',
              width: turni.length > 0 ? `${Math.round((progressoConteggi / turni.length) * 100)}%` : '0%',
              borderRadius: 999, transition: 'width 0.3s ease',
            }} />
          </div>
        </div>
      ) : (
        <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Sorvegliante</th>
              <th>Percorso</th>
              <th>Inizio</th>
              <th>Fine</th>
              <th>Durata</th>
              <th>Anomalie</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {turniFiltrati.map((t, idx) => {
              const inizio = new Date(t.data_inizio);
              const fine = t.data_fine ? new Date(t.data_fine) : null;
              const durataMin = fine
                ? Math.round((fine.getTime() - inizio.getTime()) / 60000)
                : null;
              const c = conteggiAnomalie[t.id];
              return (
                <tr key={t.id} style={{ background: idx % 2 === 1 ? '#f0f4ff' : '#ffffff' }}>
                  <td>{getNomeGuardia(t.id_guardia)}</td>
                  <td>{getNomePercorso(t.id_percorso)}</td>
                  <td>{formattaData(t.data_inizio)}</td>
                  <td>{t.data_fine ? formattaData(t.data_fine) : '-'}</td>
                  <td>{durataMin != null ? `${durataMin} min` : '-'}</td>
                  <td>
                    {loadingConteggi && !c ? (
                      <span style={{ color: '#999' }}>...</span>
                    ) : !c || c.totale === 0 ? (
                      <span style={{ color: '#9e9e9e' }}>—</span>
                    ) : c.aperte > 0 ? (
                      <button title="Anomalie ancora da risolvere — apri gestione"
                        onClick={() => setAnomalieTurno(t.id)}
                        style={{
                          background: '#ffebee', color: '#c62828', border: 'none',
                          padding: '3px 10px', borderRadius: 999,
                          fontWeight: 700, fontSize: 12, cursor: 'pointer',
                        }}>🔴 {c.aperte}/{c.totale}</button>
                    ) : (
                      <button title="Anomalie tutte risolte — apri gestione"
                        onClick={() => setAnomalieTurno(t.id)}
                        style={{
                          background: '#e8f5e9', color: '#2e7d32', border: 'none',
                          padding: '3px 10px', borderRadius: 999,
                          fontWeight: 700, fontSize: 12, cursor: 'pointer',
                        }}>✅ {c.risolte}/{c.totale}</button>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button title="Visualizza report turno (stampa)" onClick={() => setReportTurno(t.id)}>
                        🖨️ Stampa
                      </button>
                      {!isArchivio && !t.archiviato && (
                        <button title="Archivia ronda" onClick={() => archiviaTurno(t)}>
                          📦 Archivia
                        </button>
                      )}
                      {isArchivio && t.archiviato && (
                        <button title="Ripristina ronda" onClick={() => ripristinaTurno(t)}>
                          🔄 Ripristina
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {turniFiltrati.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: '#999' }}>
                  Nessun turno ancora registrato
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      )}


    </div>
  );
}
