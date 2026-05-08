
import { Timestamp } from 'firebase/firestore';

// =========================================================================
// --- INTERFACCE DI BASE E GENERICHE ---
// =========================================================================

export interface BaseEntity {
    id: string;
}

// Interfaccia generica per elementi di anagrafica o dropdown.
export interface GenericItem extends BaseEntity {
    nome: string;
    [key: string]: any;
}

export interface FormField {
    id: string;
    label: string;
    value: any;
}

export interface BaseAnagrafica {
    id: string;
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
export interface Documento extends GenericItem {}

export interface Veicolo extends GenericItem {
  targa?: string;
}

export interface Tecnico extends BaseEntity {
  nome: string;
  cognome: string;
  email: string;
  attivo?: boolean;
  [key: string]: any;
}

export interface TipoGiornata extends BaseEntity {
  nome: string;
  colore: string;
  lavorativo: boolean;
  icona: string;
  sigla: string;
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
    email: string;
    nome: string;
    cognome: string;
    attivo: boolean;
    ruolo?: string;
}

export interface WebAppUser {
    uid: string;
    email: string | null;
    displayName: string | null;
}

export interface Qualifica {
    id: string;
    nome: string;
}

// =========================================================================
// --- OGGETTO DATI MASTER (Single Source of Truth per Anagrafiche) ---
// =========================================================================
export interface MasterData {
    tecnici: Tecnico[];
    clienti: Cliente[];
    sedi: Sede[];
    tipiGiornata: TipoGiornata[];
    veicoli: Veicolo[];
    luoghi: Luogo[];
    navi: Nave[];
    ditte: Ditta[];
    categorie: Categoria[];
}


// =========================================================================
// --- INTERFACCIA PRINCIPALE: RAPPORTINO E REPORT ---
// =========================================================================

export interface Rapportino extends BaseEntity {
  // --- Campi Fondamentali ---
  nome: string;
  data: Timestamp;
  tecnicoId: string;
  tipoGiornataId: string;

  // --- Gestione Periodo (per ferie, malattia, etc.) ---
  dataInizio?: Timestamp;
  dataFine?: Timestamp;

  // --- Gestione Presenze e Ore ---
  presenze: string[];
  dettaglioOreTecnici: { tecnicoId: string; ore: number; }[];
  altriTecniciIds?: string[];

  // --- Dettagli Orari ---
  isTrasferta?: boolean;
  oraInizio?: string | null;
  oraFine?: string | null;
  pausa?: number | null;
  
  // --- Dettagli Descrittivi ---
  descrizioneBreve?: string;
  lavoroEseguito?: string;
  materialiImpiegati?: string;

  // --- Riferimenti Anagrafici ---
  veicoloId?: string | null;
  naveId?: string | null;
  luogoId?: string | null;
  clienteId?: string | null;
  sedeId?: string | null;

  // --- Timestamps Automatici ---
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export type Report = Rapportino; // Alias per coerenza

// =========================================================================
// --- INTERFACCIA PER IMPOSTAZIONI E TARIFFE ---
// =========================================================================

export interface Tariffa {
    tipoGiornataId: string;
    nome: string; // e.g., "Lavoro Ordinario", "Ferie"
    costo: number;
    unita: 'ora' | 'giorno';
}

export interface Impostazioni {
    costoTrasferta: {
        costo: number;
        unita: 'giorno';
    };
    tariffe: Tariffa[];
}


// =========================================================================
// --- TIPI "ARRICCHITI" PER LA VISUALIZZAZIONE NELL'UI ---
// =========================================================================

export interface EnrichedRapportino extends Omit<Rapportino, 'data' | 'tipoGiornataId' | 'presenze'> {
  data: Date;
  tipoGiornata: TipoGiornata;
  tecnicoScrivente?: Tecnico;
  presenze: Tecnico[];
  destinazione?: string;
  guadagno?: number;
  cliente?: Cliente;
  sede?: Sede;
  nave?: Nave;
  luogo?: Luogo;
  isEditable?: boolean;
  oreLavoro?: number;
}

export interface EnrichedReport extends EnrichedRapportino {};

