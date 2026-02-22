
import { Timestamp } from 'firebase/firestore';

// Definizioni dei tipi di base per l'applicazione

export interface UserProfile {
    id: string; // Corrisponde a user.uid da Firebase Auth
    email: string;
    nome?: string;
    cognome?: string;
    ruolo: 'admin' | 'user';
}

export interface Tecnico {
    id: string; // ID del documento
    uid: string; // uid di firebase auth
    nome: string;
    cognome: string;
    email: string;
}

export interface Veicolo {
    id: string;
    nome: string;
    targa: string;
}

export interface Nave {
    id: string;
    nome: string;
}

export interface Luogo {
    id: string;
    nome: string;
}

export interface TipoGiornata {
    id: string;
    nome: string;
    colore: string;      // Obbligatorio per la UI
    costoOrario: number; // Obbligatorio per i calcoli
}

export interface Rapportino {
    id: string;
    createdAt: Timestamp;
    lastModified: Timestamp;
    
    data: Timestamp;
    tecnicoId: string;
    tipoGiornataId: string;
    isLavorativo: boolean;

    // Campi opzionali
    inserimentoManualeOre?: boolean;
    oraInizio?: string | null;
    oraFine?: string | null;
    pausa?: number | null;
    oreLavoro: number; 

    naveId?: string | null;
    luogoId?: string | null;
    veicoloId?: string | null;

    descrizioneBreve?: string | null;
    lavoroEseguito?: string | null;
    materialiImpiegati?: string | null;

    altriTecniciIds?: string[];
}
