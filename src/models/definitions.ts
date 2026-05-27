
import { Timestamp } from 'firebase/firestore';

export interface Rapportino {
  id: string;
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
}

export interface DettaglioOreData {
  tecnicoId: string;
  nome: string;
  isManual: boolean;
  oraInizio: string;
  oraFine: string;
  pausa: number;
  ore: number;
}

// CORREZIONE FINALE: Allinea l'interfaccia alla struttura del database corretta.
export interface SyncEvent {
    id?: number; // Chiave primaria auto-incrementante `++id`
    entityId: string; // ID del documento (`local-123` o ID Firebase)
    type: 'rapportino' | 'impostazioni';
    payload: object; 
    timestamp: Date;
    syncStatus: 'pending' | 'syncing' | 'success' | 'error';
}

export interface CondivisioneInSospeso {
    id?: number;
    blob: Blob;
    fileName: string;
}

export interface Tecnico extends FirebaseDoc { nome: string; cognome: string; email: string; categoriaId?: string; }
export interface Cliente extends FirebaseDoc { nome: string; } 
export interface Sede extends FirebaseDoc { nome: string; indirizzo: string; }
export interface TipoGiornata extends FirebaseDoc { nome: string; descrizione?: string; tariffa?: number; tipo: 'oraria' | 'giornaliera'; }
export interface Veicolo extends FirebaseDoc { marca: string; modello: string; targa: string; }
export interface Luogo extends FirebaseDoc { nome: string; }
export interface Nave extends FirebaseDoc { nome: string; }
export interface Ditta extends FirebaseDoc { nome: string; }
export interface Categoria extends FirebaseDoc { nome: string; }
export interface Impostazioni extends FirebaseDoc {
    tariffe: Tariffa[];
}

export interface FirebaseDoc {
    id: string;
}

export interface Tariffa {
    id: string;
    tipoGiornataId: string;
    nome: string;
    tariffa: number;
}

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

export interface AppNotification {
    id: string;
    title: string;
    body: string;
    target: { type: 'user' | 'category' | 'all'; id: string; };
    senderId: string;
    createdAt: Timestamp;
    readBy: Record<string, { readAt: Timestamp; tecnicoName: string; }>;
}


