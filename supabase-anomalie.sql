-- Tabella per tracciare le anomalie risolte
CREATE TABLE IF NOT EXISTS anomalie_risolte (
  id TEXT PRIMARY KEY, -- formato: "turnoId_puntoId_timestamp"
  id_turno TEXT NOT NULL REFERENCES turni(id) ON DELETE CASCADE,
  risolta BOOLEAN DEFAULT TRUE,
  risolta_il TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  note_risoluzione TEXT DEFAULT ''
);

ALTER TABLE anomalie_risolte ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Accesso pubblico - anomalie_risolte"
  ON anomalie_risolte FOR ALL USING (true);
