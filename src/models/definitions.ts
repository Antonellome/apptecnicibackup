import { Timestamp } from 'firebase/firestore';

// ==========================================================================
// --- INTERFACCE DI BASE PER COLLEZIONI FIRESTORE ---
// ==========================================================================

export interface BaseEntity {
    id: string;
}

/**
 * @description La struttura dati DEFINITIVA per un documento nella collezione /rapportini.
 * @version 4.0 - Allineata con ISTRUZIONI_TECNICI.md v4.0
 */
export interface Rapportino extends BaseEntity {
  // --- Campi Fondamentali ---
  nome: string; // Es. "Rapportino giornaliero" o "Rapportino di periodo"
  data: Timestamp;
  tecnicoId: string; // UID del tecnico che compila (autore)
  tipoGiornataId: string;

  // --- Gestione Presenze e Ore ---
  presenze: string[]; // Array di UID di tutti i tecnici presenti (incluso l'autore)
  oreLavoro: number; // Somma totale delle ore di tutti i tecnici o ore personali se estratte.
  dettaglioOreTecnici?: { tecnicoId: string; ore: number; }[];
  altriTecniciIds?: string[];

  // --- Dettagli Orari (per giornate lavorative standard) ---
  isTrasferta?: boolean;
  oraInizio?: string | null;
  oraFine?: string | null;
  pausa?: number | null;
  
  // --- Dettagli Descrittivi (per giornate lavorative) ---
  descrizioneBreve?: string;
  lavoroEseguito?: string;
  materialiImpiegati?: string;

  // --- Riferimenti Anagrafici (per giornate lavorative) ---
  veicoloId?: string | null;
  naveId?: string | null;
  luogoId?: string | null;

  // --- Timestamps Automatici ---
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

// --- ALTRE COLLEZIONI DI ROOT ---

export interface Tecnico extends BaseEntity {
  nome: string;
  cognome: string;
  email: string;
  attivo?: boolean;
  [key: string]: any; // Per altri campi non strettamente definiti
}

export interface UserProfile extends BaseEntity {
    email: string;
    nome: string;
    cognome: string;
    attivo: boolean;
    ruolo?: string;
}

export interface Veicolo extends BaseEntity {
  nome: string;
  targa?: string;
  [key: string]: any;
}

export interface Nave extends BaseEntity {
  nome: string;
}

export interface Luogo extends BaseEntity {
  nome: string;
}

export interface TipoGiornata extends BaseEntity {
  nome: string;
  colore: string;
  lavorativo: boolean;
  icona: string;
}

export interface Notifica extends BaseEntity {
    title: string;
    body: string;
    recipientId: string;
    senderId: string;
    createdAt: Timestamp;
    isRead: boolean;
  }

// ==========================================================================
// --- TIPI "ARRICCHITI" PER LA VISUALIZZAZIONE NELL'UI ---
// ==========================================================================

/**
 * @description Rappresenta un Rapportino dopo che è stato processato per la UI,
 * con i dati correlati (denormalizzati) come oggetti completi.
 */
export interface EnrichedRapportino extends Omit<Rapportino, 'data'> {
  data: Date; // Timestamp convertito in oggetto Date
  tipoGiornata: TipoGiornata; // Oggetto TipoGiornata completo
  tecnicoScrivente?: Tecnico; // Oggetto Tecnico dell'autore
  presenze?: Tecnico[]; // Array di oggetti Tecnico completi
  destinazione?: string; // Nome della nave o del luogo
  guadagno?: number; // Per calcoli finanziari nel report mensile
}
