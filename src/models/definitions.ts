import { Table } from 'dexie';

// =====================================================================================
// --- INTERFACCE DATABASE LOCALE (DEXIE) ---
// =====================================================================================

// Impostazioni dell'applicazione, salvate localmente.
export interface Impostazioni {
    id: 'main'; // Chiave primaria fissa per l'unico record di impostazioni
    version?: number; // V8 - introdotto per forzare l'aggiornamento
    tariffe: TariffaLocale[];
}

// Tariffa come salvata nel database locale (Dexie).
export interface TariffaLocale {
    id: string; // Solitamente corrisponde a tipoGiornataId
    tipoGiornataId: string;
    nome: string;
    costo: number;
    unita: 'h' | 'g'; 
    tariffa: number; // Mantenuto per compatibilità
}

// =====================================================================================
// --- INTERFACCE DATI DA FIRESTORE ---
// =====================================================================================

export interface Rapportino {
    id?: string;
    data: string;
    tecnicoId: string;
    clienteId: string;
    dittaId: string; 
    luogoId: string;
    attivita: Record<string, AttivitaRapportino>;
    veicoloId?: string;
    km?: number;
    note?: string;
    completed: boolean;
    userId: string;
    updatedAt: any; // serverTimestamp
    createdAt: any; // serverTimestamp
}

export interface AttivitaRapportino {
    lavorazioneId: string;
    tipoGiornataId: string;
    oreLavorate: number;
    note?: string;
}


// --- ANAGRAFICHE --- 

export interface Tecnico {
    id?: string;
    nome: string;
    userId: string;
}

export interface Cliente {
    id?: string;
    nome: string;
}

export interface Ditta {
    id?: string;
    nome: string;
}

export interface Categoria {
    id?: string;
    nome: string;
}

export interface Lavorazione {
    id?: string;
    nome: string;
    categoriaId: string;
}

export interface Nave {
    id?: string;
    nome: string;
    clienteId: string;
}

export interface Luogo {
    id?: string;
    nome: string;
    naveId?: string;
    clienteId?: string;
}

export interface TipoGiornata {
    id: string;
    nome: string;
    tipo: 'oraria' | 'giornaliera';
}

export interface Veicolo {
    id?: string;
    nome: string;
}

export interface Qualifica {
    id?: string;
    nome: string;
}

export interface Sistema {
    id?: string;
    nome: string;
}

export interface WebAppUser {
    uid: string;
    email: string;
    displayName: string;
    tecnicoId: string;
    dittaId: string;
}

export interface CheckinGiornaliero {
    id?: string; // data_tecnicoId
    data: string; 
    tecnicoId: string;
    checkIn: any; // serverTimestamp
    checkOut: any; // serverTimestamp | null
    isSync: boolean;
    userId: string;
}

// =====================================================================================
// --- INTERFACCE DATI PER UI E CONTESTI ---
// =====================================================================================

// Contiene tutte le anagrafiche necessarie all'app.
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
    impostazioni: Impostazioni;
}

// Interfaccia per la tabella Dexie, per specificare le chiavi primarie.
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
    webAppUsers: Table<WebAppUser>;
}

// Questa è la vecchia interfaccia, la tengo per riferimento per ora.
export interface Tariffa {
    id: string;
    nome: string;
    tariffa: number;
    unita: 'h' | 'g'; // ora o giorno
    tipoGiornataId: string; 
}

