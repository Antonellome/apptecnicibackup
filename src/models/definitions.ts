export type FirebaseTimestamp = any;
export type SyncState = 'pending' | 'syncing' | 'synced' | 'failed' | 'error';

// --- INTERFACCE PER LA LOGICA DI BUSINESS E DI CALCOLO ---

export interface Dipendente {
  id: string;
  nome: string;
  cognome: string;
  livello: string;
  isTurnista: boolean;
  orarioSettimanaleContrattuale: number;
  anzianitaAnni: number;
}

export interface Festivita {
    data: string;
    nome: string;
}

export interface SaldiContatori {
    dipendenteId: string;
    anno: number;
    ferie: number; // ore
    rol: number; // ore
    exFestivita: number; // ore
    bancaOre: number; // ore
    malattiaGiorniAnno: number; // giorni
}

export interface RisultatoCalcoloGiornaliero {
    data: string;
    pagaBaseOre: number;
    trasfertaOre: number;
    // Lavoro ordinario notturno
    oreNotturnoSeraleOrd: number; // +15%
    oreNotturnoPienoOrd: number;  // +30%
    // Straordinari
    strDiu12Intero: number; // +25%
    strDiuSuccessIntero: number; // +30%
    straordinarioSabatoDiurno50: number; // +50%
    straordinarioNotturno50: number; // +50% (feriale/sabato)
    straordinarioFestivo55: number; // +55%
    straordinarioNotturnoFestivo75: number; // +75%
    // Voci di assenza che scalano contatori
    ferieScalate: number;
    rolScalati: number;
    exFestivitaScalate: number;
    permessiScalati: number; // non usati per ora, ma predisposti
    legge104Scalate: number;
    // Malattia
    oreMalattiaCarenzaAzienda: number;
    oreMalattiaIntegrazione: number;
    // Banca Ore (contengono solo la maggiorazione, l'ora base va in pagaBaseOre)
    bancaOreSolaMaggiorazione25?: number;
    bancaOreSolaMaggiorazione30?: number;
    bancaOreSolaMaggiorazione50?: number;
    // Anomalie
    anomaliaDebitoUncovered: number;
}

// =====================================================================================
// --- INTERFACCE DATI DA FIRESTORE (SCHEMA UFFICIALE E CORRETTO) ---
// =====================================================================================

export interface DettaglioOreTecnico {
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
    createdAt: FirebaseTimestamp; 
    updatedAt: FirebaseTimestamp; 
    data: FirebaseTimestamp;
    nome: string;
    tecnicoId: string;
    luogoId: string;
    naveId: string;
    veicoloId: string;
    tipoGiornataId: string;
    trasfertaId: string;
    clienteId: string; 
    dittaId: string;   
    descrizioneBreve: string;
    lavoroEseguito: string;
    materialiImpiegati: string;
    ordineLavoro: string;
    completed: boolean; 
    userId: string;
    dettaglioOreTecnici: DettaglioOreTecnico[];
    presenze: string[];
    oreLavoro: number;
    firmaFirmatarioNome: string;
    firmaFirmatarioSocieta: string;
    firmaVettoriale: string;
    attivita?: any; 
    isDeleted?: boolean;
    isOffline?: boolean;
    includeTrasferta?: boolean;
    createdBy?: string; 
    isLocked?: boolean;
    version?: number;
    tecnicoScriventeId?: string;
    isMultiDay?: boolean;
}

export interface Tecnico {
    id?: string; 
    uid?: string; 
    userId: string; 
    nome: string; 
    cognome: string;
    codiceFiscale?: string;
    nomeCompleto?: string;
    email: string;
    telefono?: string;
    indirizzo?: string;
    cap?: string;
    citta?: string;
    provincia?: string;
    dittaId: string;
    categoriaId?: string;
    tipoContratto?: string;
    dataAssunzione?: FirebaseTimestamp; 
    scadenzaContratto?: FirebaseTimestamp;
    scadenzaUnilav?: FirebaseTimestamp;
    numeroPatente?: string;
    categoriaPatente?: string;
    scadenzaPatente?: FirebaseTimestamp;
    numeroCartaIdentita?: string;
    scadenzaCartaIdentita?: FirebaseTimestamp;
    numeroPassaporto?: string;
    scadenzaPassaporto?: FirebaseTimestamp;
    numeroCQC?: string;
    scadenzaCQC?: FirebaseTimestamp;
    scadenzaVisita?: FirebaseTimestamp;
    scadenzaCorsoSicurezza?: FirebaseTimestamp;
    scadenzaPrimoSoccorso?: FirebaseTimestamp;
    scadenzaAntincendio?: FirebaseTimestamp;
    attivo?: boolean;
    accessoApp?: boolean;
    appAccess?: boolean;
    sincronizzazioneAttiva?: boolean;
    fcmToken?: string;
    note?: string;
    noteInterne?: string;
    tariffe?: Record<string, number>;
    updatedAt?: FirebaseTimestamp; 
}

// --- ANAGRAFICHE SECONDARIE (PULITE) --- 
export interface Veicolo { id?: string; nome: string; marca?: string; modello?: string; targa?: string; }
export interface Cliente { id?: string; nome: string; }
export interface Ditta { id?: string; nome: string; }
export interface Categoria { id?: string; nome: string; }
export interface Nave { id?: string; nome: string; clienteId: string; }
export interface Luogo { id?: string; nome: string; naveId?: string; clienteId?: string; }
export interface TipoGiornata { id: string; nome: string; tipo: 'oraria' | 'giornaliera'; colore: string; sigla: string; categoria?: string; }
export interface WebAppUser { uid: string; email: string; displayName: string; tecnicoId: string; dittaId: string; }
export interface Notifica { id: string; title: string; body: string; createdAt: FirebaseTimestamp; isRead: boolean; letta: boolean; tecnicoId?: string; categoriaId?: string; target?: string; }
export interface CheckinGiornaliero {
    id?: string;
    data: string; 
    tecnicoId: string;
    checkIn: FirebaseTimestamp;
    checkOut: FirebaseTimestamp;
    isSync: boolean;
    userId: string;
    timestampImpostato: FirebaseTimestamp;
    timestampReale: FirebaseTimestamp;
    tecnicoName?: string;
    tipo: 'checkin' | 'checkout' | 'inizio_giornata' | 'fine_giornata' | 'check_in_luogo' | 'check_out_luogo'; 
    naveId?: string;
    luogoId?: string;
}
export type Checkin = CheckinGiornaliero;

// =====================================================================================
// --- INTERFACCE CENTRALI E DI STATO ---
// =====================================================================================

export interface UserProfile extends Tecnico {
  tecnicoId: string;
  impostazioni?: any; 
  isAdmin?: boolean;
  displayName?: string;
  theme?: string;
}

export interface MasterData {
    tecnici: Tecnico[];
    ditte: Ditta[];
    categorie: Categoria[];
    navi: Nave[];
    luoghi: Luogo[];
    veicoli: Veicolo[];
    tipiGiornata: TipoGiornata[];
    impostazioni: Impostazioni;
    clienti: Cliente[];
    festivita: Festivita[];
    tariffe?: { [key: string]: number };
}

export interface FormField {
    id: string;
    label: string;
    type: string;
    options?: any[];
    name?: string;
}

export interface Giorno {
    data: FirebaseTimestamp;
    numero: number;
    nome: string;
    eventi: any[];
    tipo?: string;
    ore?: number;
    straordinari?: number;
    trasferta?: boolean;
    date?: any;
}

export interface DayInfo { [key: string]: any; }
export interface RiepilogoMese { [key: string]: any; }
export interface RiepilogoMensile { [key: string]: any; }

export interface Documento { id: string; nome: string; [key: string]: any; }
export interface GenericItem { id?: string; nome: string; }

export interface EnrichedRapportino extends Rapportino {
    cliente?: Cliente;
    nave?: Nave;
    luogo?: Luogo;
    veicolo?: Veicolo;
    tipoGiornata?: TipoGiornata;
    trasferta?: TipoGiornata; 
    tecnicoScrivente?: Tecnico;
    creatore?: Tecnico;
    oreGiorno?: number;
    orariDisplay?: string;
    isEditable?: boolean;
    isOwner?: boolean;
    syncState?: SyncState;
    hasFirma?: boolean;
    naveNome?: string;
    luogoNome?: string;
}

export interface DettaglioOreData extends DettaglioOreTecnico {}

export interface GlobalData {
    masterData: MasterData | undefined;
    rapportini: Rapportino[];
    checkins: Checkin[];
    userProfile: UserProfile | undefined;
    loading: boolean;
    error: any | undefined;
    updateImpostazioni: (newImpostazioni: Impostazioni) => Promise<void>;
}

// =====================================================================================
// --- INTERFACCE PER DEXIE (DATABASE LOCALE) ---
// =====================================================================================

export interface Impostazioni { id: 'main'; version?: number; tariffe: TariffaLocale[]; }
export interface TariffaLocale { id: string; tipoGiornataId: string; nome: string; costo: number; unita: 'h' | 'g'; tariffa: number; }
export interface Tariffa { id: string; nome: string; tariffa: number; unita: 'h' | 'g'; tipoGiornataId: string; }
export interface SyncEvent { id?: number; type: 'rapportino' | 'checkin'; action: 'create' | 'update'; payload: any; entityId?: string; syncStatus: 'pending' | 'syncing' | 'synced' | 'failed'; timestamp: Date; }
export interface SaldoManuale extends SaldiContatori { id?: string; }
