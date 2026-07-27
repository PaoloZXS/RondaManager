import { useEffect, useState } from 'react';
import { getSupabaseClient, setTelefonoBloccato } from '../services/supabase';
import type { Sede, Percorso } from '../types';

export default function TelefoniPage() {
  const [telefoni, setTelefoni] = useState<any[]>([]);
  const [sedi, setSedi] = useState<Sede[]>([]);
  const [percorsi, setPercorsi] = useState<Percorso[]>([]);
  const [telefoniPercorsi, setTelefoniPercorsi] = useState<{ id_telefono: string; id_percorso: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ id: '', nome: '', id_sede: '' });
  const [selectedPercorsi, setSelectedPercorsi] = useState<string[]>([]);

  useEffect(() => {
    caricaDati();
  }, []);

  async function caricaDati() {
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const [rTelefoni, rSedi, rPercorsi, rTP] = await Promise.all([
        supabase.from('telefoni').select('*'),
        supabase.from('sedi').select('*'),
        supabase.from('percorsi').select('*'),
        supabase.from('telefoni_percorsi').select('*'),
      ]);

      const sediList = rSedi.data || [];
      const percorsiList = rPercorsi.data || [];
      const tpList = rTP.data || [];

      setSedi(sediList);
      setPercorsi(percorsiList);
      setTelefoniPercorsi(tpList);

      if (rTelefoni.data) {
        const sediMap = new Map(sediList.map(s => [s.id, s.nome]));
        const percorsiPerTelefono = new Map<string, string[]>();
        tpList.forEach(tp => {
          const list = percorsiPerTelefono.get(tp.id_telefono) || [];
          const p = percorsiList.find(pp => pp.id === tp.id_percorso);
          if (p) list.push(p.nome);
          percorsiPerTelefono.set(tp.id_telefono, list);
        });

        setTelefoni(rTelefoni.data.map(t => ({
          ...t,
          sede_nome: sediMap.get(t.id_sede) || '?',
          percorsi_nomi: percorsiPerTelefono.get(t.id) || [],
        })));
      }
    } catch (err) {
      console.error('Errore caricamento telefoni:', err);
    } finally {
      setLoading(false);
    }
  }

  async function salvaTelefono() {
    if (!form.id.trim()) return;
    if (!form.id_sede) { alert('Seleziona una sede'); return; }
    const supabase = getSupabaseClient();
    const payload = { id: form.id.trim(), nome: form.nome.trim() || form.id.trim(), id_sede: form.id_sede, bloccato: false, note: '' };

    if (editingId) {
      await supabase.from('telefoni').update(payload).eq('id', editingId);
    } else {
      await supabase.from('telefoni').insert(payload);
    }

    // Aggiorna telefoni_percorsi
    await supabase.from('telefoni_percorsi').delete().eq('id_telefono', form.id.trim());
    if (selectedPercorsi.length > 0) {
      await supabase.from('telefoni_percorsi').insert(
        selectedPercorsi.map(id_percorso => ({ id_telefono: form.id.trim(), id_percorso }))
      );
    }

    resetForm();
    caricaDati();
  }

  function modifica(t: any) {
    setForm({ id: t.id, nome: t.nome, id_sede: t.id_sede });
    const percorsiAssegnati = telefoniPercorsi
      .filter(tp => tp.id_telefono === t.id)
      .map(tp => tp.id_percorso);
    setSelectedPercorsi(percorsiAssegnati);
    setEditingId(t.id);
    setShowForm(true);
  }

  async function elimina(id: string) {
    if (!confirm('Eliminare questo telefono?')) return;
    const supabase = getSupabaseClient();
    await supabase.from('guardie_telefoni').delete().eq('id_telefono', id);
    await supabase.from('telefoni_percorsi').delete().eq('id_telefono', id);
    await supabase.from('telefoni').delete().eq('id', id);
    caricaDati();
  }

  async function toggleBlocco(id: string, attualmenteBloccato: boolean) {
    const supabase = getSupabaseClient();
    const nuovoStato = !attualmenteBloccato;
    await supabase.from('telefoni').update({ bloccato: nuovoStato }).eq('id', id);
    await setTelefonoBloccato(id, nuovoStato);
    caricaDati();
  }

  function resetForm() {
    setForm({ id: '', nome: '', id_sede: '' });
    setSelectedPercorsi([]);
    setEditingId(null);
    setShowForm(false);
  }

  function togglePercorso(id: string) {
    setSelectedPercorsi(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  }

  const percorsiOptions = form.id_sede
    ? percorsi.filter(p => p.id_sede === form.id_sede)
    : [];

  if (loading) return <div style={{ padding: 24, textAlign: 'center' }}>Caricamento...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'nowrap', gap: 12 }}>
        <h1 style={{ whiteSpace: 'nowrap' }}>Gestione Telefoni</h1>
        <button onClick={() => { if (!showForm) resetForm(); setShowForm(!showForm); }} style={{ padding: '8px 16px', background: '#1a237e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          {showForm ? 'Annulla' : '+ Nuovo Telefono'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ maxWidth: 600, marginBottom: 24 }}>
          <h3>{editingId ? 'Modifica Telefono' : 'Nuovo Telefono'}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input type="text"
              value={form.id}
              onChange={(e) => setForm({ ...form, id: e.target.value })}
              placeholder="ID Telefono (es. TEL-001)"
              disabled={!!editingId}
              style={{ padding: 10, border: '1px solid #ddd', borderRadius: 8 }}
            />
            <input type="text"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Nome (es. Telefono Paolo)"
              style={{ padding: 10, border: '1px solid #ddd', borderRadius: 8 }}
            />

            {/* Select Sede */}
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 500, fontSize: 14, color: '#555' }}>
                Il telefono appartiene alla sede di :
              </label>
              <select
                value={form.id_sede}
                onChange={(e) => { setForm({ ...form, id_sede: e.target.value }); setSelectedPercorsi([]); }}
                style={{ width: '100%', padding: 10, border: '1px solid #ddd', borderRadius: 8 }}
              >
                <option value="">-- Seleziona Sede --</option>
                {sedi.map(s => (
                  <option key={s.id} value={s.id}>{s.nome}</option>
                ))}
              </select>
            </div>

            {/* Percorsi multi-select */}
            {form.id_sede && (
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 500, fontSize: 14, color: '#555' }}>
                  Percorsi assegnati
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, maxHeight: 150, overflowY: 'auto', padding: 8, border: '1px solid #ddd', borderRadius: 8 }}>
                  {percorsiOptions.length === 0 && (
                    <span style={{ color: '#999', fontSize: 13 }}>Nessun percorso in questa sede. Crea prima i percorsi.</span>
                  )}
                  {percorsiOptions.map(p => (
                    <label
                      key={p.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                        padding: '6px 12px', borderRadius: 6,
                        background: selectedPercorsi.includes(p.id) ? '#c5cae9' : '#e0e0e0',
                        border: selectedPercorsi.includes(p.id) ? '1px solid #7986cb' : '1px solid #bbb',
                        userSelect: 'none',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedPercorsi.includes(p.id)}
                        onChange={() => togglePercorso(p.id)}
                      />
                      {p.nome}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div>
              <button className="btn-primary" onClick={salvaTelefono} style={{ width: 'auto', padding: '10px 24px' }}>
                {editingId ? 'Aggiorna' : 'Salva'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nome</th>
              <th>Sede</th>
              <th>Percorsi</th>
              <th>Stato</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {telefoni.map((t) => (
              <tr key={t.id} style={{ opacity: t.bloccato ? 0.6 : 1 }}>
                <td><strong>{t.id}</strong></td>
                <td>{t.nome}</td>
                <td>{t.sede_nome}</td>
                <td>{(t.percorsi_nomi || []).join(', ') || '-'}</td>
                <td>
                  {t.bloccato ? (
                    <span className="badge red">Bloccato</span>
                  ) : (
                    <span className="badge green">Attivo</span>
                  )}
                </td>
                <td>
                  <button title="Modifica telefono" onClick={() => modifica(t)} style={{ marginRight: 8 }}>✏️</button>
                  <button title={t.bloccato ? 'Sblocca telefono' : 'Blocca telefono'} onClick={() => setTelefonoBloccato(t.id, !t.bloccato)} style={{ marginRight: 8 }}>
                    {t.bloccato ? '🔓' : '🔒'}
                  </button>
                  <button title="Elimina telefono" onClick={() => elimina(t.id)}>🗑️</button>
                </td>
              </tr>
            ))}
            {telefoni.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: '#999' }}>
                  Nessun telefono configurato.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
