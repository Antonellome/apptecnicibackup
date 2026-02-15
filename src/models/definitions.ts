
// CIAO. OBBEDISCO. CORREGGO GLI ERRORI CHE BLOCCANO L'APPLICAZIONE.
import { Timestamp } from 'firebase/firestore';

// --- INTERFACCE DI BASE ---

// Entità generica con un ID.
export interface BaseEntity {
    id: string;
}

// Estensione di BaseEntity per includere un campo `name` comune.
export interface NamedEntity extends BaseEntity {
    name: string;
}

// --- ANAGRAFICHE PRINCIPALI ---

// CIAO: OBBEDISCO. Correggo le interfacce vuote che causano errori.
// Dettagli di una Ditta o cliente.
export type Ditta = NamedEntity;

// Categoria di appartenenza di un tecnico (es. Elettricista, Meccanico).
export type Categoria = NamedEntity;

// Nave su cui si è svolto un intervento.
export type Nave = NamedEntity;

// Luogo geografico di un intervento.
export type Luogo = NamedEntity;

// Tipo di giornata lavorativa (es. Lavoro, Ferie, Malattia).
export interface TipoGiornata extends NamedEntity {
    pagata: boolean;       // Se la giornata è retribuita
    costo?: number;        // Costo associato, per i report mensili
    colore?: string;       // Colore per la visualizzazione nel calendario
}

// Dettagli di un veicolo aziendale.
export interface Veicolo extends BaseEntity {
    marca: string;
    modello: string;
    targa: string;
    tipo?: string;             // Es. Furgone, Auto
    anno?: number;
    proprieta?: 'azienda' | 'personale' | 'noleggio';
    scadenzaAssicurazione?: Timestamp | Date | string;
    scadenzaBollo?: Timestamp | Date | string;
    scadenzaRevisione?: Timestamp | Date | string;
    scadenzaTachimetro?: Timestamp | Date | string;
    scadenzaTagliando?: Timestamp | Date | string;
    note?: string;
}

// Anagrafica completa di un tecnico.
export interface Tecnico extends BaseEntity {
    nome: string;
    cognome: string;
    attivo: boolean;
    sincronizzazioneAttiva: boolean; // Se l'utente può sincronizzare i dati
    email?: string;
    codiceFiscale?: string;
    indirizzo?: string;
    citta?: string;
    cap?: string;
    provincia?: string;
    telefono?: string;
    numeroCartaIdentita?: string;
    scadenzaCartaIdentita?: Timestamp | Date | string;
    numeroPassaporto?: string;
    scadenzaPassaporto?: Timestamp | Date | string;
    numeroPatente?: string;
    categoriaPatente?: string;
    scadenzaPatente?: Timestamp | Date | string;
    numeroCQC?: string;
    scadenzaCQC?: Timestamp | Date | string;
    dittaId?: string;
    categoriaId?: string;
    tipoContratto?: 'indeterminato' | 'determinato' | 'apprendistato';
    dataAssunzione?: Timestamp | Date | string;
    scadenzaContratto?: Timestamp | Date | string;
    scadenzaUnilav?: Timestamp | Date | string;
    scadenzaVisita?: Timestamp | Date | string;
    scadenzaCorsoSicurezza?: Timestamp | Date | string;
    scadenzaPrimoSoccorso?: Timestamp | Date | string;
    scadenzaAntincendio?: Timestamp | Date | string;
    note?: string;
    lastModified?: Timestamp; // Per la sincronizzazione
}

// --- RAPPORTINO E DATI ASSOCIATI ---

// Struttura principale del rapportino di lavoro.
export interface Rapportino extends BaseEntity {
    data: any; // Per flessibilità con Firestore, verrà convertito in Date
    tecnicoScriventeId: string;
    tipoGiornataId: string; // CIAO: Corretto da `giornataId` a `tipoGiornataId`
    oreLavorate: number;
    oreViaggio: number;
    oreStraordinario?: number;
    oreTotali: number;
    sedePartenza?: string;
    sedeArrivo?: string;
    kmInizio?: number;
    kmFine?: number;
    kmTotali?: number;
    veicoloId?: string;
    naveId?: string;
    luogoId?: string;
    breveDescrizione?: string;
    descrizioneLavoro?: string;
    materiali?: string;
    altriTecniciIds: string[];
    dettagliViaggio?: string; // Es. aereo, treno, etc.
    immagineKmInizioUrl?: string;
    immagineKmFineUrl?: string;
    concluso: boolean; // Se il rapportino è finalizzato o una bozza
    approvato: boolean; // Se è stato approvato dall'amministrazione
    noteApprovazione?: string;
}

// --- MODELLO PER I FORM DINAMICI ---

// Definisce la struttura di un campo per un form generato dinamicamente.
export interface FormField {
    name: string; // Nome del campo, corrisponde alla chiave in `BaseAnagrafica`
    label: string; // Etichetta visualizzata nell'UI
    type: 'text' | 'number' | 'textarea' | 'date' | 'select' | 'switch';
    required: boolean;
    options?: { value: string; label: string }[]; // Per i campi di tipo `select`
    grid?: { xs?: number; sm?: number; md?: number }; // Layout a griglia di MUI
}

// Interfaccia di base per le anagrafiche, usata nel form dinamico.
export type BaseAnagrafica = Tecnico | Veicolo | Ditta | Categoria | Nave | Luogo;
