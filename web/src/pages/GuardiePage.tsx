import { useEffect, useState } from 'react';
import { getSupabaseClient } from '../services/supabase';
import type { Guardia, Sede, Telefono } from '../types';
import { showConfirm } from '../components/ConfirmDialog';
import { showAlert } from '../components/AlertToast';

export default function GuardiePage() {
  const [guardie, setGuardie] = useState<(Guardia & { sede_nome?: string; telefoni?: string[] })[]>([]);
  const [sedi, setSedi] = useState<Sede[]>([]);
  const [telefoni, setTelefoni] = useState<Telefono[]>([]);
  const [guardieTelefoni, setGuardieTelefoni] = useState<{ id_guardia: string; id_telefono: string }[]>([]);
  const [form, setForm] = useState({ nome: '', pin: '', id_sede: '' });
  const [selectedTelefoni, setSelectedTelefoni] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [mostraPin, setMostraPin] = useState(false);

  useEffect(() => {
    caricaDati();
  }, []);

  async function caricaDati() {
    const supabase = getSupabaseClient();
    const [rGuardie, rSedi, rTelefoni, rGT] = await Promise.all([
      supabase.from('guardie').select('*'),
      supabase.from('sedi').select('*'),
      supabase.from('telefoni').select('*'),
      supabase.from('guardie_telefoni').select('*'),
    ]);

    const sediList = rSedi.data || [];
    const telefoniList = rTelefoni.data || [];
    const gtList = rGT.data || [];

    setSedi(sediList);
    setTelefoni(telefoniList);
    setGuardieTelefoni(gtList);

    if (rGuardie.data) {
      const sediMap = new Map(sediList.map(s => [s.id, s.nome]));
      const telefoniPerGuardia = new Map<string, string[]>();
      gtList.forEach(gt => {
        const list = telefoniPerGuardia.get(gt.id_guardia) || [];
        const tel = telefoniList.find(t => t.id === gt.id_telefono);
        if (tel) list.push(tel.nome);
        telefoniPerGuardia.set(gt.id_guardia, list);
      });

      setGuardie(rGuardie.data.map(g => ({
        ...g,
        sede_nome: sediMap.get(g.id_sede) || '?',
        telefoni: telefoniPerGuardia.get(g.id) || [],
      })));
    }
  }

  function telefonoIdsPerSede(idSede: string): Telefono[] {
    return telefoni.filter(t => t.id_sede === idSede);
  }

  async function salvaGuardia() {
    if (!form.id_sede) { showAlert({ message: 'Seleziona una sede' }); return; }
    const supabase = getSupabaseClient();
    const guardiaId = editingId || crypto.randomUUID();
    const payload = { id: guardiaId, nome: form.nome, pin: form.pin, id_sede: form.id_sede };

    if (editingId) {
      await supabase.from('guardie').update(payload).eq('id', editingId);
    } else {
      await supabase.from('guardie').insert(payload);
    }

    // Aggiorna guardie_telefoni: cancella vecchie e inserisce nuove
    await supabase.from('guardie_telefoni').delete().eq('id_guardia', guardiaId);
    if (selectedTelefoni.length > 0) {
      await supabase.from('guardie_telefoni').insert(
        selectedTelefoni.map(id_telefono => ({ id_guardia: guardiaId, id_telefono }))
      );
    }

    setForm({ nome: '', pin: '', id_sede: '' });
    setSelectedTelefoni([]);
    setEditingId(null);
    setShowForm(false);
    caricaDati();
  }

  function modifica(g: Guardia & { sede_nome?: string; telefoni?: string[] }) {
    setForm({ nome: g.nome, pin: g.pin, id_sede: g.id_sede });
    const telAssegnati = guardieTelefoni
      .filter(gt => gt.id_guardia === g.id)
      .map(gt => gt.id_telefono);
    setSelectedTelefoni(telAssegnati);
    setEditingId(g.id);
    setShowForm(true);
  }

  async function elimina(id: string) {
    showConfirm({ message: 'Eliminare questo sorvegliante?', confirmText: 'Elimina', onConfirm: async () => {
      const supabase = getSupabaseClient();
      await supabase.from('guardie_telefoni').delete().eq('id_guardia', id);
      await supabase.from('guardie').delete().eq('id', id);
      caricaDati();
    } });
  }

  function toggleTelefono(id: string) {
    setSelectedTelefoni(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  }

  const telefonoOptions = form.id_sede ? telefonoIdsPerSede(form.id_sede) : [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'nowrap', gap: 12 }}>
        <h1 style={{ whiteSpace: 'nowrap' }}>Sorveglianti</h1>
        <button onClick={() => { setShowForm(!showForm); setEditingId(null); setForm({ nome: '', pin: '', id_sede: '' }); setSelectedTelefoni([]); }} style={{ padding: '8px 16px', background: '#1a237e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          {showForm ? 'Annulla' : '+ Nuovo Sorvegliante'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3>{editingId ? 'Modifica Sorvegliante' : 'Nuovo Sorvegliante'}</h3>
          <div style={{ display: 'flex', gap: 16, flexDirection: 'column' }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 500, fontSize: 14, color: '#555' }}>
                  Nome Sorvegliante
                </label>
                <input type="text"
                  placeholder="es. Mario"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  autoComplete="off"
                  style={{ width: '100%', padding: 10, border: '1px solid #ddd', borderRadius: 8, boxSizing: 'border-box' }}
                />
              </div>


              <div style={{ flex: '0 0 140px' }}>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 500, fontSize: 14, color: '#555' }}>
                  PIN
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    placeholder="0000"
                    value={form.pin}
                    onChange={(e) => setForm({ ...form, pin: e.target.value })}
                    type={mostraPin ? 'text' : 'password'}
                    maxLength={6}
                    autoComplete="new-password"
                    style={{ width: '100%', padding: '10px 40px 10px 10px', border: '1px solid #ddd', borderRadius: 8, boxSizing: 'border-box' }}
                  />
                  <span
                    onClick={() => setMostraPin(!mostraPin)}
                    style={{
                      position: 'absolute',
                      right: 8,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      cursor: 'pointer',
                      userSelect: 'none',
                      fontSize: 18,
                    }}
                  >
                    {mostraPin ? '👁️' : '👁️‍🗨️'}
                  </span>
                </div>
              </div>
            </div>

            {/* Select Sede */}
            <div style={{ minWidth: 200 }}>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 500, fontSize: 14, color: '#555' }}>
                Sede di appartenenza
              </label>
              <select
                value={form.id_sede}
                onChange={(e) => { setForm({ ...form, id_sede: e.target.value }); setSelectedTelefoni([]); }}
                style={{ width: '100%', padding: 10, border: '1px solid #ddd', borderRadius: 8, boxSizing: 'border-box', background: '#fff' }}
              >
                <option value="">-- Seleziona Sede --</option>
                {sedi.map(s => (
                  <option key={s.id} value={s.id}>{s.nome}</option>
                ))}
              </select>
            </div>

            {/* Telefoni multi-select */}
            {form.id_sede && (
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 500, fontSize: 14, color: '#555' }}>
                  Telefoni che può usare
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, maxHeight: 150, overflowY: 'auto', padding: 8, border: '1px solid #ddd', borderRadius: 8 }}>
                  {telefonoOptions.length === 0 && (
                    <span style={{ color: '#999', fontSize: 13 }}>Nessun telefono in questa sede. Crea prima i telefoni.</span>
                  )}
                  {telefonoOptions.map(t => (
                    <label
                      key={t.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                        padding: '6px 12px', borderRadius: 6,
                        background: selectedTelefoni.includes(t.id) ? '#c5cae9' : '#e0e0e0',
                        border: selectedTelefoni.includes(t.id) ? '1px solid #7986cb' : '1px solid #bbb',
                        userSelect: 'none',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedTelefoni.includes(t.id)}
                        onChange={() => toggleTelefono(t.id)}
                      />
                      {t.nome} ({t.id})
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div>
              <button className="btn-primary" onClick={salvaGuardia} style={{ width: 'auto', padding: '10px 24px' }}>
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

              <th>PIN</th>
              <th>Sede</th>
              <th>Telefoni</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {guardie.map((g) => (
              <tr key={g.id}>
                <td>{g.nome}</td>

                <td>****</td>
                <td>{g.sede_nome}</td>
                <td>{g.telefoni?.join(', ') || '-'}</td>
                <td>
                  <button title="Modifica sorvegliante" onClick={() => modifica(g)} style={{ marginRight: 8 }}>✏️</button>
                  <button title="Elimina sorvegliante" onClick={() => elimina(g.id)}>🗑️</button>
                </td>
              </tr>
            ))}
            {guardie.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', color: '#999' }}>
                  Nessun sorvegliante configurato.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
