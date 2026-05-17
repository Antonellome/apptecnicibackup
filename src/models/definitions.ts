
import { Timestamp } from 'firebase/firestore';

// =========================================================================
// --- INTERFACCE DI BASE E GENERICHE -- -
// =========================================================================

export interface BaseEntity {
    id: string;
}

export interface GenericItem extends BaseEntity {
    nome: string;
    [key: string]: any;
}

export interface FormField {
    id: string; // Aggiunto per risolvere l'errore in AnagraficaForm
    name: string;
    label: string;
    type: 'text' | 'number' | 'select' | 'date'; // Aggiunto 'date' per coerenza
    options?: string[];
}

// =========================================================================
// --- ANAGRAFICHE PRINCIPALI (Collezioni di Root) -- -
// =========================================================================

export interface Tecnico extends BaseEntity {
    nome: string;
    cognome: string;
    email: string;
    attivo?: boolean;
    [key: string]: any;
}

export interface Veicolo extends BaseEntity {
    nome: string; // Modificato da opzionale a richiesto
    marca?: string;
    modello?: string;
    targa?: string;
}

export interface TipoGiornata extends BaseEntity {
    nome: string;
    colore: string;
    lavorativo: boolean;
    icona: string;
    sigla: string; // Mantenuto per compatibilità ma la logica si basa su NOME
}

export interface UserProfile extends BaseEntity {
    uid: string;
    email: string;
    tecnicoId: string;
    nome: string;
    cognome: string;
    attivo: boolean;
    isAdmin?: boolean; // Mantenuto per risolvere gli errori
}
export type WebAppUser = UserProfile; // Alias per retrocompatibilità

// ANAGRAFICHE GENERICHE
export type Cliente = GenericItem;
export type Sede = GenericItem;
export type Ditta = GenericItem;
export type Categoria = GenericItem;
export type Qualifica = GenericItem;
export type Luogo = GenericItem;
export type Nave = GenericItem;
export type Documento = GenericItem;


// =========================================================================
// --- IMPOSTAZIONI E TARIFFE (Logica Locale) -- -
// =========================================================================

export interface TariffaLocale extends BaseEntity {
    tipoGiornataId: string;
    nome: string;
    costo: number;
    unita: 'g' | 'h';
}

export interface Impostazioni {
    tariffe: TariffaLocale[];
    [key: string]: any;
}


// =========================================================================
// --- OGGETTO DATI MASTER (per il fetching iniziale) -- -
// =========================================================================

export interface MasterData {
    tecnici: Tecnico[];
    clienti: Cliente[];
    tipiGiornata: TipoGiornata[];
    veicoli: Veicolo[];
    luoghi: Luogo[];
    navi: Nave[];
    // Aggiunte per completezza sebbene non in tutti i fetch
    sedi: Sede[];
    ditte: Ditta[];
    categorie: Categoria[];
    impostazioni: Impostazioni;
}


// =========================================================================
// --- RAPPORTINO E SUB-OGGETTI -- -
// =========================================================================

export interface DettaglioOreTecnico {
    tecnicoId: string;
    ore: number; // Modificato: il calcolo finale non dovrebbe essere null
    isManual: boolean;
    oraInizio: string | null;
    oraFine: string | null;
    pausa: number | null;
}

export interface Rapportino extends BaseEntity {
    nome: string;
    data: Timestamp;
    tecnicoId: string;
    tipoGiornataId: string;

    // Campi opzionali
    dataInizio?: Timestamp;
    dataFine?: Timestamp;
    dettaglioOreTecnici?: DettaglioOreTecnico[];
    isTrasferta?: boolean;
    oraInizio?: string | null;
    oraFine?: string | null;
    pausa?: number | null;
    oreLavoro?: number; // Coerenza con DettaglioOreTecnico
    presenze?: string[]; // Array di ID Tecnici
    altriTecniciIds?: string[];
    descrizioneBreve?: string;
    lavoroEseguito?: string;
    materialiImpiegati?: string;
    veicoloId?: string | null;
    naveId?: string | null;
    luogoId?: string | null;
    firmaFirmatarioNome?: string;
    firmaFirmatarioSocieta?: string;
    firmaVettoriale?: string;
    createdAt: Timestamp;
    updatedAt?: Timestamp;
}


// =========================================================================
// --- INTERFACCE LOCALI E "ARRICCHITE" PER L'UI -- -
// =========================================================================

// Usato nei componenti UI per i dettagli ore, include il nome per la visualizzazione
export interface DettaglioOreData {
    tecnicoId: string;
    nome: string; // Nome del tecnico
    isManual: boolean;
    oraInizio: string | null;
    oraFine: string | null;
    pausa: number | null;
    ore: number; // Anche qui, il valore finale visualizzato non è null
}

export interface EnrichedRapportino extends Omit<Rapportino, 'data' | 'tipoGiornataId' | 'presenze' | 'oreLavoro'> {
    data: Date;
    tipoGiornata: TipoGiornata;
    tecnicoScrivente?: Tecnico;
    presenze: Tecnico[]; // Convertito da string[] a Tecnico[]
    destinazione?: string;
    veicolo?: Veicolo;
    nave?: Nave;
    luogo?: Luogo;
    isEditable?: boolean;
    oreGiorno: number; // Aggiunto per calcoli in MonthlyReportPage
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

// =========================================================================
// --- SINCRONIZZAZIONE ASINCRONA (NUOVA LOGICA) -- -
// =========================================================================

export interface SyncEvent {
  id?: number; // ++ CORRETTO: Chiave primaria numerica auto-incrementante per Dexie.
  type: 'NOTIFICATION_READ'; // Tipo di evento, per ora solo uno
  payload: {
    notificationId: string;
    readByUserId: string;
  };
  timestamp: string; // ISO 8601 timestamp
  syncStatus?: 'pending' | 'syncing' | 'synced' | 'failed';
  attempts?: number;
}
