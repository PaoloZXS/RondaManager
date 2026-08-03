import { useEffect, useState } from 'react';
import { caricaAnomalieTurno, salvaNotaAnomalia, toggleAnomaliaRisolta, type Anomalia } from '../utils/anomalie';
import { showAlert } from './AlertToast';

interface Props {
  turnoId: string;
  turnoGuardiaNome?: string;
  turnoPercorsoNome?: string;
  turnoDataInizio?: string;
  onClose: () => void;
  onArchivia?: () => void;
  onAnomalieAggiornate?: (totale: number, aperte: number, risolte: number) => void;
}

function formattaDataOra(iso: string): string {
  const d = new Date(iso);
  const data = d.toLocaleDateString('it-IT');
  const ora = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  return `${data} ${ora}`;
}

function fotoUrl(anomalia: Anomalia): string {
  if (!anomalia.haFoto || !anomalia.nomeFoto) return '';
  const baseUrl = window.location.hostname === 'localhost'
    ? 'http://localhost:5173/supabase-proxy'
    : import.meta.env.VITE_SUPABASE_URL;
  const telefono = anomalia.telefonoId || 'T01';
  return `${baseUrl}/storage/v1/object/public/ronde-foto/${telefono}/foto/${anomalia.nomeFoto}`;
}

export default function AnomalieTurnoModal({
  turnoId,
  turnoGuardiaNome,
  turnoPercorsoNome,
  turnoDataInizio,
  onClose,
  onArchivia,
  onAnomalieAggiornate,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [anomalie, setAnomalie] = useState<Anomalia[]>([]);
  const [fotoIngrandita, setFotoIngrandita] = useState<string | null>(null);
  const [salvataggio, setSalvataggio] = useState<string | null>(null);
  const [salvataggioNota, setSalvataggioNota] = useState<string | null>(null);
  const [notaSalvata, setNotaSalvata] = useState<string | null>(null);

  useEffect(() => {
    let attivo = true;
    caricaAnomalieTurno(turnoId)
      .then((a) => {
        if (attivo) setAnomalie(a);
      })
      .catch((err) => {
        console.error('Errore caricamento anomalie turno:', err);
        if (attivo) setError('Errore durante il caricamento delle anomalie.');
      })
      .finally(() => {
        if (attivo) setLoading(false);
      });
    return () => {
      attivo = false;
    };
  }, [turnoId]);

  function notificaConteggi(nuove: Anomalia[]) {
    if (!onAnomalieAggiornate) return;
    onAnomalieAggiornate(
      nuove.length,
      nuove.filter((a) => !a.risolta).length,
      nuove.filter((a) => a.risolta).length
    );
  }

  async function risolvi(anomalia: Anomalia) {
    if (salvataggio) return;
    setSalvataggio(anomalia.id);
    try {
      await toggleAnomaliaRisolta(anomalia);
      const nuove = anomalie.map((a) =>
        a.id === anomalia.id ? { ...a, risolta: !a.risolta } : a
      );
      setAnomalie(nuove);
      notificaConteggi(nuove);
    } catch (err) {
      showAlert({ message: `Errore: ${err}` });
    } finally {
      setSalvataggio(null);
    }
  }

  async function salvaNota(anomalia: Anomalia) {
    if (salvataggioNota) return;
    setSalvataggioNota(anomalia.id);
    try {
      await salvaNotaAnomalia(anomalia);
      setNotaSalvata(anomalia.id);
      window.setTimeout(() => {
        setNotaSalvata(prev => (prev === anomalia.id ? null : prev));
      }, 2000);
    } catch (err) {
      showAlert({ message: `Errore: ${err}` });
    } finally {
      setSalvataggioNota(null);
    }
  }

  const totale = anomalie.length;
  const risolte = anomalie.filter((a) => a.risolta).length;
  const aperte = totale - risolte;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 240, right: 0, bottom: 0, zIndex: 1050,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.5)',
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: 12, maxWidth: 900, width: '94%',
        maxHeight: '88vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
      }} onClick={(e) => e.stopPropagation()}>

        {/* Header modal */}
        <div style={{
          background: 'linear-gradient(135deg, #b91c1c, #ef4444)',
          color: '#fff', borderRadius: '12px 12px 0 0', padding: '20px 24px 16px',
          flexShrink: 0, position: 'relative',
        }}>
          <button onClick={onClose} style={{
            position: 'absolute', top: 12, right: 16, zIndex: 1,
            background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff',
            fontSize: 18, cursor: 'pointer', borderRadius: 8, width: 32, height: 32,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.85, marginBottom: 4, letterSpacing: 0.5 }}>
              Gestione anomalie del turno
            </div>
            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, paddingRight: 40, color: '#fff' }}>
              ⚠️ Percorso Ronda : {turnoPercorsoNome || 'Percorso'}
            </h3>
            {turnoDataInizio ? (
              <div style={{ marginTop: 4, fontSize: 13, opacity: 0.9, paddingRight: 40 }}>
                📅 Data: {formattaDataOra(turnoDataInizio)}
              </div>
            ) : null}
            {turnoGuardiaNome ? (
              <div style={{ marginTop: 2, fontSize: 14, opacity: 0.9, paddingRight: 40 }}>
                👤 Sorvegliante: {turnoGuardiaNome}
              </div>
            ) : null}
            {!loading && (
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{
                  background: aperte > 0 ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.15)',
                  border: '1px solid rgba(255,255,255,0.4)',
                  padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                }}>🔴 {aperte} da risolvere</span>
                <span style={{
                  background: 'rgba(0,0,0,0.15)',
                  border: '1px solid rgba(255,255,255,0.4)',
                  padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                }}>✅ {risolte} risolte</span>
                <span style={{
                  background: 'rgba(0,0,0,0.15)',
                  border: '1px solid rgba(255,255,255,0.4)',
                  padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                }}>📋 {totale} totali</span>
                <button onClick={() => onArchivia?.()} title="Archivia questa ronda"
                  style={{
                    marginLeft: 'auto',
                    background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.4)',
                    color: '#fff', padding: '6px 14px', borderRadius: 8, cursor: 'pointer',
                    fontSize: 13, fontWeight: 600,
                  }}>
                  📦 Archivia Ronda
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Corpo scrollabile */}
        <div style={{ padding: '12px 16px 16px', overflowY: 'auto', flex: 1 }}>
          {loading && (
            <div style={{ textAlign: 'center', color: '#666', padding: 32 }}>
              Caricamento anomalie...
            </div>
          )}
          {!loading && error && (
            <div style={{ textAlign: 'center', color: '#c62828', padding: 32 }}>{error}</div>
          )}
          {!loading && !error && totale === 0 && (
            <div style={{ textAlign: 'center', color: '#888', padding: 32 }}>
              Nessuna anomalia per questo turno 🎉
            </div>
          )}

          {!loading && !error && (
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
              alignItems: 'start',
            }}>
              {anomalie.map((anomalia) => {
                const urlFoto = fotoUrl(anomalia);
                const inSalvataggio = salvataggio === anomalia.id;
                return (
                  <div key={anomalia.id} style={{
                    background: anomalia.risolta ? '#e8f5e9' : '#fff8e1',
                    padding: '8px 10px', borderRadius: 8,
                    border: anomalia.risolta ? '1px solid #a5d6a7' : '1px solid #ffcc80',
                    borderLeft: anomalia.risolta ? '4px solid #2e7d32' : '4px solid #e65100',
                    display: 'flex', flexDirection: 'column',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 12, color: anomalia.risolta ? '#2e7d32' : '#e65100', lineHeight: 1.3 }}>
                          {anomalia.risolta ? '✅ FATTA' : '🔴 DA RISOLVERE'} &mdash; {anomalia.puntoDescrizione}
                        </div>
                        <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
                          {new Date(anomalia.timestamp).toLocaleString('it-IT')}
                        </div>
                      </div>
                      <button
                        onClick={() => risolvi(anomalia)}
                        disabled={inSalvataggio}
                        style={{
                          padding: '5px 10px', borderRadius: 6, border: 'none',
                          background: anomalia.risolta ? '#9e9e9e' : '#4caf50',
                          color: '#fff', cursor: inSalvataggio ? 'wait' : 'pointer',
                          fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0,
                        }}
                      >
                        {inSalvataggio ? '...' : (anomalia.risolta ? '🔄 Riapri' : '✅ Risolto')}
                      </button>
                    </div>

                    <div style={{ fontSize: 12, color: '#374151', marginBottom: 6 }}>
                      📝 <strong>Anomalia:</strong> {anomalia.nota}
                    </div>

                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
                      {urlFoto && (
                        <img src={urlFoto} alt="foto"
                          onMouseEnter={(e) => {
                            (e.target as HTMLImageElement).style.transform = 'scale(2.2)';
                            (e.target as HTMLImageElement).style.zIndex = '10';
                            (e.target as HTMLImageElement).style.position = 'relative';
                          }}
                          onMouseLeave={(e) => {
                            (e.target as HTMLImageElement).style.transform = 'scale(1)';
                            (e.target as HTMLImageElement).style.zIndex = '0';
                            (e.target as HTMLImageElement).style.position = 'static';
                          }}
                          onClick={() => setFotoIngrandita(urlFoto)}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          style={{
                            height: 56, width: 56, borderRadius: 4, cursor: 'pointer',
                            border: '1px solid #ddd', objectFit: 'cover', flexShrink: 0,
                            transition: 'transform 0.2s',
                          }}
                        />
                      )}
                      {/* Nota di risoluzione + Salva Nota */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <textarea
                          value={anomalia.noteRisoluzione || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAnomalie(prev => prev.map(a =>
                              a.id === anomalia.id ? { ...a, noteRisoluzione: val } : a
                            ));
                          }}
                          placeholder="Note di risoluzione..."
                          style={{
                            width: '100%', padding: 6, borderRadius: 6,
                            border: '1px solid #d1d5db', fontSize: 12,
                            minHeight: 38, boxSizing: 'border-box', resize: 'vertical',
                          }}
                        />
                        <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <button
                            onClick={() => salvaNota(anomalia)}
                            disabled={salvataggioNota === anomalia.id}
                            title="Salva la nota di risoluzione"
                            style={{
                              padding: '3px 8px', borderRadius: 6,
                              border: '1px solid #d1d5db', background: '#fff',
                              cursor: salvataggioNota === anomalia.id ? 'wait' : 'pointer',
                              fontSize: 11, fontWeight: 600, color: '#374151',
                            }}
                          >
                            {salvataggioNota === anomalia.id ? '...' : '💾 Salva Nota'}
                          </button>
                          {notaSalvata === anomalia.id && (
                            <span style={{ fontSize: 11, color: '#2e7d32', fontWeight: 600 }}>
                              ✅ Nota salvata
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {fotoIngrandita && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', zIndex: 2000, display: 'flex',
          alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }} onClick={() => setFotoIngrandita(null)}>
          <img src={fotoIngrandita} alt="foto"
            style={{ maxWidth: '90%', maxHeight: '90%', borderRadius: 8 }} />
        </div>
      )}
    </div>
  );
}
