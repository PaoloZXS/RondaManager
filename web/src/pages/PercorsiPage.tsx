import { useEffect, useState } from 'react';
import { getSupabaseClient } from '../services/supabase';
import type { Percorso, PuntoControllo, PuntoSequenza, Sede } from '../types';

export default function PercorsiPage() {
  const [percorsi, setPercorsi] = useState<(Percorso & { sede_nome?: string })[]>([]);
  const [punti, setPunti] = useState<PuntoControllo[]>([]);
  const [sedi, setSedi] = useState<Sede[]>([]);
  const [form, setForm] = useState<{ nome: string; sequenza_punti: PuntoSequenza[]; id_sede: string }>({ nome: '', sequenza_punti: [], id_sede: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    caricaDati();
  }, []);

  async function caricaDati() {
    const supabase = getSupabaseClient();
    const [rPercorsi, rPunti, rSedi] = await Promise.all([
      supabase.from('percorsi').select('*'),
      supabase.from('punti_controllo').select('*'),
      supabase.from('sedi').select('*'),
    ]);
    const sediList = rSedi.data || [];
    setSedi(sediList);
    if (rPunti.data) setPunti(rPunti.data);
    if (rPercorsi.data) {
      const sediMap = new Map(sediList.map(s => [s.id, s.nome]));
      setPercorsi(rPercorsi.data.map(p => ({
        ...p,
        sede_nome: sediMap.get(p.id_sede) || '?',
      })));
    }
  }

  function togglePunto(id: string) {
    setForm((prev) => {
      const giaPresente = prev.sequenza_punti.find((p) => p.id === id);
      if (giaPresente) {
        return {
          ...prev,
          sequenza_punti: prev.sequenza_punti.filter((p) => p.id !== id),
        };
      }
      const ultimoTempo = prev.sequenza_punti.length > 0
        ? prev.sequenza_punti[prev.sequenza_punti.length - 1].tempo_stimato
        : 0;
      return {
        ...prev,
        sequenza_punti: [...prev.sequenza_punti, { id, tempo_stimato: ultimoTempo + 5 }],
      };
    });
  }

  function aggiornaTempo(index: number, valore: number) {
    setForm((prev) => {
      const nuova = [...prev.sequenza_punti];
      nuova[index] = { ...nuova[index], tempo_stimato: valore };
      return { ...prev, sequenza_punti: nuova };
    });
  }

  function spostaPunto(index: number, direzione: number) {
    const nuova = [...form.sequenza_punti];
    const target = index + direzione;
    if (target < 0 || target >= nuova.length) return;
    [nuova[index], nuova[target]] = [nuova[target], nuova[index]];
    setForm({ ...form, sequenza_punti: nuova });
  }

  async function salvaPercorso() {
    if (!form.id_sede) { alert('Seleziona una sede'); return; }
    const supabase = getSupabaseClient();
    const percorsoId = editingId || crypto.randomUUID();
    const payload = { id: percorsoId, nome: form.nome, sequenza_punti: form.sequenza_punti, id_sede: form.id_sede };

    if (editingId) {
      await supabase.from('percorsi').update(payload).eq('id', editingId);
    } else {
      await supabase.from('percorsi').insert(payload);
    }

    // Aggiorna id_percorso sui punti selezionati
    const idsPuntiSelezionati = form.sequenza_punti.map(s => s.id);
    if (idsPuntiSelezionati.length > 0) {
      await supabase.from('punti_controllo').update({ id_percorso: percorsoId }).in('id', idsPuntiSelezionati);
    }
    // Rimuovi id_percorso dai punti che erano in questo percorso ma non sono più selezionati
    if (editingId) {
      const idsPuntiAncora = idsPuntiSelezionati;
      const { data: puntiVecchi } = await supabase.from('punti_controllo').select('id').eq('id_percorso', editingId);
      if (puntiVecchi) {
        const idsDaRimuovere = puntiVecchi
          .map(p => p.id)
          .filter(id => !idsPuntiAncora.includes(id));
        if (idsDaRimuovere.length > 0) {
          await supabase.from('punti_controllo').update({ id_percorso: null }).in('id', idsDaRimuovere);
        }
      }
    }

    setForm({ nome: '', sequenza_punti: [], id_sede: '' });
    setEditingId(null);
    setShowForm(false);
    caricaDati();
  }

  function modifica(p: Percorso & { sede_nome?: string }) {
    const raw = p.sequenza_punti;
    let sequenza: PuntoSequenza[] = [];
    if (Array.isArray(raw)) {
      sequenza = raw.map((s: any) => {
        if (typeof s === 'string') {
          try { const parsed = JSON.parse(s); return { id: parsed.id || s, tempo_stimato: parsed.tempo_stimato || 0 }; }
          catch { return { id: s, tempo_stimato: 0 }; }
        }
        return { id: s.id || '', tempo_stimato: s.tempo_stimato || 0 };
      });
    }
    setForm({ nome: p.nome, sequenza_punti: sequenza, id_sede: p.id_sede });
    setEditingId(p.id);
    setShowForm(true);
  }

  async function elimina(id: string) {
    if (!confirm('Eliminare questo percorso?')) return;
    const supabase = getSupabaseClient();
    await supabase.from('telefoni_percorsi').delete().eq('id_percorso', id);
    await supabase.from('percorsi').delete().eq('id', id);
    caricaDati();
  }

  function formattaTempo(minuti: number): string {
    const h = Math.floor(minuti / 60);
    const m = minuti % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  // Filtra punti: senza percorso (disponibili) + già assegnati a percorsi della sede selezionata
  const puntiFiltrati = form.id_sede
    ? punti.filter(p => {
        if (!p.id_percorso) return true; // punti senza percorso → disponibili
        const puntoPercorso = percorsi.find(per => per.id === p.id_percorso);
        return puntoPercorso?.id_sede === form.id_sede;
      })
    : punti;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'nowrap', gap: 12 }}>
        <h1 style={{ whiteSpace: 'nowrap' }}>Percorsi Ronde</h1>
        <button onClick={() => { setShowForm(!showForm); setEditingId(null); setForm({ nome: '', sequenza_punti: [], id_sede: '' }); }} style={{ padding: '8px 16px', background: '#1a237e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          {showForm ? 'Annulla' : '+ Nuovo Percorso'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3>{editingId ? 'Modifica Percorso' : 'Nuovo Percorso'}</h3>

          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <select
              value={form.id_sede}
              onChange={(e) => setForm({ ...form, id_sede: e.target.value })}
              style={{ flex: '0 0 250px', padding: 10, border: '1px solid #ddd', borderRadius: 8 }}
            >
              <option value="">-- Seleziona Sede --</option>
              {sedi.map(s => (
                <option key={s.id} value={s.id}>{s.nome}</option>
              ))}
            </select>
            <input type="text"
              placeholder="Nome percorso"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              style={{ width: 300, padding: 10, border: '1px solid #ddd', borderRadius: 8 }}
            />
          </div>

          <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 500, marginBottom: 8 }}>Punti disponibili:</p>
              {puntiFiltrati
                .filter((p) => !form.sequenza_punti.some((s) => s.id === p.id))
                .map((p) => (
                  <div
                    key={p.id}
                    onClick={() => togglePunto(p.id)}
                    style={{
                      padding: '8px 12px',
                      marginBottom: 4,
                      background: '#f5f5f5',
                      borderRadius: 6,
                      cursor: 'pointer',
                      border: '1px solid #ddd',
                    }}
                  >
                    <strong>{p.id}</strong> - {p.descrizione}
                  </div>
                ))}
              {form.id_sede && puntiFiltrati.length === 0 && (
                <p style={{ color: '#999', fontSize: 13 }}>Nessun punto di controllo creato per questa sede. Crea prima i punti.</p>
              )}
            </div>

            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 500, marginBottom: 8 }}>Sequenza percorso:</p>
              {form.sequenza_punti.map((item, index) => {
                const punto = punti.find((p) => p.id === item.id);
                return (
                  <div
                    key={item.id}
                    style={{
                      padding: '8px 12px',
                      marginBottom: 4,
                      background: '#e3f2fd',
                      borderRadius: 6,
                      border: '1px solid #90caf9',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span>
                        <strong>{index + 1}.</strong> {item.id} - {punto?.descrizione ?? '?'}
                      </span>
                      <span>
                        <button title="Sposta su" onClick={() => spostaPunto(index, -1)} disabled={index === 0} style={{ marginRight: 4 }}>↑</button>
                        <button title="Sposta giù" onClick={() => spostaPunto(index, 1)} disabled={index === form.sequenza_punti.length - 1} style={{ marginRight: 4 }}>↓</button>
                        <button title="Rimuovi dalla sequenza" onClick={() => togglePunto(item.id)}>✕</button>
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, color: '#666' }}>Tempo stimato:</span>
                      <input
                        type="number"
                        min={0}
                        max={1440}
                        value={item.tempo_stimato}
                        onChange={(e) => aggiornaTempo(index, parseInt(e.target.value) || 0)}
                        style={{
                          width: 70,
                          padding: '4px 8px',
                          border: '1px solid #ccc',
                          borderRadius: 4,
                          fontSize: 13,
                        }}
                      />
                      <span style={{ fontSize: 13, color: '#666' }}>min ({formattaTempo(item.tempo_stimato)})</span>
                    </div>
                  </div>
                );
              })}
              {form.sequenza_punti.length === 0 && (
                <p style={{ color: '#999' }}>Clicca i punti disponibili per aggiungerli al percorso</p>
              )}
            </div>
          </div>

          <button className="btn-primary" onClick={salvaPercorso} style={{ width: 'auto', padding: '10px 24px', marginTop: 24 }}>
            {editingId ? 'Aggiorna' : 'Salva'}
          </button>
        </div>
      )}

      {!showForm && (
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Sede</th>
              <th>Punti</th>
              <th>Sequenza</th>
              <th>Durata</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {percorsi.map((p) => {
              const raw = p.sequenza_punti;
              const sequenza: PuntoSequenza[] = Array.isArray(raw)
                ? raw.map((s: any) => {
                    if (typeof s === 'string') {
                      try { const parsed = JSON.parse(s); return { id: parsed.id || s, tempo_stimato: parsed.tempo_stimato || 0 }; }
                      catch { return { id: s, tempo_stimato: 0 }; }
                    }
                    return { id: s.id || '', tempo_stimato: s.tempo_stimato || 0 };
                  })
                : [];
              const durataTot = sequenza.reduce((tot, s) => tot + s.tempo_stimato, 0);
              return (
                <tr key={p.id}>
                  <td><strong>{p.nome}</strong></td>
                  <td>{p.sede_nome}</td>
                  <td>{sequenza.length}</td>
                  <td style={{ fontSize: 13 }}>
                    {sequenza.map((s) => {
                      const punto = punti.find((pt) => pt.id === s.id);
                      return punto?.descrizione || s.id;
                    }).join(' → ')}
                  </td>
                  <td>{durataTot} min</td>
                  <td>
                    <button title="Modifica percorso" onClick={() => modifica(p)} style={{ marginRight: 8 }}>✏️</button>
                    <button title="Elimina percorso" onClick={() => elimina(p.id)}>🗑️</button>
                  </td>
                </tr>
              );
            })}
            {percorsi.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: '#999' }}>
                  Nessun percorso configurato.
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
