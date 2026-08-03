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
  const [showForm, setShowForm] = useState(true);

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
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ whiteSpace: 'nowrap' }}>Punti di Controllo</h1>
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
                style={{ flex: 1, padding: 10, border: '1px solid #ddd', borderRadius: 8, background: editingId ? '#e3f2fd' : undefined }}
              />
              <input type="text"
                placeholder="Descrizione"
                value={form.descrizione}
                onChange={(e) => setForm({ ...form, descrizione: e.target.value })}
                style={{ flex: 2, padding: 10, border: '1px solid #ddd', borderRadius: 8, background: editingId ? '#e3f2fd' : undefined }}
              />
            </div>

            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 16 }}>
              <button className="btn-primary" onClick={salvaPunto}
                disabled={!form.id.trim() || !form.descrizione.trim()}
                style={{ width: 'auto', padding: '10px 24px', opacity: (!form.id.trim() || !form.descrizione.trim()) ? 0.5 : 1, cursor: (!form.id.trim() || !form.descrizione.trim()) ? 'not-allowed' : 'pointer' }}>
                {editingId ? 'Aggiorna' : 'Salva'}
              </button>
              <button onClick={() => resetForm()} style={{ padding: '10px 24px', background: '#6b7280', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ maxHeight: 480, overflowY: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th>ID TAG</th>
              <th>Descrizione Punto di Controllo</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {punti.map((p, idx) => (
              <tr key={p.id} onClick={() => modifica(p)} style={{
                cursor: 'pointer',
                background: idx % 2 === 1 ? '#fdf8f0' : '#f5ede0',
                ...(editingId === p.id ? { border: '2px solid #4f46e5' } : {}),
              }}>
                <td style={{ padding: '6px 10px' }}><strong>{p.id}</strong></td>
                <td style={{ padding: '6px 10px' }}>{p.descrizione}</td>
                <td style={{ padding: '6px 10px' }} onClick={(e) => e.stopPropagation()}>
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
