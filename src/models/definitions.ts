
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
}

export interface UserProfile extends BaseEntity {
    email: string;
    nome: string;
    cognome: string;
    attivo: boolean;
    ruolo?: string;
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
// --- TIPI PER LA GESTIONE DI FORM E ANAGRAFICHE ---
// =========================================================================

export interface FormField {
    name: string;
    label: string;
    type: 'text' | 'select' | 'date' | 'number' | 'textarea';
    options?: GenericItem[];
    required?: boolean;
}

export interface BaseAnagrafica extends GenericItem {}
export interface Anagrafica extends BaseAnagrafica {}


// =========================================================================
// --- INTERFACCIA PRINCIPALE: RAPPORTINO ---
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
  dettaglioOreTecnici: { tecnicoId: string; ore: number; }[]; // Unica fonte di verità per le ore
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

export interface Report extends Rapportino {}

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
}

export interface EnrichedReport extends EnrichedRapportino {}
