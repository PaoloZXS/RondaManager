// Tipi condivisi per il pannello web

export interface Sede {
  id: string;
  nome: string;
  indirizzo: string;
}

export interface Guardia {
  id: string;
  nome: string;
  pin: string;
  id_sede: string;
}

export interface PuntoControllo {
  id: string;
  descrizione: string;
  id_percorso?: string;
}

export interface PuntoSequenza {
  id: string;
  tempo_stimato: number; // minuti dall'inizio del turno
}

export interface Percorso {
  id: string;
  nome: string;
  sequenza_punti: PuntoSequenza[];
  id_sede: string;
}

export interface Turno {
  id: string;
  id_guardia: string;
  id_percorso: string;
  data_inizio: string;
  data_fine: string | null;
  completato: boolean;
  sincronizzato: boolean;
  archiviato?: boolean;
}

export interface Telefono {
  id: string;
  nome: string;
  id_sede: string;
  bloccato: boolean;
  note: string;
}

export interface DatoTimbro {
  id: string;
  id_punto: string;
  timestamp: string;
  latitudine: string;
  longitudine: string;
  batteria: string;
  nota: string;
  nome_foto: string;
  id_guardia: string;
  id_turno: string;
}

export interface ReportTurno {
  turno: Turno;
  guardia: Guardia;
  percorso: Percorso;
  timbri: DatoTimbro[];
  fotoUrls: string[];
}
