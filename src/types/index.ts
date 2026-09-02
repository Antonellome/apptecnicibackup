export interface UserConfig {
    // === CAMPI OBBLIGATORI ===
    userId: string;              // ID univoco tecnico (es. "TEC001")
    apiKey: string;              // API Key per autenticazione (es. "key_abc123")
    technicianName: string;      // Nome completo tecnico (es. "Mario Rossi")
    companyName: string;         // Nome azienda (es. "Riso S.r.l.")
    serverUrl: string;           // URL server sync (es. "https://sync.riso.com")
    autoSync: boolean;           // Sincronizzazione automatica (true/false)
    active: boolean;             // Se configurazione è attiva (true/false)
    createdAt: number;           // Timestamp creazione (Date.now())

    // === CAMPI OPZIONALI ===
    updatedAt?: number;          // Timestamp ultimo aggiornamento
    ships?: string[];            // Lista navi ["Nave Alpha", "Nave Beta"]
    locations?: string[];        // Lista cantieri ["Cantiere A", "Cantiere B"]
    technicianCategories?: TechnicianCategory[];  // Categorie tecnici
    work?: WorkConfig;           // Configurazione lavoro e tariffe
}

export interface TechnicianCategory {
    category: string;            // Nome categoria (es. "Elettricisti")
    technicians: string[];       // Lista nomi tecnici ["Luigi Verdi", "Paolo Bianchi"]
}

export interface WorkConfig {
    defaultStartTime: string;        // Orario inizio default (es. "07:30")
    defaultEndTime: string;          // Orario fine default (es. "16:30")
    defaultPauseMinutes: number;     // Minuti pausa default (es. 60)
    hourlyRates: HourlyRate[];       // Tariffe orarie per tipo turno
}

export interface HourlyRate {
    type: ShiftType;    // Tipo turno
    rate: number;       // Tariffa €/ora
}

export type ShiftType = 
    | 'Ordinaria'       // Orario normale
    | 'Straordinaria'   // Straordinario
    | 'Festiva'         // Festivo
    | 'Ferie'           // Ferie
    | 'Permesso'        // Permesso
    | 'Malattia'        // Malattia
    | '104';            // Legge 104

export interface Report {
    id: string;                      // ID univoco report
    userId: string;                  // ID tecnico proprietario
    date: string;                    // Data formato "YYYY-MM-DD" (es. "2025-01-15")
    shiftType: ShiftType;            // Tipo turno
    startTime: string;               // Orario inizio (es. "07:30")
    endTime: string;                 // Orario fine (es. "16:30")
    pauseMinutes: number;            // Minuti pausa
    ship: string;                    // Nome nave
    location: string;                // Cantiere/Location
    description: string;             // Descrizione lavoro
    materials: string;               // Materiali utilizzati
    workDone: string;                // Lavoro svolto
    technicians: Technician[];       // Tecnici presenti
    createdAt: number;               // Timestamp creazione
    updatedAt: number;               // Timestamp ultimo aggiornamento
}

export interface Technician {
    id: string;           // ID univoco
    name: string;         // Nome tecnico
    startTime: string;    // Orario inizio (es. "07:30")
    endTime: string;      // Orario fine (es. "16:30")
    pauseMinutes: number; // Minuti pausa
}

export interface Notification {
    id: string;                      // ID univoco
    title: string;                   // Titolo notifica
    message: string;                 // Messaggio
    date: string;                    // Data formato "YYYY-MM-DD"
    timestamp: number;               // Timestamp
    priority: 'low' | 'normal' | 'high';  // Priorità
    type: 'info' | 'warning' | 'alert' | 'config';  // Tipo
    targetUsers: string[];           // ['all'] o ['TEC001', 'TEC002']
    createdBy: string;               // Creatore (es. "MASTER")
    configData?: any;     // Dati config (se type === 'config')
}

export interface SyncServerUser {
    id: string;          // ID univoco (uguale a userId)
    name: string;        // Nome tecnico
    company: string;     // Azienda
    apiKey: string;      // API Key
    createdAt: number;   // Timestamp creazione
    lastSync?: number;   // Timestamp ultima sync
    active: boolean;     // Se utente è attivo
}
