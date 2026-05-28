
import { Timestamp } from 'firebase/firestore';

// Base Interfaces
export interface FirebaseDoc {
  id: string;
}

export interface BaseEntity extends FirebaseDoc {}

export type GenericItem = BaseEntity & { nome: string; [key: string]: any };

// Main Data Models
export interface Rapportino extends FirebaseDoc {
  nome: string;
  data: Date | Timestamp;
  tecnicoId: string;
  tipoGiornataId: string;
  isTrasferta: boolean;
  oraInizio: string;
  oraFine: string;
  pausa: number;
  dettaglioOreTecnici: DettaglioOreData[];
  presenze: string[];
  veicoloId?: string;
  naveId?: string;
  luogoId?: string;
  descrizioneBreve?: string;
  lavoroEseguito: string;
  materialiImpiegati?: string;
  firmaFirmatarioNome?: string;
  firmaFirmatarioSocieta?: string;
  firmaVettoriale?: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isMultiDay?: boolean;
  oreLavoro?: number; // Re-added
}

export interface DettaglioOreData {
  tecnicoId: string;
  nome: string; // Re-added
  isManual: boolean;
  oraInizio: string;
  oraFine: string;
  pausa: number;
  ore: number;
}

export interface Tecnico extends FirebaseDoc {
  nome: string;
  cognome: string;
  email: string;
  categoriaId?: string;
  nomeCompleto?: string; // Re-added
  noteInterne?: string; // Re-added
  codiceFiscale?: string;
  telefono?: string;
  indirizzo?: string;
  cap?: string;
  citta?: string;
  provincia?: string;
  dittaId?: string;
  tipoContratto?: string;
  dataAssunzione?: string | Date;
  scadenzaContratto?: string | Date;
  scadenzaUnilav?: string | Date;
  numeroCartaIdentita?: string;
  scadenzaCartaIdentita?: string | Date;
  numeroPassaporto?: string;
  scadenzaPassaporto?: string | Date;
  numeroPatente?: string;
  categoriaPatente?: string;
  scadenzaPatente?: string | Date;
  numeroCQC?: string;
  scadenzaCQC?: string | Date;
  scadenzaVisita?: string | Date;
  scadenzaCorsoSicurezza?: string | Date;
  scadenzaPrimoSoccorso?: string | Date;
  scadenzaAntincendio?: string | Date;
  attivo?: boolean;
  sincronizzazioneAttiva?: boolean;
  note?: string;
}

export interface Cliente extends FirebaseDoc { nome: string; }
export interface Sede extends FirebaseDoc { nome: string; indirizzo: string; }
export interface TipoGiornata extends FirebaseDoc { 
    nome: string; 
    descrizione?: string; 
    tariffa?: number; 
    tipo: 'oraria' | 'giornaliera';
    colore?: string; // Re-added
    sigla?: string; // Re-added
}
export interface Veicolo extends FirebaseDoc { 
    marca: string; 
    modello: string; 
    targa: string;
    nome?: string; // Re-added
}
export interface Luogo extends FirebaseDoc { nome: string; }
export interface Nave extends FirebaseDoc { nome: string; }
export interface Ditta extends FirebaseDoc { nome: string; }
export interface Categoria extends FirebaseDoc { nome: string; }

// Settings & Tariffe
export interface Impostazioni extends FirebaseDoc {
    id: string; // Made it non-optional again as it should be
    tariffe: Tariffa[];
}

export interface Tariffa {
    id: string;
    tipoGiornataId: string;
    nome: string;
    tariffa: number;
}

export interface TariffaLocale extends Tariffa {} // Re-added

// User & Profile
export interface UserProfile {
    uid: string;
    email: string | null;
    displayName: string | null;
    tecnicoId: string;
    isAdmin: boolean;
    theme: 'light' | 'dark';
    isSuperAdmin?: boolean;
    nome?: string;
    cognome?: string;
    categoria?: string; // Re-added
}

export interface WebAppUser extends UserProfile {} // Re-added

// Offline Sync & System
export interface SyncEvent {
    id?: number;
    entityId: string; 
    type: 'rapportino' | 'impostazioni' | 'NOTIFICATION_READ'; // Expanded
    payload: object; 
    timestamp: Date;
    syncStatus: 'pending' | 'syncing' | 'success' | 'error';
    attempts?: number; // Re-added
}

export interface CondivisioneInSospeso {
    id?: number;
    blob: Blob;
    fileName: string;
}

// Notifications
export interface Notifica extends FirebaseDoc { // Re-added as Notifica
    title: string;
    body: string;
    target: { type: 'user' | 'category' | 'all'; id: string; };
    senderId: string;
    createdAt: Timestamp;
    readBy: Record<string, { readAt: Timestamp; tecnicoName: string; }>;
}
export interface AppNotification extends Notifica {} // Keep for compatibility if used

// Enriched & Calculated Models (for client-side use)
export interface EnrichedRapportino extends Rapportino {
    tecnico?: Tecnico;
    tipoGiornata?: TipoGiornata;
    veicolo?: Veicolo;
    nave?: Nave;
    luogo?: Luogo;
    isOffline?: boolean;
    oreGiorno?: number; // Added to fix multiple errors
}

export interface RapportinoConCalcoli extends EnrichedRapportino {
    oreGiorno: number;
}

// Monthly/Summary Models
export interface RiepilogoMensile {
  [key: string]: DayInfo;
}

export interface DayInfo {
  date: string;
  sigla: string;
  colore: string;
  isTrasferta: boolean;
}

// Generic & Utility Types
export interface FormField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'number' | 'email' | 'password' | 'select' | 'boolean' | 'date';
  options?: { value: string; label: string }[];
}

export interface Anagrafica extends BaseEntity {
  // Common fields for anagrafiche
}

export interface Documento extends FirebaseDoc {
  // Document-related fields
}

export interface Qualifica extends FirebaseDoc {
  nome: string;
}

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
    impostazioni?: Impostazioni;
}
