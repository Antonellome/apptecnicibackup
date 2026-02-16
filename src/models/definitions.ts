
// CIAO. OBBEDISCO. CORREGGO GLI ERRORI CHE BLOCCANO L'APPLICAZIONE.
import { Timestamp } from 'firebase/firestore';

// --- INTERFACCE DI BASE ---

// Entità generica con un ID.
export interface BaseEntity {
    id: string;
}

// Estensione di BaseEntity per includere un campo `nome` (per coerenza)
export interface NamedEntity extends BaseEntity {
    nome: string;
}

// --- ANAGRAFICHE PRINCIPALI ---

// Dettagli di una Ditta o cliente.
export interface Ditta extends BaseEntity {
    name: string; // Adattato per coerenza, ma potrebbe servire un converter se il db usa 'nome'
}

// Categoria di appartenenza di un tecnico.
export interface Categoria extends BaseEntity {
    name: string; // Adattato per coerenza
}

// Nave su cui si è svolto un intervento.
export interface Nave extends BaseEntity {
    name: string; // Adattato per coerenza
}

// Luogo geografico di un intervento.
export interface Luogo extends BaseEntity {
    name: string; // Adattato per coerenza
}

// TIPO GIORNATA - CORRETTO
// Questa interfaccia ora rispecchia esattamente i campi presenti in Firestore.
export interface TipoGiornata extends BaseEntity {
    nome: string; // Era 'name'
    tariffa?: number;
    ordine?: number;
    costoStraordinario?: number;
    costoOrario?: number;
    colore?: string;
    lastModified?: Timestamp;
    // Il campo 'pagata' non esiste nel DB, quindi è stato rimosso.
    // Il campo 'costo' è stato sostituito da campi più specifici come 'costoOrario'.
}

// Dettagli di un veicolo aziendale.
export interface Veicolo extends BaseEntity {
    marca: string;
    modello: string;
    targa: string;
    tipo?: string;
    anno?: number;
    proprieta?: 'azienda' | 'personale' | 'noleggio';
    scadenzaAssicurazione?: Timestamp | Date | string;
    scadenzaBollo?: Timestamp | Date | string;
    scadenzaRevisione?: Timestamp | Date | string;
    scadenzaTachimetro?: Timestamp | Date | string;
    scadenzaTagliando?: Timestamp | Date | string;
    note?: string;
}

// TECNICO - CORRETTO
// Questa interfaccia ora rispecchia esattamente i campi presenti in Firestore.
export interface Tecnico extends BaseEntity {
    nome: string;
    cognome: string;
    attivo: boolean;
    sincronizzazioneAttiva: boolean;
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
    lastModified?: Timestamp;
    uid?: string; // Aggiunto campo UID presente nel DB
}

// --- RAPPORTINO E DATI ASSOCIATI ---

// Struttura principale del rapportino di lavoro.
export interface Rapportino extends BaseEntity {
    data: any; // Per flessibilità con Firestore, verrà convertito in Date
    tecnicoScriventeId: string;
    tipoGiornataId: string;
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
    dettagliViaggio?: string;
    immagineKmInizioUrl?: string;
    immagineKmFineUrl?: string;
    concluso: boolean;
    approvato: boolean;
    noteApprovazione?: string;
}

// --- MODELLO PER I FORM DINAMICI ---

export interface FormField {
    name: string;
    label: string;
    type: 'text' | 'number' | 'textarea' | 'date' | 'select' | 'switch';
    required: boolean;
    options?: { value: string; label: string }[];
    grid?: { xs?: number; sm?: number; md?: number };
}

export type BaseAnagrafica = Tecnico | Veicolo | Ditta | Categoria | Nave | Luogo;
