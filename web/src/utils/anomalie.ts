import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient, listCsvFiles, downloadCsv } from '../services/supabase';
import { decryptCsv } from './crypto';

export interface Anomalia {
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
  telefonoId?: string;
}

const PASSPHRASE = 'Codarini2026';

/** Trova il telefono che contiene i CSV di un determinato turno. */
async function trovaTelefonoPerTurno(
  supabase: SupabaseClient,
  idTurno: string
): Promise<string | null> {
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

/**
 * Carica le anomalie (punti con nota) di un singolo turno.
 * Restituisce solo i punti che presentano un'anomalia segnalata.
 */
export async function caricaAnomalieTurno(idTurno: string): Promise<Anomalia[]> {
  const supabase = getSupabaseClient();

  const [
    { data: percorsi },
    { data: punti },
    { data: risolte },
    { data: turno },
  ] = await Promise.all([
    supabase.from('percorsi').select('id, nome'),
    supabase.from('punti_controllo').select('id, descrizione'),
    supabase.from('anomalie_risolte').select('*'),
    supabase.from('turni').select('*').eq('id', idTurno).maybeSingle(),
  ]);

  if (!turno) return [];

  const mappaPercorsi: Record<string, string> = {};
  if (percorsi) for (const p of percorsi) mappaPercorsi[p.id] = p.nome;
  const mappaPunti: Record<string, string> = {};
  if (punti) for (const p of punti) mappaPunti[p.id] = p.descrizione;
  const mappaRisolte: Record<string, { risolta: boolean; note_risoluzione: string }> = {};
  if (risolte) for (const r of risolte) mappaRisolte[r.id] = { risolta: r.risolta !== false, note_risoluzione: r.note_risoluzione || '' };

  const telefonoId = await trovaTelefonoPerTurno(supabase, idTurno);
  if (!telefonoId) return [];

  const files = await listCsvFiles(telefonoId);
  const matchingFiles = files.filter((f: string) => f.includes(idTurno));
  matchingFiles.sort().reverse();

  const anomalie: Anomalia[] = [];
  for (const file of matchingFiles) {
    try {
      const csvCifrato = await downloadCsv(telefonoId, file);
      const decifrato = await decryptCsv(csvCifrato, PASSPHRASE);
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
        const anomId = `${idTurno}_${idPunto}_${timestamp.replace(/[:.]/g, '-')}`;
        anomalie.push({
          id: anomId,
          idTurno,
          idPercorso: turno.id_percorso,
          percorsoNome: mappaPercorsi[turno.id_percorso] || '?',
          idPunto,
          puntoDescrizione: mappaPunti[idPunto] || idPunto,
          timestamp,
          nota,
          nomeFoto: nomeFoto || '',
          haFoto: !!nomeFoto,
          risolta: mappaRisolte[anomId]?.risolta ?? false,
          noteRisoluzione: mappaRisolte[anomId]?.note_risoluzione || '',
          telefonoId,
        });
      }
      break;
    } catch (_) {}
  }

  return anomalie;
}

/** Segna un'anomalia come risolta oppure la riapre (mantiene la nota). */
export async function toggleAnomaliaRisolta(anomalia: Anomalia): Promise<void> {
  const supabase = getSupabaseClient();
  if (anomalia.risolta) {
    await supabase
      .from('anomalie_risolte')
      .update({ risolta: false })
      .eq('id', anomalia.id);
  } else {
    await supabase.from('anomalie_risolte').upsert(
      {
        id: anomalia.id,
        id_turno: anomalia.idTurno,
        risolta: true,
        note_risoluzione: anomalia.noteRisoluzione || '',
      },
      { onConflict: 'id' }
    );
  }
}

/** Salva la nota di risoluzione senza modificare lo stato risolta. */
export async function salvaNotaAnomalia(anomalia: Anomalia): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('anomalie_risolte').upsert(
    {
      id: anomalia.id,
      id_turno: anomalia.idTurno,
      risolta: anomalia.risolta,
      note_risoluzione: anomalia.noteRisoluzione || '',
    },
    { onConflict: 'id' }
  );
  if (error) throw error;
}
