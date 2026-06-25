
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
  data: Date;
  tecnicoId: string; // ID del tecnico che ha creato il report
  tipoGiornataId: string;
  trasfertaId?: string; // ID del tipo di trasferta (se applicabile)
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
  createdAt: Date;
  updatedAt: Date;
  isMultiDay?: boolean;
  oreLavoro?: number; // Campo legacy per retrocompatibilità
  isOffline?: boolean;
  giorni?: { [key: string]: Giorno }; // Aggiunto per compatibilità con il componente Calendar
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
  /** Categoria informativa: 'normale'|'trasferta'|'ferie'|'malattia'|'altro' */
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
    message: string;
    createdAt: Date;
    sent: boolean;
    target: { type: 'user' | 'category' | 'all'; id: string; name: string; };
}

// =================================================================
// MODELLI ARRICCHITI E CALCOLATI
// =================================================================

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
  giorniSet?: Set<string>; // Proprietà opzionale per i calcoli interni
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
