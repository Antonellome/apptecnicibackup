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

// *** MODELLO DATI RAPPORTO CONSOLIDATO ***
export interface Rapportino extends FirebaseDoc {
  nome: string;
  data: Date; 
  tecnicoId: string; 
  tipoGiornataId: string;
  giornataId: string; 
  
  // Dati principali
  ordineLavoro?: string;
  dettaglioOreTecnici: DettaglioOreData[];
  presenze: string[]; 
  
  // Sezioni opzionali
  veicoloId?: string;
  naveId?: string;
  luogoId?: string;

  // Campi descrittivi
  descrizioneBreve?: string;
  lavoroEseguito: string;
  materialiImpiegati?: string;

  // Gestione Trasferta
  includeTrasferta: boolean;
  trasfertaId?: string;
  
  // Dati Firma
  firmaFirmatarioNome?: string;
  firmaFirmatarioSocieta?: string;
  firmaVettoriale?: string | null;
  
  // Metadati e controllo
  createdAt: Date;
  updatedAt: Date;
  createdBy: string; 
  version: number;   
  isLocked: boolean; 

  // Flag di stato
  isMultiDay?: boolean;
  isOffline?: boolean;
  isDeleted?: boolean; // <-- AGGIUNTO FLAG PER SOFT DELETE

  // Campi deprecati o da verificare
  oreLavoro?: number; 
  tecnicoScriventeId: string; 
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
  fcmTokens: string[];
  abilitato: boolean;
  categoria: string;
  [key: string]: any;
}

export interface Cliente extends FirebaseDoc { nome: string; }
export interface Sede extends FirebaseDoc { nome: string; indirizzo: string; }

export interface TipoGiornata extends FirebaseDoc { 
  nome: string; 
  descrizione?: string; 
  tariffa?: number; 
  tipo: 'oraria' | 'giornaliera';
  colore: string;
  sigla?: string;
  lavorativo: boolean; 
  icona: string;
  categoria?: 'normale' | 'trasferta' | 'ferie' | 'malattia' | 'altro' | string;
}

export interface Veicolo extends FirebaseDoc { 
    marca: string; 
    modello: string; 
    targa: string;
    nome: string;
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
    tariffa: number;
}

export interface TariffaLocale extends Tariffa {
    costo: number;
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

// =================================================================
// SISTEMA (Sync, Offline, Notifiche)
// =================================================================

export interface SyncManifest {
  [key: string]: Timestamp;
}

export interface SyncEvent {
    id?: number;
    entityId: string; 
    type: 'rapportino' | 'impostazioni' | 'NOTIFICATION_READ' | 'checkin';
    action: 'create' | 'update'; 
    payload: object; 
    timestamp: Date;
    syncStatus: 'pending' | 'syncing' | 'success' | 'error';
    attempts?: number;
    error?: string;
}

export interface CondivisioneInSospeso {
    id?: number;
    blob: Blob;
    fileName: string;
}

export interface CheckinGiornaliero extends FirebaseDoc {
  tecnicoId: string;
  tecnicoName: string;
  tipo: 'inizio_giornata' | 'fine_giornata' | 'check_in_luogo' | 'check_out_luogo';
  timestampImpostato: Date;
  timestampReale: Date;
  naveId?: string;
  luogoId?: string;
  isOffline?: boolean;
}

export interface Notifica extends FirebaseDoc {
    title: string;
    body: string;
    createdAt: Date;
    isRead: boolean;
    tecnicoId: string;
    link?: string;
    letta?: boolean; 
}

// =================================================================
// MODELLI ARRICCHITI E CALCOLATI
// =================================================================

export type SyncState = 'synced' | 'pending' | 'error';

export interface EnrichedRapportino extends Rapportino {
    tecnico?: Tecnico;
    tipoGiornata?: TipoGiornata;
    veicolo?: Veicolo;
    isEditable: boolean;
    oreGiorno: number;
    naveNome?: string;
    luogoNome?: string;
    tecnicoScrivente?: Tecnico;
    isClickable?: boolean;
    oreDisplay?: string;
    creatore?: string;
    orariDisplay?: string;
    hasFirma?: boolean;
    syncState?: SyncState;
}

export interface DayInfo {
    date: string;
    sigla: string;
    colore: string;
    isTrasferta: boolean;
    tipo: string;
    ore: number;
    tooltip: string;
    [key: string]: any;
}

export type Giorno = DayInfo;

export interface RiepilogoMensile {
    [key: string]: DayInfo;
}

export interface DettaglioVoce {
  id: string;
  nome: string;
  colore: string;
  unita: 'h' | 'g';
  oreTotali: number;
  giorni: number;
  costo: number;
  giorniSet?: Set<string>;
}

export interface RiepilogoMese {
  oreTotali: number;
  costoTotale: number;
  giorniTotaliLavorati: number;
  giorniTrasferta: number;
  oreOrdinarie: number;
  oreStraordinarie: number;
  dettaglio: Map<string, DettaglioVoce>;
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
