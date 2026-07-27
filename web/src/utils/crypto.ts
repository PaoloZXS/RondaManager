/**
 * Utility di crittografia per il pannello web.
 * Usa l'API Web Crypto (disponibile in tutti i browser moderni).
 */

const CONFIG_QR_SECRET = 'R0nd4C0nfigS3cr3t!';
const SECRET_HARDCODED = 'R0nd4S3cr3t!';
const SALT = new TextEncoder().encode('R0nd4S4lt!');

/// Passphrase default usata dall'app mobile (stesso valore di constants.dart).
const DEFAULT_PASSPHRASE = 'Codarini2026';

/**
 * Deriva una chiave AES-256-GCM usando PBKDF2.
 */
async function deriveKey(
  passphrase: string,
  salt: Uint8Array,
  iterations: number = 10000
): Promise<CryptoKey> {
  // Workaround per TypeScript strict su BufferSource
  const saltBuffer = salt.buffer as ArrayBuffer;
  
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations,
      hash: 'SHA-256',
    } as Pbkdf2Params,
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Cifra il QR Code di configurazione.
 * Usata per generare il QR dal pannello admin.
 */
export async function encryptQrConfig(
  plainText: string,
  secret?: string
): Promise<string> {
  const key = await deriveKey(secret ?? CONFIG_QR_SECRET, SALT);

  // Genera un nonce casuale di 12 byte
  const nonce = crypto.getRandomValues(new Uint8Array(12));

  const encoded = new TextEncoder().encode(plainText);

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    key,
    encoded
  );

  // Combina nonce + ciphertext
  const combined = new Uint8Array(nonce.length + encrypted.byteLength);
  combined.set(nonce, 0);
  combined.set(new Uint8Array(encrypted), nonce.length);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Decifra il CSV cifrato con la passphrase derivata.
 */
export async function decryptCsv(
  cipherBase64: string,
  passphraseOffuscata: string
): Promise<string> {
  const combined = Uint8Array.from(atob(cipherBase64), (c) => c.charCodeAt(0));

  const fullPassphrase = passphraseOffuscata + SECRET_HARDCODED;
  const key = await deriveKey(fullPassphrase, SALT);

  const nonce = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: nonce },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
}

/**
 * Genera il contenuto JSON da cifrare per il QR Code.
 */
export function buildQrConfigContent(config: {
  supabaseUrl: string;
  supabaseAnonKey: string;
  idTelefono: string;
  passphrase: string;
  guardie: any[];
  percorsi: any[];
  timeoutSlog?: number;
  gpsObbligatorio?: boolean;
  batteriaMinima?: number;
}): string {
  return JSON.stringify({
    supabase_url: config.supabaseUrl,
    supabase_anon_key: config.supabaseAnonKey,
    id_telefono: config.idTelefono,
    passphrase: config.passphrase,
    segreto: SECRET_HARDCODED,
    guardie: config.guardie,
    percorsi: config.percorsi,
    timeout_slog: config.timeoutSlog ?? 300,
    gps_obbligatorio: config.gpsObbligatorio ?? false,
    batteria_minima: config.batteriaMinima ?? 10.0,
  });
}
