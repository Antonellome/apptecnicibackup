import { Timestamp } from 'firebase/firestore';

// Definisce la struttura base con un ID
interface BaseDocument {
    id: string;
}

export interface Tecnico extends BaseDocument {
    nome: string;
    cognome: string;
    attivo: boolean;
}

export interface Nave extends BaseDocument {
    nome: string;
    clienteId?: string; // O un riferimento a Cliente
}

export interface Luogo extends BaseDocument {
    nome: string;
}

export interface Veicolo extends BaseDocument {
    marca: string;
    modello: string;
    targa: string;
}

export interface TipoGiornata extends BaseDocument {
    nome: string;
    lavorativa: boolean;
}

// Struttura del rapportino come salvato in Firestore
export interface Rapportino extends BaseDocument {
    data: Timestamp;
    tecnicoScriventeId: string;
    tecniciAggiuntiIds?: string[];
    naveId: string | null;
    luogoId: string | null;
    giornataId: string;
    veicoloId: string | null;
    
    // Logica ore
    inserimentoManualeOre: boolean;
    oraInizio: Timestamp | null;
    oraFine: Timestamp | null;
    pausa: number; // in minuti
    oreLavorate: number;

    // Dettagli
    breveDescrizione: string;
    lavoroEseguito: string;
    materialiImpiegati?: string;
    
    // Relazioni (opzionali)
    clienteId?: string;
}
