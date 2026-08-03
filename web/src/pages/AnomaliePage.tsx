import { useEffect, useState } from 'react';
import { getSupabaseClient, listCsvFiles, downloadCsv } from '../services/supabase';
import { decryptCsv } from '../utils/crypto';
import { salvaNotaAnomalia, toggleAnomaliaRisolta } from '../utils/anomalie';
import { showAlert } from '../components/AlertToast';

interface Anomalia {
  id: string;
  idTurno: string;
  idPercorso: string;
  percorsoNome: string;
  idPunto: string;
  puntoDescrizione: string;
  timestamp: string;
  nota: string;
  nomeFoto: string;
  haFoto: boolean;
  risolta: boolean;
  noteRisoluzione: string;
}

interface GruppoAnomalie {
  idTurno: string;
  idPercorso: string;
  percorsoNome: string;
  dataInizio?: string;
  guardiaNome?: string;
  anomalie: Anomalia[];
  tutteRisolte: boolean;
}

export default function AnomaliePage() {
  // Stili per la stampa
  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'print-style-anomalie';
    style.textContent = `@media print {
      nav, button, textarea, .btn-primary, [class*="btn"] { display: none !important; }
      body { background: #fff !important; }
      .card { break-inside: avoid; box-shadow: none !important; border: 1px solid #ccc !important; }
    }`;
    document.head.appendChild(style);
    return () => { const s = document.getElementById('print-style-anomalie'); if (s) s.remove(); };
  }, []);
  const [gruppi, setGruppi] = useState<GruppoAnomalie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mostraRisolti, setMostraRisolti] = useState(false);
  const [fotoIngrandita, setFotoIngrandita] = useState<string | null>(null);
  const [salvataggioNota, setSalvataggioNota] = useState<string | null>(null);
  const [notaSalvata, setNotaSalvata] = useState<string | null>(null);

  useEffect(() => {
    caricaAnomalie().catch(err => {
      console.error('Errore useEffect:', err);
      setError('Errore durante il caricamento.');
      setLoading(false);
    });
  }, []);

  async function caricaAnomalie() {
    try {
      setLoading(true);
      setError('');
      const supabase = getSupabaseClient();

      const { data: percorsi } = await supabase.from('percorsi').select('id, nome');
      const mappaPercorsi: Record<string, string> = {};
      if (percorsi) for (const p of percorsi) mappaPercorsi[p.id] = p.nome;

      const { data: punti } = await supabase.from('punti_controllo').select('id, descrizione');
      const mappaPunti: Record<string, string> = {};
      if (punti) for (const p of punti) mappaPunti[p.id] = p.descrizione;

      const { data: risolte } = await supabase.from('anomalie_risolte').select('*');
      const mappaRisolte: Record<string, { risolta: boolean; note_risoluzione: string }> = {};
      if (risolte) {
        for (const r of risolte) {
          mappaRisolte[r.id] = { risolta: r.risolta !== false, note_risoluzione: r.note_risoluzione || '' };
        }
      }

      const { data: guardie } = await supabase.from('guardie').select('id, nome');
      const mappaGuardie: Record<string, string> = {};
      if (guardie) for (const g of guardie) mappaGuardie[g.id] = g.nome;

      const { data: turni } = await supabase
        .from('turni')
        .select('id, id_percorso, data_inizio, id_guardia')
        .order('data_inizio', { ascending: false });
      if (!turni || turni.length === 0) { setGruppi([]); return; }

      const mappaTurni: Record<string, { dataInizio: string; guardiaNome: string }> = {};
      for (const t of turni) {
        mappaTurni[t.id] = {
          dataInizio: t.data_inizio || '',
          guardiaNome: mappaGuardie[t.id_guardia] || '',
        };
      }

      const tutte: Anomalia[] = [];
      for (const turno of turni) {
        try {
          const telefonoId = await trovaTelefonoPerTurno(turno.id);
          if (!telefonoId) continue;
          const files = await listCsvFiles(telefonoId);
          const matchingFiles = files.filter((f: string) => f.includes(turno.id));
          if (matchingFiles.length === 0) continue;

          matchingFiles.sort().reverse();
          for (const file of matchingFiles) {
            try {
              const csvCifrato = await downloadCsv(telefonoId, file);
              const decifrato = await decryptCsv(csvCifrato, 'Codarini2026');
              const lines = decifrato.split('\n');
              if (lines.length < 2) continue;

              for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                const c = line.split(',');
                const nota = c[4]?.replace(/"/g, '').trim();
                if (!nota) continue;
                const idPunto = c[1];
                const timestamp = c[2];
                const nomeFoto = c[5]?.replace(/"/g, '').trim();
                const anomId = `${turno.id}_${idPunto}_${timestamp.replace(/[:.]/g, '-')}`;
                tutte.push({
                  id: anomId, idTurno: turno.id, idPercorso: turno.id_percorso,
                  percorsoNome: mappaPercorsi[turno.id_percorso] || '?',
                  idPunto, puntoDescrizione: mappaPunti[idPunto] || idPunto,
                  timestamp, nota, nomeFoto: nomeFoto || '', haFoto: !!nomeFoto,
                  risolta: mappaRisolte[anomId]?.risolta ?? false,
                  noteRisoluzione: mappaRisolte[anomId]?.note_risoluzione || '',
                });
              }
              break;
            } catch (_) {}
          }
        } catch (_) {}
      }

      // Associa note risoluzione a ciascuna anomalia
      for (const a of tutte) {
        if (mappaRisolte[a.id]) {
          a.noteRisoluzione = mappaRisolte[a.id].note_risoluzione || '';
        }
      }

      // Raggruppa per percorso
      const mappa = new Map<string, GruppoAnomalie>();
      for (const a of tutte) {
        const key = `${a.idTurno}_${a.idPercorso}`;
        if (!mappa.has(key)) {
          mappa.set(key, {
            idTurno: a.idTurno, idPercorso: a.idPercorso,
            percorsoNome: a.percorsoNome,
            dataInizio: mappaTurni[a.idTurno]?.dataInizio || '',
            guardiaNome: mappaTurni[a.idTurno]?.guardiaNome || '',
            anomalie: [], tutteRisolte: false,
          });
        }
        mappa.get(key)!.anomalie.push(a);
      }
      for (const [, g] of mappa) {
        g.tutteRisolte = g.anomalie.every(a => a.risolta);
      }

      setGruppi(Array.from(mappa.values()));
    } catch (err) {
      console.error('Errore carica anomalie:', err);
      setError('Errore durante il caricamento.');
    } finally {
      setLoading(false);
    }
  }

  async function trovaTelefonoPerTurno(idTurno: string): Promise<string | null> {
    const supabase = getSupabaseClient();
    const { data: telefoni } = await supabase.from('telefoni').select('id');
    if (!telefoni) return null;
    for (const tel of telefoni) {
      try {
        const files = await listCsvFiles(tel.id);
        if (files.some((f: string) => f.includes(idTurno))) return tel.id;
      } catch (_) {}
    }
    return null;
  }

  function stampaGruppo(gruppo: GruppoAnomalie) {
    const win = window.open('', '_blank');
    if (!win) return;
    let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Anomalie - ${gruppo.percorsoNome}</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
      h1 { font-size: 20px; color: #1a237e; margin-bottom: 4px; }
      .count { font-size: 13px; color: #999; margin-bottom: 16px; }
      .anomalia { background: #fff8e1; padding: 10px 12px; border-radius: 6px; margin-bottom: 10px; border-left: 4px solid #e65100; page-break-inside: avoid; }
      .anomalia.risolta { background: #e8f5e9; border-left-color: #2e7d32; }
      .label { font-weight: 600; font-size: 13px; color: #e65100; margin-bottom: 2px; }
      .label.risolta { color: #2e7d32; }
      .data { font-size: 12px; color: #666; margin-bottom: 4px; }
      .nota { font-size: 14px; margin-bottom: 4px; }
      img { height: 80px; border-radius: 4px; border: 1px solid #ddd; object-fit: cover; margin-top: 4px; }
      .note-risoluzione { margin-top: 8px; padding: 8px; background: #f5f5f5; border-radius: 4px; font-size: 12px; border: 1px solid #e0e0e0; }
      .footer { margin-top: 20px; font-size: 11px; color: #999; text-align: center; border-top: 1px solid #ddd; padding-top: 8px; }
      @media print { body { padding: 0; } }
    </style></head><body>`;
    html += `<h1>${gruppo.percorsoNome}</h1>`;
    html += `<div class="count">${gruppo.anomalie.length} anomalie</div>`;
    for (let idx = 0; idx < gruppo.anomalie.length; idx++) {
      const a = gruppo.anomalie[idx];
      const risolta = a.risolta ? ' risolta' : '';
      html += `<div class="anomalia${risolta}">`;
      html += `<div class="label${risolta}">${a.risolta ? '✅ FATTA' : '🔴 DA RISOLVERE'} &mdash; Punto di Controllo: ${a.puntoDescrizione}</div>`;
      html += `<div class="data">${new Date(a.timestamp).toLocaleString('it-IT')}</div>`;
      html += `<div class="nota">📝 <strong>Anomalia riscontrata:</strong> ${a.nota}</div>`;
      if (a.haFoto) {
        const fotoUrl = `https://sixcslagfkoujyvephmu.supabase.co/storage/v1/object/public/ronde-foto/T01/foto/${a.nomeFoto}`;
        html += `<img src="${fotoUrl}" onerror="this.style.display='none'" />`;
      }
      if (a.noteRisoluzione) {
        html += `<div class="note-risoluzione">📋 ${a.noteRisoluzione}</div>`;
      }
      html += `</div>`;
    }
    html += `<div class="footer">Stampato il ${new Date().toLocaleString('it-IT')}</div>`;
    html += `</body></html>`;
    win.document.write(html);
    win.document.close();
    win.print();
    win.close();
  }

  async function toggleRisolto(anomalia: Anomalia) {
    try {
      await toggleAnomaliaRisolta(anomalia);
      setGruppi(prev => prev.map(g => {
        const nuove = g.anomalie.map(a => a.id === anomalia.id ? { ...a, risolta: !a.risolta } : a);
        return { ...g, anomalie: nuove, tutteRisolte: nuove.every(a => a.risolta) };
      }));
    } catch (err) { showAlert({ message: `Errore: ${err}` }); }
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

  const ordinati = [...gruppi]
    .map(g => ({
      ...g,
      anomalie: g.anomalie.filter(a => mostraRisolti ? a.risolta : !a.risolta),
    }))
    .filter(g => g.anomalie.length > 0)
    .sort((a, b) => {
      if (a.tutteRisolte !== b.tutteRisolte) return a.tutteRisolte ? 1 : -1;
      const dataA = a.anomalie.reduce((min, an) => an.timestamp < min ? an.timestamp : min, a.anomalie[0]?.timestamp || '');
      const dataB = b.anomalie.reduce((min, an) => an.timestamp < min ? an.timestamp : min, b.anomalie[0]?.timestamp || '');
      return dataB.localeCompare(dataA);
    });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1>Anomalie riscontrate</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setMostraRisolti(false)}
            style={{ padding: '6px 14px', borderRadius: 6, border: 'none',
              background: !mostraRisolti ? '#ef5350' : '#fff', color: !mostraRisolti ? '#fff' : '#333',
              cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>🔴 Da risolvere</button>
          <button onClick={() => setMostraRisolti(true)}
            style={{ padding: '6px 14px', borderRadius: 6, border: 'none',
              background: mostraRisolti ? '#4caf50' : '#fff', color: mostraRisolti ? '#fff' : '#333',
              cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>✅ Risolte</button>
        </div>
      </div>

      {loading && (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <div style={{
            width: 40, height: 40, margin: '0 auto',
            border: '4px solid rgba(79,70,229,0.2)',
            borderTopColor: '#4f46e5',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <p style={{ color: '#666', marginTop: 12 }}>Caricamento in corso...</p>
        </div>
      )}
      {error && <div className="card" style={{ textAlign: 'center', padding: 40, border: '1px solid #ef5350' }}><p style={{ color: '#c62828' }}>{error}</p></div>}
      {!loading && !error && ordinati.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ color: '#999' }}>{mostraRisolti ? 'Nessuna anomalia risolta. 🎉' : 'Nessuna anomalia da risolvere! 🎉'}</p>
        </div>
      )}

      {!loading && ordinati.map(gruppo => (
        <div key={`${gruppo.idTurno}_${gruppo.idPercorso}`} className="card" style={{
          marginBottom: 12, padding: '12px 14px',
          border: gruppo.tutteRisolte ? '1px solid #a5d6a7' : '1px solid #ffcdd2',
          borderLeft: gruppo.tutteRisolte ? '6px solid #4caf50' : '6px solid #ef5350',
        }}>
          <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong style={{ fontSize: 15 }}>Ronda con anomalie : {gruppo.percorsoNome}</strong>
              <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                {gruppo.dataInizio ? `📅 ${new Date(gruppo.dataInizio).toLocaleString('it-IT')}` : ''}
                {gruppo.guardiaNome ? ` · 👤 ${gruppo.guardiaNome}` : ''}
              </div>
            </div>
            <button onClick={() => stampaGruppo(gruppo)}
              style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #d1d5db',
                background: '#fff', cursor: 'pointer', fontSize: 12 }}>
              🖨️ Stampa
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, alignItems: 'start' }}>
            {gruppo.anomalie.map((anomalia) => {
              const fotoUrlStr = anomalia.haFoto
                ? `https://sixcslagfkoujyvephmu.supabase.co/storage/v1/object/public/ronde-foto/T01/foto/${anomalia.nomeFoto}`
                : '';
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
                    <button onClick={() => toggleRisolto(anomalia)}
                      style={{ padding: '5px 10px', borderRadius: 6, border: 'none',
                        background: anomalia.risolta ? '#9e9e9e' : '#4caf50', color: '#fff',
                        cursor: 'pointer', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {anomalia.risolta ? '🔄 Riapri' : '✅ Risolto'}
                    </button>
                  </div>

                  <div style={{ fontSize: 12, color: '#374151', marginBottom: 6 }}>
                    📝 <strong>Anomalia:</strong> {anomalia.nota}
                  </div>

                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
                    {fotoUrlStr && (
                      <img src={fotoUrlStr} alt="foto"
                        onMouseEnter={(e) => { (e.target as HTMLImageElement).style.transform = 'scale(2.2)'; (e.target as HTMLImageElement).style.zIndex = '10'; (e.target as HTMLImageElement).style.position = 'relative'; }}
                        onMouseLeave={(e) => { (e.target as HTMLImageElement).style.transform = 'scale(1)'; (e.target as HTMLImageElement).style.zIndex = '0'; (e.target as HTMLImageElement).style.position = 'static'; }}
                        onClick={() => setFotoIngrandita(fotoUrlStr)}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        style={{ height: 56, width: 56, borderRadius: 4, cursor: 'pointer', border: '1px solid #ddd', objectFit: 'cover', flexShrink: 0, transition: 'transform 0.2s' }}
                      />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <textarea value={anomalia.noteRisoluzione || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setGruppi(prev => prev.map(g => ({
                            ...g,
                            anomalie: g.anomalie.map(a =>
                              a.id === anomalia.id ? { ...a, noteRisoluzione: val } : a
                            )
                          })));
                        }}
                        placeholder="Note intervento sull'anomalia"
                        style={{ width: '100%', padding: 6, borderRadius: 6, border: '1px solid #d1d5db', fontSize: 12, minHeight: 38, boxSizing: 'border-box', resize: 'vertical' }}
                      />
                      <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button onClick={() => salvaNota(anomalia)}
                          disabled={salvataggioNota === anomalia.id}
                          title="Salva la nota di risoluzione"
                          style={{
                            padding: '3px 8px', borderRadius: 6,
                            border: '1px solid #d1d5db', background: '#fff',
                            cursor: salvataggioNota === anomalia.id ? 'wait' : 'pointer',
                            fontSize: 11, fontWeight: 600, color: '#374151',
                          }}>
                          {salvataggioNota === anomalia.id ? '...' : '💾 Salva Nota'}
                        </button>
                        {notaSalvata === anomalia.id && (
                          <span style={{ fontSize: 11, color: '#2e7d32', fontWeight: 600 }}>✅ Nota salvata</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {fotoIngrandita && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', zIndex: 2000, display: 'flex',
          alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }} onClick={() => setFotoIngrandita(null)}>
          <img src={fotoIngrandita} alt="foto" style={{ maxWidth: '90%', maxHeight: '90%', borderRadius: 8 }} />
        </div>
      )}
    </div>
  );
}

