
import { Timestamp } from 'firebase/firestore';

// =========================================================================
// --- INTERFACCE DI BASE E GENERICHE ---
// =========================================================================

export interface BaseEntity {
    id: string;
}

export interface GenericItem extends BaseEntity {
    nome: string;
    [key: string]: any;
}

// =========================================================================
// --- ANAGRAFICHE PRINCIPALI (Collezioni di Root) ---
// =========================================================================

export interface Cliente extends GenericItem {}
export interface Sede extends GenericItem {}
export interface Ditta extends GenericItem {}
export interface Categoria extends GenericItem {}
export interface Luogo extends GenericItem {}
export interface Nave extends GenericItem {}

// Interfaccia Veicolo aggiornata per includere marca e modello
export interface Veicolo extends BaseEntity {
  nome?: string; // Descrizione principale, es. "Furgone 1"
  marca?: string;
  modello?: string;
  targa?: string;
}

export interface Tecnico extends BaseEntity {
  nome: string;
  cognome: string;
  email: string;
  attivo?: boolean;
  [key: string]: any;
}

// Interfaccia TipoGiornata aggiornata per la gestione delle tariffe locali
export interface TipoGiornata extends BaseEntity {
  nome: string;
  colore: string;
  lavorativo: boolean;
  icona: string;
  sigla: string;
  tariffa: number; // La tariffa (es. 80 o 10)
  tipoTariffa: 'giornaliera' | 'oraria'; // L'unità di misura della tariffa
}

export interface Notifica extends BaseEntity {
    title: string;
    body: string;
    recipientId: string;
    senderId: string;
    createdAt: Timestamp;
    readBy: { [key: string]: boolean };
    hiddenFor?: { [key: string]: boolean };
}

export interface UserProfile extends BaseEntity {
    uid: string;
    email: string;
    tecnicoId: string;
    nome: string;
    cognome: string;
    attivo: boolean;
    categoria?: {
        id: string;
        nome: string;
    };
}

export interface Tariffa extends BaseEntity {
    clienteId: string;
    clienteNome: string;
    tariffaOraria: number;
}

// =========================================================================
// --- OGGETTO DATI MASTER (per il fetching iniziale) ---
// =========================================================================

export interface MasterData {
    tecnici: Tecnico[];
    clienti: Cliente[];
    sedi: Sede[];
    tipiGiornata: TipoGiornata[]; // Utilizzato per il seeding iniziale del DB locale
    veicoli: Veicolo[];
    luoghi: Luogo[];
    navi: Nave[];
    ditte: Ditta[];
    categorie: Categoria[];
}

// =========================================================================
// --- INTERFACCIA PRINCIPALE: RAPPORTINO E SUB-OGGETTI ---
// =========================================================================

export interface DettaglioOreTecnico {
    tecnicoId: string;
    ore: number;
}

export interface Rapportino extends BaseEntity {
  // --- Campi Fondamentali ---
  nome: string; // Deprecato ma mantenuto per compatibilità
  data: Timestamp;
  tecnicoId: string; // Tecnico responsabile
  tipoGiornataId: string;

  // --- Gestione Periodo (per ferie, malattia, ecc.) ---
  dataInizio?: Timestamp;
  dataFine?: Timestamp;

  // --- Gestione Presenze e Ore (Struttura Dati Unificata) ---
  dettaglioOreTecnici?: DettaglioOreTecnico[];

  // --- Dettagli Orari (Legacy, per compatibilità in lettura) ---
  isTrasferta?: boolean; // Utilizzato per indicare ore manuali
  oraInizio?: string | null;
  oraFine?: string | null;
  pausa?: number | null;
  oreLavoro?: number | null; // Deprecato, usare `dettaglioOreTecnici`
  presenze?: string[]; // Deprecato
  altriTecniciIds?: string[];// Deprecato

  // --- Dettagli Descrittivi ---
  descrizioneBreve?: string;
  lavoroEseguito?: string;
  materialiImpiegati?: string;

  // --- Riferimenti Anagrafici ---
  veicoloId?: string | null;
  naveId?: string | null;
  luogoId?: string | null;
  
  // --- Dati Firma Cliente ---
  firmaFirmatarioNome?: string;
  firmaFirmatarioSocieta?: string;
  firmaVettoriale?: string; // SVG o base64 data URL

  // --- Timestamps Automatici ---
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

// =========================================================================
// --- INTERFACCE LOCALI E "ARRICCHITE" PER L'UI ---
// =========================================================================

// Interfaccia per lo stato del form, non per Firestore
export interface DettaglioOreData {
    tecnicoId: string;
    nome: string;
    isManual: boolean; // Corrisponde a Rapportino.isTrasferta
    oraInizio: string | null;
    oraFine: string | null;
    pausa: number | null;
    ore: number | null; // Le ore calcolate o inserite manualmente
}

export interface EnrichedRapportino extends Omit<Rapportino, 'data' | 'tipoGiornataId' | 'presenze'> {
  data: Date;
  tipoGiornata: TipoGiornata; // Arricchito con l'oggetto TipoGiornata completo dal DB locale
  tecnicoScrivente?: Tecnico;
  presenze: Tecnico[]; // Lista arricchita dei tecnici
  destinazione?: string;
  guadagno?: number; // Calcolato localmente
  veicolo?: Veicolo; // Arricchito
  nave?: Nave; // Arricchito
  luogo?: Luogo; // Arricchito
  isEditable?: boolean;
}
