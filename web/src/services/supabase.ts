import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Usa proxy in sviluppo per evitare CORS
const isDev = window.location.hostname === 'localhost';
const supabaseUrl = isDev
  ? 'http://localhost:5173/supabase-proxy'
  : import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

/**
 * Restituisce l'istanza del client Supabase.
 */
export function getSupabaseClient(): SupabaseClient {
  if (!client) {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        'Credenziali Supabase mancanti. ' +
        'Imposta VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY in .env.local'
      );
    }
    client = createClient(supabaseUrl, supabaseAnonKey);
  }
  return client;
}

/**
 * Bucket names
 */
export const BUCKET_CSV = 'ronde-csv';
export const BUCKET_FOTO = 'ronde-foto';
export const BUCKET_APK = 'ronde-apk';

/**
 * Elenca tutti i CSV disponibili per un telefono.
 */
export async function listCsvFiles(idTelefono: string): Promise<string[]> {
  const supabase = getSupabaseClient();
  // Usa POST invece di GET per evitare problemi col proxy
  const url = `${supabaseUrl}/storage/v1/object/list/${BUCKET_CSV}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prefix: `${idTelefono}/csv`,
      limit: 100,
    }),
  });
  if (!res.ok) throw new Error(`Storage list error: ${res.status}`);
  const data = await res.json();
  return data.map((f: any) => f.name);
}

/**
 * Scarica un file CSV da Supabase Storage.
 */
export async function downloadCsv(
  idTelefono: string,
  nomeFile: string
): Promise<string> {
  const url = `${supabaseUrl}/storage/v1/object/public/${BUCKET_CSV}/${idTelefono}/csv/${nomeFile}`;
  const res = await fetch(url, {
    headers: {
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`,
    },
  });
  if (!res.ok) throw new Error(`Storage download error: ${res.status}`);
  return res.text();
}

/**
 * Ottiene l'URL pubblico di una foto.
 */
export function getFotoUrl(idTelefono: string, nomeFoto: string): string {
  const supabase = getSupabaseClient();
  const { data } = supabase.storage
    .from(BUCKET_FOTO)
    .getPublicUrl(`${idTelefono}/foto/${nomeFoto}`);

  return data.publicUrl;
}

/**
 * Blocca/sblocca un telefono.
 */
export async function setTelefonoBloccato(
  idTelefono: string,
  bloccato: boolean
): Promise<void> {
  const supabase = getSupabaseClient();

  if (bloccato) {
    // Crea file marker di blocco
    await supabase.storage
      .from(BUCKET_CSV)
      .upload(`bloccati/${idTelefono}.lock`, new Blob(['locked']));
  } else {
    // Rimuovi file marker di blocco
    await supabase.storage
      .from(BUCKET_CSV)
      .remove([`bloccati/${idTelefono}.lock`]);
  }
}

/**
 * Elimina un file CSV da Supabase Storage (per telefoni bloccati).
 */
export async function deleteCsv(
  idTelefono: string,
  nomeFile: string
): Promise<void> {
  const supabase = getSupabaseClient();
  await supabase.storage
    .from(BUCKET_CSV)
    .remove([`${idTelefono}/csv/${nomeFile}`]);
}

/**
 * Carica un APK su Supabase Storage.
 */
export async function uploadApk(
  file: File
): Promise<string> {
  const supabase = getSupabaseClient();
  const fileName = `rondamanager-v${Date.now()}.apk`;

  const { error } = await supabase.storage
    .from(BUCKET_APK)
    .upload(fileName, file);

  if (error) throw error;
  return fileName;
}

/**
 * Ottiene l'URL pubblico dell'APK per il QR Code di download.
 */
export function getApkDownloadUrl(fileName: string): string {
  const supabase = getSupabaseClient();
  const { data } = supabase.storage
    .from(BUCKET_APK)
    .getPublicUrl(fileName);

  return data.publicUrl;
}

/**
 * Query helper per le tabelle del database.
 */
export const db = {
  sedi: () => getSupabaseClient().from('sedi').select('*'),
  guardie: () => getSupabaseClient().from('guardie').select('*'),
  puntiControllo: () => getSupabaseClient().from('punti_controllo').select('*'),
  percorsi: () => getSupabaseClient().from('percorsi').select('*'),
  turni: () => getSupabaseClient().from('turni').select('*'),
  telefoni: () => getSupabaseClient().from('telefoni').select('*'),
  guardieTelefoni: () => getSupabaseClient().from('guardie_telefoni').select('*'),
  telefoniPercorsi: () => getSupabaseClient().from('telefoni_percorsi').select('*'),
};
