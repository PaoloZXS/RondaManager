-- =============================================
-- RondaManager - Migrazione Database Supabase
-- =============================================
-- Esegui questo SQL nel SQL Editor di Supabase
-- ATTENZIONE: Droppa TUTTO e ricrea da zero

-- Drop tabelle esistenti (ordine inverso per FK)
DROP TABLE IF EXISTS turni CASCADE;
DROP TABLE IF EXISTS guardie_telefoni CASCADE;
DROP TABLE IF EXISTS telefoni_percorsi CASCADE;
DROP TABLE IF EXISTS telefoni CASCADE;
DROP TABLE IF EXISTS punti_controllo CASCADE;
DROP TABLE IF EXISTS percorsi CASCADE;
DROP TABLE IF EXISTS guardie CASCADE;
DROP TABLE IF EXISTS sedi CASCADE;
DROP TABLE IF EXISTS utenti CASCADE;
DROP TABLE IF EXISTS impostazioni CASCADE;

-- =============================================
-- 1. TABELLA SEDI
-- =============================================
CREATE TABLE IF NOT EXISTS sedi (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  indirizzo TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 2. TABELLA PERCORSI (con id_sede)
-- =============================================
CREATE TABLE IF NOT EXISTS percorsi (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  sequenza_punti JSONB NOT NULL DEFAULT '[]',
  id_sede TEXT NOT NULL REFERENCES sedi(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 3. TABELLA PUNTI DI CONTROLLO (con id_percorso)
-- =============================================
CREATE TABLE IF NOT EXISTS punti_controllo (
  id TEXT PRIMARY KEY,
  descrizione TEXT NOT NULL,
  id_percorso TEXT REFERENCES percorsi(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 4. TABELLA GUARDIE (con id_sede)
-- =============================================
CREATE TABLE IF NOT EXISTS guardie (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  pin TEXT NOT NULL,
  id_sede TEXT NOT NULL REFERENCES sedi(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 5. TABELLA TELEFONI (con id_sede)
-- =============================================
CREATE TABLE IF NOT EXISTS telefoni (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  id_sede TEXT NOT NULL REFERENCES sedi(id),
  bloccato BOOLEAN DEFAULT FALSE,
  note TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 6. TABELLA GUARDIE_TELEFONI (N:N)
-- =============================================
CREATE TABLE IF NOT EXISTS guardie_telefoni (
  id_guardia TEXT NOT NULL REFERENCES guardie(id) ON DELETE CASCADE,
  id_telefono TEXT NOT NULL REFERENCES telefoni(id) ON DELETE CASCADE,
  PRIMARY KEY (id_guardia, id_telefono)
);

-- =============================================
-- 7. TABELLA TELEFONI_PERCORSI (N:N)
-- =============================================
CREATE TABLE IF NOT EXISTS telefoni_percorsi (
  id_telefono TEXT NOT NULL REFERENCES telefoni(id) ON DELETE CASCADE,
  id_percorso TEXT NOT NULL REFERENCES percorsi(id) ON DELETE CASCADE,
  PRIMARY KEY (id_telefono, id_percorso)
);

-- =============================================
-- 8. TABELLA TURNI
-- =============================================
CREATE TABLE IF NOT EXISTS turni (
  id TEXT PRIMARY KEY,
  id_guardia TEXT NOT NULL REFERENCES guardie(id),
  id_percorso TEXT NOT NULL REFERENCES percorsi(id),
  data_inizio TIMESTAMP WITH TIME ZONE NOT NULL,
  data_fine TIMESTAMP WITH TIME ZONE,
  completato BOOLEAN DEFAULT FALSE,
  sincronizzato BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 9. TABELLA UTENTI (login amministratore)
-- =============================================
CREATE TABLE IF NOT EXISTS utenti (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  password_modificata BOOLEAN DEFAULT FALSE,
  bloccato BOOLEAN DEFAULT FALSE
);

-- Inserisci admin di default se non esiste
INSERT INTO utenti (username, password)
SELECT 'admin', 'admin123'
WHERE NOT EXISTS (SELECT 1 FROM utenti WHERE username = 'admin');

-- =============================================
-- 10. TABELLA IMPOSTAZIONI (impostazioni globali)
-- =============================================
CREATE TABLE IF NOT EXISTS impostazioni (
  chiave TEXT PRIMARY KEY,
  valore TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Impostazione di default: scadenza sessione app mobile (minuti)
INSERT INTO impostazioni (chiave, valore)
SELECT 'session_timeout_minutes', '480'
WHERE NOT EXISTS (SELECT 1 FROM impostazioni WHERE chiave = 'session_timeout_minutes');

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_turni_guardia ON turni(id_guardia);
CREATE INDEX IF NOT EXISTS idx_turni_data ON turni(data_inizio DESC);
CREATE INDEX IF NOT EXISTS idx_guardie_nome ON guardie(nome);
CREATE INDEX IF NOT EXISTS idx_guardie_sede ON guardie(id_sede);
CREATE INDEX IF NOT EXISTS idx_telefoni_sede ON telefoni(id_sede);
CREATE INDEX IF NOT EXISTS idx_percorsi_sede ON percorsi(id_sede);
CREATE INDEX IF NOT EXISTS idx_punti_percorso ON punti_controllo(id_percorso);

-- =============================================
-- Storage Buckets (da creare tramite UI o API)
-- =============================================
-- Crea i seguenti bucket:
-- 1. ronde-csv (per CSV cifrati)
-- 2. ronde-foto (per le foto)
-- 3. ronde-apk (per la distribuzione APK)

-- =============================================
-- Row Level Security (RLS)
-- =============================================

-- Abilita RLS sulle tabelle
ALTER TABLE sedi ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardie ENABLE ROW LEVEL SECURITY;
ALTER TABLE utenti ENABLE ROW LEVEL SECURITY;
ALTER TABLE punti_controllo ENABLE ROW LEVEL SECURITY;
ALTER TABLE percorsi ENABLE ROW LEVEL SECURITY;
ALTER TABLE turni ENABLE ROW LEVEL SECURITY;
ALTER TABLE telefoni ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardie_telefoni ENABLE ROW LEVEL SECURITY;
ALTER TABLE telefoni_percorsi ENABLE ROW LEVEL SECURITY;
ALTER TABLE impostazioni ENABLE ROW LEVEL SECURITY;

-- Policy: accesso pubblico in lettura per tutti (anon key)
CREATE POLICY "Accesso pubblico in lettura - sedi"
  ON sedi FOR SELECT USING (true);
CREATE POLICY "Accesso pubblico in lettura - utenti"
  ON utenti FOR SELECT USING (true);
CREATE POLICY "Accesso pubblico in lettura - guardie"
  ON guardie FOR SELECT USING (true);
CREATE POLICY "Accesso pubblico in lettura - punti_controllo"
  ON punti_controllo FOR SELECT USING (true);
CREATE POLICY "Accesso pubblico in lettura - percorsi"
  ON percorsi FOR SELECT USING (true);
CREATE POLICY "Accesso pubblico in lettura - turni"
  ON turni FOR SELECT USING (true);
CREATE POLICY "Accesso pubblico in lettura - telefoni"
  ON telefoni FOR SELECT USING (true);
CREATE POLICY "Accesso pubblico in lettura - guardie_telefoni"
  ON guardie_telefoni FOR SELECT USING (true);
CREATE POLICY "Accesso pubblico in lettura - telefoni_percorsi"
  ON telefoni_percorsi FOR SELECT USING (true);
CREATE POLICY "Accesso pubblico in lettura - impostazioni"
  ON impostazioni FOR SELECT USING (true);

-- Policy: accesso pubblico in scrittura (per admin)
CREATE POLICY "Accesso pubblico scrittura - sedi"
  ON sedi FOR ALL USING (true);
CREATE POLICY "Accesso pubblico scrittura - utenti"
  ON utenti FOR ALL USING (true);
CREATE POLICY "Accesso pubblico scrittura - guardie"
  ON guardie FOR ALL USING (true);
CREATE POLICY "Accesso pubblico scrittura - punti_controllo"
  ON punti_controllo FOR ALL USING (true);
CREATE POLICY "Accesso pubblico scrittura - percorsi"
  ON percorsi FOR ALL USING (true);
CREATE POLICY "Accesso pubblico scrittura - turni"
  ON turni FOR ALL USING (true);
CREATE POLICY "Accesso pubblico scrittura - telefoni"
  ON telefoni FOR ALL USING (true);
CREATE POLICY "Accesso pubblico scrittura - guardie_telefoni"
  ON guardie_telefoni FOR ALL USING (true);
CREATE POLICY "Accesso pubblico scrittura - telefoni_percorsi"
  ON telefoni_percorsi FOR ALL USING (true);
CREATE POLICY "Accesso pubblico scrittura - impostazioni"
  ON impostazioni FOR ALL USING (true);
