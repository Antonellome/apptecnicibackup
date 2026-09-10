import { Timestamp } from 'firebase/firestore';
import { Table } from 'dexie';

export type SyncState = 'synced' | 'pending' | 'error';

export interface DettaglioOreData {
  isManual: boolean;
  nome: string;
  oraFine: string;
  oraInizio: string;
  ore: number;
  pausa: number;
  tecnicoId: string;
}

export interface Rapportino {
  id?: string;
  createdAt: Timestamp | Date;
  createdBy: string;
  data: Timestamp | Date;
  descrizioneBreve: string;
  dettaglioOreTecnici: DettaglioOreData[];
  firmaFirmatarioNome: string;
  firmaFirmatarioSocieta: string;
  firmaVettoriale: string;
  giornataId: string;
  includeTrasferta: boolean;
  isDeleted: boolean;
  isLocked: boolean;
  lavoroEseguito: string;
  luogoId: string;
  materialiImpiegati: string;
  naveId: string;
  nome: string;
  ordineLavoro: string;
  presenze: string[];
  tecnicoId: string;
  tecnicoScriventeId: string;
  tipoGiornataId: string;
  trasfertaId: string;
  updatedAt: Timestamp | Date;
  veicoloId?: string;
  version: number;
  isOffline?: boolean;
}

export interface Tecnico {
  id: string;
  nome: string;
  cognome: string;
  userId: string;
  [key: string]: any;
}

export interface Veicolo { id: string; nome: string; [key: string]: any; }
export interface TipoGiornata { id: string; nome: string; lavorativo: boolean; categoria?: string; sigla?: string; unita?: 'h' | 'g'; [key: string]: any; }
export interface UserProfile { uid: string; email?: string; displayName?: string; tecnicoId?: string; dittaId?: string; nome?: string; cognome?: string; isAdmin?: boolean; categoriaId?: string; }
export interface CheckinGiornaliero { id?: string; data: string; tecnicoId: string; checkIn: any; checkOut: any; isSync: boolean; userId: string; timestampImpostato?: any; tipo?: 'checkin' | 'checkout' | 'inizio_giornata' | 'fine_giornata' | 'check_in_luogo' | 'check_out_luogo'; naveId?: string; luogoId?: string; }
export interface Notifica { id?: string; title: string; body: string; target: 'all' | 'categoria' | 'tecnico'; targetId?: string; createdAt: any; readBy: { [tecnicoId: string]: boolean }; isRead?: boolean; letta?: boolean; }
export interface GenericItem { id: string; nome: string; }
export interface Cliente extends GenericItem {} 
export interface Ditta extends GenericItem {} 
export interface Categoria extends GenericItem {} 
export interface Nave extends GenericItem { clienteId: string; }
export interface Luogo extends GenericItem { naveId?: string; clienteId?: string; }
export interface Lavorazione extends GenericItem { categoriaId: string; }
export interface Qualifica extends GenericItem {}
export interface Sistema extends GenericItem {}
export interface Cantiere extends GenericItem {}
export interface TipoOra extends GenericItem {}
export interface Documento extends GenericItem {
  collection: string;
  url: string;
}

export interface MasterData {
    tecnici: Tecnico[];
    clienti: Cliente[];
    ditte: Ditta[];
    categorie: Categoria[];
    lavorazioni: Lavorazione[];
    navi: Nave[];
    luoghi: Luogo[];
    tipiGiornata: TipoGiornata[];
    veicoli: Veicolo[];
    qualifiche: Qualifica[];
    sistemi: Sistema[];
    impostazioni: any;
}

export interface EnrichedRapportino extends Rapportino {
  data: Date; 
  tecnico?: Tecnico;
  tipoGiornata?: TipoGiornata;
  trasferta?: TipoGiornata;
  nave?: Nave;
  luogo?: Luogo;
  veicolo?: Veicolo; 
  oreGiorno: number;
  naveNome?: string;
  luogoNome?: string; 
  isEditable: boolean;
  isOwner: boolean;
  creatore?: string;
  orariDisplay?: string;
  syncState?: SyncState;
  hasFirma: boolean;
}

export interface VoceRiepilogo {
    tipoId: string;
    nome: string;
    valore: number;
    unita: 'h' | 'g';
    giorni: Set<string>;
}

export interface RiepilogoMese {
    dettaglio: Map<string, VoceRiepilogo>;
    oreTotali: number;
    oreOrdinarie: number;
    oreStraordinarie: number;
    giorniTotaliLavorati: number;
    giorniTrasferta: number;
    costoTotale: number;
}

export interface RiepilogoMensile { [tecnicoId: string]: { nome: string; giorni: { [giorno: string]: DayInfo; }; }; }
export interface DayInfo { tipo: string; ore: number; tooltip?: string; }
export interface Giorno { data: Date; tipoGiornata?: string; oreLavorate: number; isTrasferta: boolean; rapportinoId?: string; note?: string; }

// --- DATABASE LOCALE (DEXIE) ---

export interface Impostazioni { id: 'main'; version?: number; tariffe: Tariffa[]; }
export interface Tariffa { id: string; tipoGiornataId: string; nome: string; costo: number; unita: 'h' | 'g'; }
export interface TariffaLocale extends Tariffa {} // Alias per compatibilità

export interface SyncEvent { id?: number; type: 'create' | 'update' | 'delete'; collection: string; entityId: string; payload: any; timestamp: number; status: 'pending' | 'syncing' | 'success' | 'failed'; retries: number; error?: string; action?: any; syncStatus?: any;}

export interface FormField { name: string; label: string; type: string; options?: { id: string; nome: string }[]; }

export interface MyDatabaseTables {
    rapportini: Table<Rapportino>;
    tecnici: Table<Tecnico>;
    clienti: Table<Cliente>;
    ditte: Table<Ditta>;
    categorie: Table<Categoria>;
    lavorazioni: Table<Lavorazione>;
    navi: Table<Nave>;
    luoghi: Table<Luogo>;
    tipiGiornata: Table<TipoGiornata>;
    veicoli: Table<Veicolo>;
    qualifiche: Table<Qualifica>;
    sistemi: Table<Sistema>;
    impostazioni: Table<Impostazioni>;
    checkin_giornalieri: Table<CheckinGiornaliero>;
    notifiche: Table<Notifica>;
    syncQueue: Table<SyncEvent>;
    userProfile: Table<UserProfile>;
}