import { useEffect, useState } from 'react';
import { getSupabaseClient } from '../services/supabase';
import type { Sede } from '../types';
import { showConfirm } from '../components/ConfirmDialog';

export default function SediPage() {
  const [sedi, setSedi] = useState<Sede[]>([]);
  const [form, setForm] = useState({ nome: '', indirizzo: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    caricaSedi();
  }, []);

  async function caricaSedi() {
    const supabase = getSupabaseClient();
    const { data } = await supabase.from('sedi').select('*');
    if (data) setSedi(data);
  }

  async function salvaSede() {
    const supabase = getSupabaseClient();
    if (editingId) {
      await supabase.from('sedi').update(form).eq('id', editingId);
    } else {
      await supabase.from('sedi').insert({
        ...form,
        id: crypto.randomUUID(),
      });
    }
    setForm({ nome: '', indirizzo: '' });
    setEditingId(null);
    setShowForm(false);
    caricaSedi();
  }

  function modifica(s: Sede) {
    setForm({ nome: s.nome, indirizzo: s.indirizzo });
    setEditingId(s.id);
    setShowForm(true);
  }

  async function elimina(id: string) {
    showConfirm({
      title: 'Elimina sede',
      message: 'Eliminare questa sede? Verranno eliminati anche sorveglianti, percorsi, telefoni collegati.',
      confirmText: 'Elimina',
      onConfirm: async () => {
        const supabase = getSupabaseClient();
        await supabase.from('sedi').delete().eq('id', id);
        caricaDati();
      },
    });
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'nowrap', gap: 12 }}>
        <h1 style={{ whiteSpace: 'nowrap' }}>Sedi</h1>
        <button onClick={() => { setShowForm(!showForm); setEditingId(null); setForm({ nome: '', indirizzo: '' }); }} style={{ padding: '8px 16px', background: '#1a237e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          {showForm ? 'Annulla' : '+ Nuova Sede'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3>{editingId ? 'Modifica Sede' : 'Nuova Sede'}</h3>
          <div style={{ display: 'flex', gap: 16, flexDirection: 'column' }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 500, fontSize: 14, color: '#555' }}>
                  Nome Sede
                </label>
                <input type="text"
                  placeholder="es. SEDE A"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  style={{ width: '100%', padding: 10, border: '1px solid #ddd', borderRadius: 8, boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ flex: 2, minWidth: 200 }}>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 500, fontSize: 14, color: '#555' }}>
                  Indirizzo
                </label>
                <input type="text"
                  placeholder="es. Via Roma 1, Milano"
                  value={form.indirizzo}
                  onChange={(e) => setForm({ ...form, indirizzo: e.target.value })}
                  style={{ width: '100%', padding: 10, border: '1px solid #ddd', borderRadius: 8, boxSizing: 'border-box' }}
                />
              </div>
            </div>
            <div>
              <button className="btn-primary" onClick={salvaSede} style={{ width: 'auto', padding: '10px 24px' }}>
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
              <th>Nome</th>
              <th>Indirizzo</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {sedi.map((s) => (
              <tr key={s.id}>
                <td><strong>{s.nome}</strong></td>
                <td>{s.indirizzo || '-'}</td>
                <td>
                  <button title="Modifica sede" onClick={() => modifica(s)} style={{ marginRight: 8 }}>✏️</button>
                  <button title="Elimina sede" onClick={() => elimina(s.id)}>🗑️</button>
                </td>
              </tr>
            ))}
            {sedi.length === 0 && (
              <tr>
                <td colSpan={3} style={{ textAlign: 'center', color: '#999' }}>
                  Nessuna sede configurata. Clicca "+ Nuova Sede" per crearne una.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
