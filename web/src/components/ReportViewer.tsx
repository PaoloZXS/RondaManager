import { useEffect, useState } from 'react';
import { getSupabaseClient, listCsvFiles, downloadCsv, BUCKET_CSV } from '../services/supabase';
import { decryptCsv } from '../utils/crypto';
import type { DatoTimbro } from '../types';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface Props {
  turnoId: string;
  onClose: () => void;
  titolo?: string;
}

function fotoUrl(idTelefono: string, nomeFoto: string) {
  const baseUrl = window.location.hostname === 'localhost'
    ? 'http://localhost:5173/supabase-proxy'
    : import.meta.env.VITE_SUPABASE_URL;
  return `${baseUrl}/storage/v1/object/public/ronde-foto/${idTelefono}/foto/${nomeFoto}`;
}

export default function ReportViewer({ turnoId, onClose, titolo }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dati, setDati] = useState<DatoTimbro[]>([]);
  const [mappaPunti, setMappaPunti] = useState<Record<string, string>>({});
  const [idTelefono, setIdTelefono] = useState('');
  const [guardiaNome, setGuardiaNome] = useState('');
  const [percorsoNome, setPercorsoNome] = useState('');
  const [dataInizio, setDataInizio] = useState('');
  const [dataFine, setDataFine] = useState('');
  const [durata, setDurata] = useState('');

  useEffect(() => {
    caricaReport();
  }, []);

  async function caricaReport() {
    try {
      setLoading(true);
      const supabase = getSupabaseClient();

      // Carica descrizioni punti di controllo
      const { data: punti } = await supabase
        .from('punti_controllo')
        .select('id, descrizione');
      const mappa: Record<string, string> = {};
      if (punti) {
        for (const p of punti) {
          mappa[p.id] = p.descrizione;
        }
      }
      setMappaPunti(mappa);

      // Cerca i CSV associati a questo turno
      const { data: turno } = await supabase
        .from('turni')
        .select('*')
        .eq('id', turnoId)
        .single();

      if (!turno) {
        setError('Turno non trovato');
        return;
      }

      // Carica nome guardia
      const { data: guardia } = await supabase
        .from('guardie')
        .select('nome')
        .eq('id', turno.id_guardia)
        .single();
      if (guardia) {
        setGuardiaNome(guardia.nome);
      }

      // Carica nome percorso
      const { data: percorso } = await supabase
        .from('percorsi')
        .select('nome')
        .eq('id', turno.id_percorso)
        .single();
      if (percorso) {
        setPercorsoNome(percorso.nome);
      }

      setDataInizio(new Date(turno.data_inizio).toLocaleString('it-IT'));
      setDataFine(turno.data_fine ? new Date(turno.data_fine).toLocaleString('it-IT') : '');
      // Calcola durata
      if (turno.data_fine) {
        const diffMs = new Date(turno.data_fine).getTime() - new Date(turno.data_inizio).getTime();
        const min = Math.floor(diffMs / 60000);
        const sec = Math.floor((diffMs % 60000) / 1000);
        setDurata(min > 0 ? `${min} min ${sec} sec` : `${sec} sec`);
      }

      // Lista le cartelle (ID telefoni) dal bucket Storage
      const folders = await listaCartelleStorage();
      const ids = folders;
      let trovato = false;

      if (ids.length === 0) {
        const { data: telefoni } = await supabase.from('telefoni').select('id');
        if (telefoni && telefoni.length > 0) {
          for (const tel of telefoni) {
            trovato = await cercaCsvPerTelefono(tel.id, turno.id);
            if (trovato) break;
          }
        }
        if (!trovato) {
          setError('Nessun file CSV trovato');
        }
        return;
      }

      for (const id of ids) {
        trovato = await cercaCsvPerTelefono(id, turno.id);
        if (trovato) break;
      }
    } catch (err) {
      setError(`Errore caricamento report: ${err}`);
    } finally {
      setLoading(false);
    }
  }

  async function cercaCsvPerTelefono(idTelefono: string, idTurno: string): Promise<boolean> {
    try {
      const files = await listCsvFiles(idTelefono);
      const matchingFiles = files.filter((f) => f.includes(idTurno));
      matchingFiles.sort().reverse();
      for (const matchingFile of matchingFiles) {
        try {
          const csvCifrato = await downloadCsv(idTelefono, matchingFile);
          const decifrato = await decryptCsv(csvCifrato, 'Codarini2026');
          const lines = decifrato.split('\n');
          if (lines.length < 2) continue;
          const parsed: DatoTimbro[] = lines
            .slice(1)
            .filter((l) => l.trim())
            .map((l) => {
              const c = l.split(',');
              return {
                id: c[0], id_punto: c[1], timestamp: c[2],
                batteria: c[3],
                nota: c[4]?.replace(/"/g, '').trim(), nome_foto: c[5]?.replace(/"/g, ''),
                id_guardia: c[6], id_turno: c[7],
                latitudine: '', longitudine: '',
              };
            });
          if (parsed.length > 0) {
            setDati(parsed);
            setIdTelefono(idTelefono);
            return true;
          }
        } catch (_) {
          console.log(`⚠️ File ${matchingFile} non decifrabile, provo il successivo`);
        }
      }
    } catch (_) {}
    return false;
  }

  async function listaCartelleStorage(): Promise<string[]> {
    try {
      const supabase = getSupabaseClient();
      const apiKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const baseUrl = window.location.hostname === 'localhost'
        ? 'http://localhost:5173/supabase-proxy'
        : import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(`${baseUrl}/storage/v1/object/list/${BUCKET_CSV}`, {
        method: 'POST',
        headers: {
          'apikey': apiKey,
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prefix: '', limit: 100 }),
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.map((f: any) => f.name);
    } catch {
      return [];
    }
  }

  async function esportaPdf() {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(titolo || 'Report', 14, 14);
    doc.setFontSize(16);
    doc.text(`Percorso : ${percorsoNome || 'Report Turno'}`, 14, 22);
    doc.setFontSize(10);
    doc.text(`Addetto : ${guardiaNome}`, 14, 28);
    doc.text('Inizio Percorso', 14, 34);
    doc.text(dataInizio, 50, 34);
    if (dataFine) {
      doc.text('Fine Percorso', 14, 40);
      doc.text(dataFine, 50, 40);
    }
    if (durata) {
      doc.text('Durata Percorso', 14, 46);
      doc.text(durata, 50, 46);
    }

    const rows = dati.map((d, i) => [
      i + 1,
      mappaPunti[d.id_punto] || d.id_punto,
      new Date(d.timestamp).toLocaleString('it-IT'),
      d.nota || '-',
      `${d.batteria}%`,
    ]);

    (doc as any).autoTable({
      startY: dataFine ? (durata ? 56 : 50) : 44,
      head: [['#', 'Punto', 'Ora', 'Nota', 'Batt.']],
      body: rows,
    });

    // Aggiungi foto sotto la tabella
    let yOffset = (doc as any).lastAutoTable.finalY + 10;
    for (let idx = 0; idx < dati.length; idx++) {
      const d = dati[idx];
      if (!d.nome_foto) continue;
      try {
        const resp = await fetch(fotoUrl(idTelefono, d.nome_foto));
        const blob = await resp.blob();
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
        // Controlla se serve nuova pagina
        if (yOffset > 250) {
          doc.addPage();
          yOffset = 20;
        }
        const nomePunto = mappaPunti[d.id_punto] || d.id_punto;
        doc.setFontSize(10);
        let label = `Foto - ${nomePunto} (${new Date(d.timestamp).toLocaleString('it-IT')})`;
        if (d.nota) label += ` - Irregolarità: ${d.nota}`;
        doc.text(label + ':', 14, yOffset);
        yOffset += 6;
        doc.addImage(base64, 'JPEG', 14, yOffset, 50, 38);
        yOffset += 44;
      } catch (_) {
        // Se non riesce a caricare la foto, salta
      }
    }

    const pdfBlob = doc.output('blob');
    const url = URL.createObjectURL(pdfBlob);
    window.open(url, '_blank');
  }

  if (loading) return (
    <div style={{
      position: 'fixed', top: 0, left: 240, right: 0, bottom: 0, zIndex: 1050,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.5)',
    }} onClick={onClose}>
      <div style={{
        width: 48, height: 48,
        border: '5px solid rgba(255,255,255,0.3)',
        borderTopColor: '#fff',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
    </div>
  );
  if (error) return <div style={{ padding: 24, color: 'red' }}>{error}</div>;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 240, right: 0, bottom: 0, zIndex: 1050,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.5)',
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: 12, maxWidth: 780, width: '92%',
        maxHeight: '85vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
      }} onClick={(e) => e.stopPropagation()}>
        
        {/* Header modal - fisso */}
        <div style={{
          background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
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
            <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.85, marginBottom: 4, letterSpacing: 0.5 }}>{titolo || 'Report'}</div>
            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, paddingRight: 40, color: '#fff' }}>Percorso : {percorsoNome || 'Report Turno'}</h3>
            <div style={{ marginTop: 8, fontSize: 14, opacity: 0.9 }}>
              <div style={{ paddingRight: 40 }}>👤 Addetto : {guardiaNome}</div>
              <div style={{ marginTop: 2, paddingRight: 40 }}><span style={{ display: 'inline-block', width: 155 }}>🟢 Inizio Percorso</span> {dataInizio}</div>
              {dataFine ? (
                <div style={{ marginTop: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span><span style={{ display: 'inline-block', width: 155 }}>🔴 Fine Percorso</span> {dataFine}</span>
                  <button onClick={esportaPdf} style={{
                    background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)',
                    color: '#fff', padding: '4px 12px', borderRadius: 8, cursor: 'pointer',
                    fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
                  }}>🖨️ Stampa</button>
                </div>
              ) : null}
              {durata ? <div style={{ marginTop: 1, paddingRight: 40 }}><span style={{ display: 'inline-block', width: 155 }}>⏱️ Durata Percorso</span> {durata}</div> : null}
            </div>
          </div>
        </div>

        {/* Corpo: card dei timbri - scrollabile */}
        <div style={{ padding: '16px 20px 20px', overflowY: 'auto', flex: 1 }}>
          {dati.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#888', padding: 24 }}>Nessun timbro registrato</div>
          ) : (
            dati.map((d, i) => {
              const nomePunto = mappaPunti[d.id_punto] || d.id_punto;
              const hasFoto = !!d.nome_foto;
              return (
                <div key={d.id} style={{
                  border: '1px solid #e5e7eb', borderRadius: 10, marginBottom: 10,
                  padding: '14px 16px', background: i % 2 === 0 ? '#fafbfc' : '#fff',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{
                      background: '#4f46e5', color: '#fff', borderRadius: 8,
                      width: 28, height: 28, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0,
                    }}>{i + 1}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: '#1f2937' }}>{nomePunto}</div>
                      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                        {new Date(d.timestamp).toLocaleString('it-IT')} · 🔋 {d.batteria}%
                      </div>
                      {d.nota ? (
                        <div style={{ marginTop: 8, fontSize: 12, fontWeight: 600, color: '#6b7280' }}>Irregolarita' segnalata</div>
                      ) : null}
                      {d.nota ? (
                        <div style={{
                          marginTop: 2, background: '#f3f4f6', borderRadius: 6,
                          padding: '8px 10px', fontSize: 13, color: '#374151',
                          borderLeft: '3px solid #6366f1',
                        }}>{d.nota}</div>
                      ) : null}
                      {hasFoto ? (
                        <div style={{ marginTop: 8 }}>
                          <img src={fotoUrl(idTelefono, d.nome_foto!)}
                            alt="foto"
                            style={{
                              width: 80, height: 80, borderRadius: 8,
                              cursor: 'pointer', border: '1px solid #e5e7eb',
                              objectFit: 'cover', transition: 'transform 0.2s',
                            }}
                            onMouseEnter={(e) => { (e.target as HTMLElement).style.transform = 'scale(2.5)'; (e.target as HTMLElement).style.zIndex = '10'; (e.target as HTMLElement).style.position = 'relative'; }}
                            onMouseLeave={(e) => { (e.target as HTMLElement).style.transform = 'scale(1)'; (e.target as HTMLElement).style.zIndex = 'auto'; }}
                            onClick={() => window.open(fotoUrl(idTelefono, d.nome_foto!), '_blank')}
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
