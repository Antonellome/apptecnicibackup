
import { Timestamp } from 'firebase/firestore';

// --- INTERFACCE COMUNI E TIPI HELPER ---
export interface GenericItem {
    id: string;
    nome: string;
}

// BaseEntity per form generici
export interface BaseEntity {
    id: string;
    [key: string]: any; // Permette altre proprietà
}

// FormField per la costruzione di form dinamici
export interface FormField {
    id: string;
    label: string;
    type?: 'text' | 'number' | 'date' | 'autocomplete';
    options?: GenericItem[]; // Per autocomplete
}

// UserProfile per il contesto di autenticazione
export interface UserProfile extends Tecnico {
    // Aggiungi qui eventuali campi specifici del profilo utente
    // che non sono presenti nel modello Tecnico base.
}

// EnrichedRapportino per UI che richiede dati denormalizzati
export interface EnrichedRapportino extends Rapportino {
    nomeTecnico?: string;
    nomeSede?: string;
    nomeTipoGiornata?: string;
    // Aggiungi altri campi arricchiti se necessario
}

// Per la gestione delle tariffe nel frontend
export interface TariffaLocale {
    id: string; // Es. ID della categoria
    nome: string;
    importo: number;
}

// Per la visualizzazione dei report calcolati
export interface RapportinoConCalcoli extends Rapportino {
    oreGiorno: number;
    tipoGiornata?: TipoGiornata; // Oggetto completo
    [key: string]: any; // Per altre proprietà calcolate
}

// Per il form dei dettagli ore
export interface DettaglioOreData {
    tecnicoId: string;
    ore: number;
    isManual?: boolean;
    oraInizio?: string;
    oraFine?: string;
    pausa?: number;
}


// --- ANAGRAFICHE MASTER ---
export interface Tecnico extends GenericItem {
    cognome: string;
    email: string;
    attivo: boolean;
    sincronizzazioneAttiva: boolean;
    codiceFiscale?: string;
    indirizzo?: string;
    citta?: string;
    cap?: string;
    provincia?: string;
    telefono?: string;
    numeroCartaIdentita?: string;
    scadenzaCartaIdentita?: Timestamp;
    numeroPassaporto?: string;
    scadenzaPassaporto?: Timestamp;
    numeroPatente?: string;
    categoriaPatente?: string;
    scadenzaPatente?: Timestamp;
    numeroCQC?: string;
    scadenzaCQC?: Timestamp;
    dittaId?: string;
    categoriaId?: string;
    tipoContratto?: string;
    dataAssunzione?: Timestamp;
    scadenzaContratto?: Timestamp;
    scadenzaUnilav?: Timestamp;
    scadenzaVisita?: Timestamp;
    scadenzaCorsoSicurezza?: Timestamp;
    scadenzaPrimoSoccorso?: Timestamp;
    scadenzaAntincendio?: Timestamp;
    note?: string;
    noteInterne?: string;
}

export interface Cliente extends GenericItem {}
export interface Sede extends GenericItem {}
export interface TipoGiornata extends GenericItem {
    colore?: string;
    sigla?: string;
}
export interface Veicolo extends GenericItem {
    targa?: string;
    marca?: string;
    modello?: string;
}
export interface Luogo extends GenericItem {}
export interface Nave extends GenericItem {}
export interface Ditta extends GenericItem {}
export interface Categoria extends GenericItem {}

export interface Documento extends GenericItem {
    url: string;
    tecnicoId: string;
}

export interface Impostazioni {
    tariffe: { categoriaId: string; importo: number; }[];
}

// --- DATI OPERATIVI ---
export interface Rapportino extends GenericItem {
    data: Timestamp;
    tecnicoId: string;
    tipoGiornataId: string;
    oreLavoro: number;
    isTrasferta: boolean;
    completed: boolean;
    
    // Campi opzionali
    dataInizio?: Timestamp;
    dataFine?: Timestamp;
    sedeId?: string;
    descrizioneBreve?: string;
    naveId?: string;
    luogoId?: string;
    oraInizio?: string;
    oraFine?: string;
    presenze?: string[]; // Array di ID tecnici
    dettaglioOreTecnici?: { tecnicoId: string; ore: number; }[];
    veicoliUtilizzati?: { veicoloId: string; km?: number; }[];
    kmPercorsi?: number;
    pedaggi?: number;
    parcheggi?: number;
    speseExtra?: number;
    firmaTecnico?: string; 
    firmaCliente?: string; 
    lavoroEseguito?: string;
    materialiImpiegati?: string;
    firmaFirmatarioNome?: string;
    firmaFirmatarioSocieta?: string;
    firmaVettoriale?: string; // JSON della firma vettoriale

    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}

export interface Checkin {
    id?: string; // YYYY-MM-DD_UID
    tecnicoId: string;
    timestamp: Timestamp;
    isOnline: boolean;
    sedeId?: string;
}

export interface RiepilogoMensile {
    id: string; // YYYY-MM_TECNICO_ID
    tecnicoId: string;
    anno: number;
    mese: number;
    totaleOreLavorate: number;
    totaleFerie: number;
    totaleMalattia: number;
    totalePermessi: number;
    giorniLavorati: number;
    rapportini: DayInfo[];
}

export interface DayInfo {
    giorno: number;
    tipo: string; // es. L, F, M, P
    ore: number;
}


// --- DATI DI SINCRONIZZAZIONE ---
export interface SyncEvent {
    id?: number;
    type: 'rapportino' | 'checkin' | 'notification_read';
    payload: any; // Rapportino | Checkin | { notificationId: string; ... }
    syncStatus: 'pending' | 'success' | 'failed';
    attempts: number;
    lastAttempt?: Date;
}

// --- NOTIFICHE ---
export interface AppNotification {
    id: string;
    title: string;
    message: string;
    createdAt: Date;
    isRead: boolean;
    recipientId?: string; 
    readAt?: Date;
    readBy?: string; 
}
// Alias per retrocompatibilità temporanea
export type Notifica = AppNotification;

// --- RACCOLTA DI TUTTI I TIPI PER DB LOCALE ---
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
