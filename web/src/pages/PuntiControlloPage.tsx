import { useEffect, useState } from 'react';
import { getSupabaseClient } from '../services/supabase';
import type { PuntoControllo, Percorso } from '../types';
import { showConfirm } from '../components/ConfirmDialog';

export default function PuntiControlloPage() {
  const [punti, setPunti] = useState<(PuntoControllo & { percorso_nome?: string })[]>([]);
  const [percorsi, setPercorsi] = useState<Percorso[]>([]);
  const [form, setForm] = useState({
    id: '',
    descrizione: '',
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    caricaDati();
  }, []);

  async function caricaDati() {
    const supabase = getSupabaseClient();
    const [rPunti, rPercorsi] = await Promise.all([
      supabase.from('punti_controllo').select('*').order('descrizione', { ascending: true }),
      supabase.from('percorsi').select('*'),
    ]);
    const percorsiList = rPercorsi.data || [];
    setPercorsi(percorsiList);
    if (rPunti.data) {
      const percorsiMap = new Map(percorsiList.map(p => [p.id, p.nome]));
      setPunti(rPunti.data.map(p => ({
        ...p,
        percorso_nome: percorsiMap.get(p.id_percorso) || '?',
      })));
    }
  }

  async function salvaPunto() {
    const supabase = getSupabaseClient();
    const payload: Record<string, any> = {
      id: form.id.replace(/^0+/, ''), // Rimuove zeri iniziali
      descrizione: form.descrizione,
    };
    // id_percorso viene assegnato automaticamente dalla pagina Percorsi

    if (editingId) {
      // Se l'ID è cambiato, cancella il vecchio e inserisce il nuovo
      if (editingId !== form.id) {
        await supabase.from('punti_controllo').delete().eq('id', editingId);
        await supabase.from('punti_controllo').insert(payload);
      } else {
        await supabase.from('punti_controllo').update(payload).eq('id', editingId);
      }
    } else {
      await supabase.from('punti_controllo').insert(payload);
    }

    resetForm();
    caricaDati();
  }

  function modifica(p: PuntoControllo & { percorso_nome?: string }) {
    setForm({
      id: p.id.replace(/^0+/, ''),
      descrizione: p.descrizione,
    });
    setEditingId(p.id);
    setShowForm(true);
  }

  async function elimina(id: string) {
    showConfirm({ message: 'Eliminare questo punto di controllo?', confirmText: 'Elimina', onConfirm: async () => {
      const supabase = getSupabaseClient();
      await supabase.from('punti_controllo').delete().eq('id', id);
      caricaDati();
    } });
  }

  function resetForm() {
    setForm({ id: '', descrizione: '' });
    setEditingId(null);
    setShowForm(false);
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'nowrap', gap: 12 }}>
        <h1 style={{ whiteSpace: 'nowrap' }}>Punti di Controllo</h1>
        <button onClick={() => { setShowForm(!showForm); if (showForm) resetForm(); }} style={{ padding: '8px 16px', background: '#1a237e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          {showForm ? 'Annulla' : '+ Nuovo Punto'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3>{editingId ? 'Modifica Punto' : 'Nuovo Punto di Controllo'}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <input type="text"
                placeholder="Avvicina TAG al lettore USB"
                value={form.id}
                onChange={(e) => setForm({ ...form, id: e.target.value })}
                style={{ flex: 1, padding: 10, border: '1px solid #ddd', borderRadius: 8 }}
              />
              <input type="text"
                placeholder="Descrizione"
                value={form.descrizione}
                onChange={(e) => setForm({ ...form, descrizione: e.target.value })}
                style={{ flex: 2, padding: 10, border: '1px solid #ddd', borderRadius: 8 }}
              />
            </div>

            <button className="btn-primary" onClick={salvaPunto} style={{ width: 'auto', padding: '10px 24px', alignSelf: 'flex-start', marginTop: 16 }}>
              {editingId ? 'Aggiorna' : 'Salva'}
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>ID TAG</th>
              <th>Descrizione Punto di Controllo</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {punti.map((p) => (
              <tr key={p.id}>
                <td><strong>{p.id}</strong></td>
                <td>{p.descrizione}</td>
                <td>
                  <button title="Modifica punto" onClick={() => modifica(p)} style={{ marginRight: 8 }}>✏️</button>
                  <button title="Elimina punto" onClick={() => elimina(p.id)}>🗑️</button>
                </td>
              </tr>
            ))}
            {punti.length === 0 && (
              <tr>
                <td colSpan={3} style={{ textAlign: 'center', color: '#999' }}>
                  Nessun punto di controllo configurato.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
