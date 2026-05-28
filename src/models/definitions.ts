
import { Timestamp } from 'firebase/firestore';

// =================================================================
// INTERFACCE DI BASE E UTILITY
// =================================================================

export interface FirebaseDoc {
  id: string;
}

export type GenericItem = FirebaseDoc & { nome: string; [key: string]: any };

// =================================================================
// MODELLI DATI PRINCIPALI (CORE)
// =================================================================

export interface DettaglioOreData {
  tecnicoId: string;
  nome: string;
  isManual: boolean;
  oraInizio: string;
  oraFine: string;
  pausa: number;
  ore: number;
}

export interface Rapportino extends FirebaseDoc {
  nome: string;
  data: Date | Timestamp;
  tecnicoId: string; // ID del tecnico che ha creato il report
  tipoGiornataId: string;
  isTrasferta: boolean;
  oraInizio: string;
  oraFine: string;
  pausa: number;
  dettaglioOreTecnici: DettaglioOreData[];
  presenze: string[]; // Array di ID di tecnici presenti
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
  oreLavoro?: number; // Campo legacy per retrocompatibilità
}

// =================================================================
// ANAGRAFICHE
// =================================================================

export interface Tecnico extends FirebaseDoc {
  nome: string;
  cognome: string;
  email: string;
  categoriaId?: string;
  nomeCompleto?: string;
  attivo?: boolean;
  [key: string]: any; // Per altre proprietà non strettamente definite
}

export interface Cliente extends FirebaseDoc { nome: string; }
export interface Sede extends FirebaseDoc { nome: string; indirizzo: string; }

export interface TipoGiornata extends FirebaseDoc { 
    nome: string; 
    descrizione?: string; 
    tariffa?: number; 
    tipo: 'oraria' | 'giornaliera';
    colore?: string;
    sigla?: string;
    lavorativo: boolean;
    icona: string;
}

export interface Veicolo extends FirebaseDoc { 
    marca: string; 
    modello: string; 
    targa: string;
    nome: string; // La rendo obbligatoria per risolvere l'errore in converters.ts
}

export interface Luogo extends FirebaseDoc { nome: string; }
export interface Nave extends FirebaseDoc { nome: string; }
export interface Ditta extends FirebaseDoc { nome: string; }
export interface Categoria extends FirebaseDoc { nome: string; }
export interface Documento extends FirebaseDoc { nome: string; url: string; }
export interface Anagrafica extends FirebaseDoc { nome: string; }
export interface Qualifica extends FirebaseDoc { nome: string; }

// =================================================================
// IMPOSTAZIONI E TARIFFE
// =================================================================

export interface Tariffa {
    id: string;
    tipoGiornataId: string;
    nome: string;
    tariffa: number; // Questo è il 'costo'
}

export interface TariffaLocale extends Tariffa {
    costo: number; // Alias per 'tariffa' per coerenza nel client
    unita: 'g' | 'h';
}

export interface Impostazioni extends FirebaseDoc {
    tariffe: TariffaLocale[];
}

// =================================================================
// PROFILI UTENTE
// =================================================================

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
    categoria?: { id: string, nome: string } | string;
}

export interface WebAppUser extends UserProfile {}

// =================================================================
// SISTEMA (Sync, Offline, Notifiche)
// =================================================================

export interface SyncEvent {
    id?: number;
    entityId: string; 
    type: 'rapportino' | 'impostazioni' | 'NOTIFICATION_READ';
    payload: object; 
    timestamp: Date;
    syncStatus: 'pending' | 'syncing' | 'success' | 'error';
    attempts?: number;
}

export interface CondivisioneInSospeso {
    id?: number;
    blob: Blob;
    fileName: string;
}

export interface Notifica extends FirebaseDoc {
    title: string;
    body: string;
    message: string;
    target: { type: 'user' | 'category' | 'all'; id: string; };
    senderId: string;
    createdAt: Timestamp;
    readBy: Record<string, { readAt: Timestamp; tecnicoName: string; }>;
}

export interface AppNotification extends Notifica {}

// =================================================================
// MODELLI ARRICCHITI E CALCOLATI (SOLO CLIENT-SIDE)
// =================================================================

export interface EnrichedRapportino extends Rapportino {
    tecnico?: Tecnico;
    tipoGiornata?: TipoGiornata;
    veicolo?: Veicolo;
    nave?: Nave;
    luogo?: Luogo;
    isOffline?: boolean;
    oreGiorno?: number;
    destinazione?: string;
    tecnicoScrivente?: Tecnico;
    isClickable?: boolean;
}

export interface DayInfo {
    date: string;
    sigla: string;
    colore: string;
    isTrasferta: boolean;
    tipo: string;
    ore: number;
    tooltip: string;
    [key: string]: any; // Per l'accesso dinamico
}

export interface RiepilogoMensile {
    [key: string]: DayInfo;
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
    impostazioni: Impostazioni;
}

export interface FormField {
    id: string;
    name: string;
    label: string;
    type: 'text' | 'number' | 'email' | 'password' | 'select' | 'boolean' | 'date';
    options?: { value: string; label: string }[];
}
