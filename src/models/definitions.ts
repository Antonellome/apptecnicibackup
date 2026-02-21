
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
}

// Estende GenericItem per le Ditte
export interface Ditta extends GenericItem {}

// Estende GenericItem per le Categorie
export interface Categoria extends GenericItem {}

// Estende GenericItem per le Navi
export interface Nave extends GenericItem {}

// Estende GenericItem per i Luoghi
export interface Luogo extends GenericItem {}

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
