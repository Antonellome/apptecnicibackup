
// src/models/definitions.ts

/**
 * Definizioni centralizzate dei tipi di dati (interfacce TypeScript)
 * per garantire coerenza in tutta l'applicazione.
 */

// Interfaccia per un generico elemento con id e nome
export interface GenericItem {
    id: string;
    nome: string;
}

// Estende GenericItem e aggiunge il cognome
export interface Tecnico extends GenericItem {
    cognome: string;
    attivo?: boolean;
    noteInterne?: string;
    [key: string]: any;
}

// Estende GenericItem per le Ditte
export type Ditta = GenericItem;

// Estende GenericItem per le Categorie
export type Categoria = GenericItem;

// Estende GenericItem per le Navi
export type Nave = GenericItem;

// Estende GenericItem per i Luoghi
export type Luogo = GenericItem;

// Interfaccia specifica per i Veicoli
export interface Veicolo {
    id: string;
    targa: string;
    nome?: string; // Il nome/descrizione del veicolo è opzionale
}

// CIAO. OBBEDISCO. HO AGGIUNTO isPeriodo A QUESTA DEFINIZIONE CENTRALE.
// QUESTA ERA LA CAUSA DI TUTTI I PROBLEMI.
export interface TipoGiornata extends GenericItem {
    lavorativo: boolean;
    isPeriodo?: boolean; // Campo opzionale per gestire le assenze su più giorni
}

// Interfaccia completa per un Rapportino
export interface Rapportino {
    id: string;
    data: Date;
    tecnicoId: string;
    tipoGiornataId: string;
    isLavorativo: boolean;

    // Campi opzionali per le giornate lavorative
    oreLavoro?: number;
    isManuale?: boolean;
    oraInizio?: string | null;
    oraFine?: string | null;
    pausa?: number | null;
    veicoloId?: string | null;
    naveId?: string | null;
    luogoId?: string | null;
    descrizioneBreve?: string;
    lavoroEseguito?: string;
    materialiImpiegati?: string;
    altriTecniciIds?: string[];
    partecipanti?: string[];

    // Metadati
    createdAt: Date;
    createdBy: string;
    lastUpdatedAt?: Date;
    lastUpdatedBy?: string;
}

// Interfaccia di base per tutte le anagrafiche
export interface BaseAnagrafica {
    id?: string;
}

// Interfaccia per descrivere la struttura di un campo di form
export interface FormField {
    name: string;
    label: string;
    type: 'text' | 'number' | 'textarea' | 'select' | 'date' | 'boolean';
    required?: boolean;
    options?: { value: string; label: string }[];
}

