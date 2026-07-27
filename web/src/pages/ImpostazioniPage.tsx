import { useState, useEffect } from 'react';
import { getSupabaseClient } from '../services/supabase';

export default function ImpostazioniPage() {
  const [password, setPassword] = useState('');
  const [conferma, setConferma] = useState('');
  const [msg, setMsg] = useState('');
  const [errore, setErrore] = useState('');
  const [mostraPwd, setMostraPwd] = useState(false);
  const [mostraConferma, setMostraConferma] = useState(false);

  // Gestione nuovi utenti (solo superuser)
  const [nuovoUsername, setNuovoUsername] = useState('');
  const [nuovoPassword, setNuovoPassword] = useState('00000');
  const [utenti, setUtenti] = useState<any[]>([]);
  const [msgUtente, setMsgUtente] = useState('');
  const [editUser, setEditUser] = useState<any>(null);
  const [editUsername, setEditUsername] = useState('');
  const [deleteUser, setDeleteUser] = useState<any>(null);
  const isSuperuser = localStorage.getItem('is_superuser') === 'true';

  useEffect(() => {
    if (isSuperuser) caricaUtenti();
  }, []);

  async function caricaUtenti() {
    const supabase = getSupabaseClient();
    const { data } = await supabase.from('utenti').select('*');
    if (data) setUtenti(data);
  }

  async function creaUtente(e: React.FormEvent) {
    e.preventDefault();
    setMsgUtente('');
    setErrore('');
    if (!nuovoUsername.trim()) { setErrore('Inserisci un nome utente'); return; }

    const supabase = getSupabaseClient();
    const { error: err } = await supabase.from('utenti').insert({
      username: nuovoUsername.trim(),
      password: nuovoPassword || '00000',
      password_modificata: false,
    });

    if (err) {
      if (err.message.includes('duplicate')) setErrore('Utente già esistente');
      else setErrore('Errore nella creazione');
      return;
    }

    setNuovoUsername('');
    setMsgUtente(`Utente "${nuovoUsername.trim()}" creato! Password: ${nuovoPassword || '00000'}`);
    caricaUtenti();
  }

  async function salvaPassword(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    setErrore('');

    if (password.length < 4) {
      setErrore('La password deve essere almeno 4 caratteri');
      return;
    }
    if (password !== conferma) {
      setErrore('Le password non coincidono');
      return;
    }

    const username = localStorage.getItem('username');
    if (!username) {
      setErrore('Nessun utente loggato');
      return;
    }

    const supabase = getSupabaseClient();
    const { error: err } = await supabase
      .from('utenti')
      .update({ password, password_modificata: true })
      .eq('username', username);

    if (err) {
      setErrore('Errore nel salvataggio');
      return;
    }

    setPassword('');
    setConferma('');
    setMsg('Password aggiornata con successo!');
  }

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>Impostazioni</h1>

      {/* Sezione superuser: gestione utenti */}
      {isSuperuser && (
        <div className="card" style={{ maxWidth: 650, marginBottom: 24 }}>
          <h3>Gestione Utenti</h3>
          <p style={{ color: '#666', fontSize: 14, marginBottom: 12 }}>
            Crea nuovi utenti che potranno accedere con password provvisoria <strong>00000</strong>.
          </p>

          <form onSubmit={creaUtente} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <input type="text" value={nuovoUsername} onChange={(e) => setNuovoUsername(e.target.value)}
              placeholder="Nome utente" autoFocus
              style={{ flex: 1, padding: 10, border: '1px solid #ddd', borderRadius: 8, fontSize: 14 }} />
            <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '10px 24px' }}>
              + Crea Utente
            </button>
          </form>

          {msgUtente && <p style={{ color: '#38a169', fontSize: 13, marginBottom: 12 }}>{msgUtente}</p>}
          {errore && <p style={{ color: '#e53e3e', fontSize: 13, marginBottom: 12 }}>{errore}</p>}

          <table className="table" style={{ fontSize: 13 }}>
            <thead>
              <tr><th style={{ width: '40%' }}>Utente</th><th>Password</th><th>Blocco</th><th>Azioni</th></tr>
            </thead>
            <tbody>
              {utenti.map(u => (
                <tr key={u.id}>
                  <td><strong>{u.username}</strong></td>
                  <td style={{ fontFamily: 'monospace' }}>{u.password}</td>
                  <td>{u.bloccato
                    ? <span className="badge" style={{ background: '#e53e3e', color: '#fff' }}>Bloccato</span>
                    : <span className="badge" style={{ background: '#38a169', color: '#fff' }}>Attivo</span>}
                  </td>
                  <td style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => { setEditUser(u); setEditUsername(u.username); }} style={{ fontSize: 12, padding: '4px 8px', cursor: 'pointer' }} title="Modifica nome utente">✏️</button>
                    {u.username !== 'admin' && (
                      <button onClick={async () => {
                        const nuovoStato = !u.bloccato;
                        await getSupabaseClient().from('utenti').update({ bloccato: nuovoStato }).eq('id', u.id);
                        caricaUtenti();
                      }} style={{ fontSize: 12, padding: '4px 8px', cursor: 'pointer', color: u.bloccato ? '#e53e3e' : '#888' }} title={u.bloccato ? 'Sblocca' : 'Blocca'}>
                        {u.bloccato ? '🔓' : '🔒'}
                      </button>
                    )}
                    {u.username !== 'admin' && (
                      <button onClick={() => setDeleteUser(u)} style={{ fontSize: 12, padding: '4px 8px', cursor: 'pointer', color: '#e53e3e' }} title="Elimina utente">🗑️</button>
                    )}
                  </td>
                </tr>
              ))}
              {utenti.length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: '#999' }}>Nessun utente</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Cambio password personale (solo clienti) */}
      {!isSuperuser && (
      <div className="card" style={{ maxWidth: 650 }}>
        <h3>Cambio Password</h3>
        <p style={{ color: '#666', fontSize: 14, marginBottom: 16 }}>
          Inserisci la nuova password per l'utente <strong>{localStorage.getItem('username')}</strong>
        </p>
        <form onSubmit={salvaPassword} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ position: 'relative' }}>
            <input type={mostraPwd ? 'text' : 'password'} value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nuova password" autoFocus
              style={{ width: '100%', padding: 10, paddingRight: 40, border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
            <span onClick={() => setMostraPwd(!mostraPwd)} style={{
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              cursor: 'pointer', userSelect: 'none', fontSize: 18,
            }}>{mostraPwd ? '👁️' : '👁️‍🗨️'}</span>
          </div>
          <div style={{ position: 'relative' }}>
            <input type={mostraConferma ? 'text' : 'password'} value={conferma}
              onChange={(e) => setConferma(e.target.value)}
              placeholder="Conferma password"
              style={{ width: '100%', padding: 10, paddingRight: 40, border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
            <span onClick={() => setMostraConferma(!mostraConferma)} style={{
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              cursor: 'pointer', userSelect: 'none', fontSize: 18,
            }}>{mostraConferma ? '👁️' : '👁️‍🗨️'}</span>
          </div>
          {errore && <p style={{ color: '#e53e3e', fontSize: 13, margin: 0 }}>{errore}</p>}
          {msg && <p style={{ color: '#38a169', fontSize: 13, margin: 0 }}>{msg}</p>}
          <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '10px 24px' }}>
            Aggiorna Password
          </button>
        </form>
      </div>
      )}

      {/* Modal conferma eliminazione */}
      {deleteUser && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1060,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.45)',
        }} onClick={() => setDeleteUser(null)}>
          <div style={{
            background: '#fff', borderRadius: 12, padding: '28px 32px 20px',
            maxWidth: 480, width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            textAlign: 'center',
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Elimina Utente</div>
            <p style={{ fontSize: 14, color: '#555', lineHeight: 1.5, margin: '0 0 20px' }}>
              Eliminare l'utente <strong>{deleteUser.username}</strong>?
            </p>
            {deleteUser.username === 'admin' && (
              <p style={{ color: '#e53e3e', fontSize: 13, marginBottom: 16 }}>L'utente admin non può essere eliminato.</p>
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => setDeleteUser(null)} style={{ padding: '10px 24px', background: '#6b7280', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Annulla</button>
              <button onClick={async () => {
                if (deleteUser.username === 'admin') { alert('L\'utente admin non può essere eliminato.'); setDeleteUser(null); return; }
                try {
                  const { error } = await getSupabaseClient().from('utenti').delete().eq('id', deleteUser.id);
                  if (error) { alert('Errore: ' + error.message); return; }
                  setDeleteUser(null);
                  caricaUtenti();
                } catch (e: any) { alert('Errore: ' + e.message); }
              }} style={{
                padding: '8px 24px', borderRadius: 8, border: 'none',
                background: '#e53e3e', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600,
              }}>Elimina</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal modifica nome utente */}
      {editUser && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1060,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.45)',
        }} onClick={() => setEditUser(null)}>
          <div style={{
            background: '#fff', borderRadius: 12, padding: '28px 32px 20px',
            maxWidth: 480, width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            textAlign: 'center',
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Modifica Nome Utente</div>
            <input type="text" value={editUsername} onChange={(e) => setEditUsername(e.target.value)}
              autoFocus style={{ width: '100%', padding: 10, border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
              onKeyDown={(e) => { if (e.key === 'Enter') document.getElementById('btn-salva-nome')?.click(); }} />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 20 }}>
              <button onClick={() => setEditUser(null)} style={{ padding: '10px 24px', background: '#6b7280', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Annulla</button>
              <button id="btn-salva-nome" className="btn-primary" onClick={async () => {
                if (editUsername.trim() && editUsername.trim() !== editUser.username) {
                  await getSupabaseClient().from('utenti').update({ username: editUsername.trim() }).eq('id', editUser.id);
                  caricaUtenti();
                }
                setEditUser(null);
              }} style={{ width: 'auto', padding: '10px 24px' }}>Salva</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
