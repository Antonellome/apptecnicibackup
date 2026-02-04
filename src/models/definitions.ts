// src/models/definitions.ts

/**
 * Interfaccia base per tutte le anagrafiche principali,
 * garantisce che ogni documento abbia almeno un ID e un nome.
 */
export interface Anagrafica {
  id: string;
  nome: string;
}

// --- INTERFACCE ANAGRAFICHE ---

export interface Cliente extends Anagrafica {
  indirizzo?: string;
  citta?: string;
  cap?: string;
  provincia?: string;
  partitaIva?: string;
  codiceFiscale?: string;
  email?: string;
  telefono?: string;
}

export interface Nave extends Anagrafica {
  clienteId: string; // ID del cliente a cui la nave appartiene
}

export interface Luogo extends Anagrafica {
  clienteId?: string; // ID del cliente a cui il luogo appartiene (opzionale)
}

// Utilizziamo alias di tipo poichè non estendono l'interfaccia base con nuovi campi
export type Ditta = Anagrafica;

export type Categoria = Anagrafica;

export interface TipoGiornata extends Anagrafica {
  lavorativa: boolean;
}

export interface Tecnico {
  id: string;
  nome: string;
  cognome: string;
  email: string;
  ruolo?: 'admin' | 'tecnico';
}

export interface Veicolo extends Anagrafica {
  targa: string;
  tipo?: string;
}

// --- INTERFACCIA RAPPORTINO ---

/**
 * Definisce la struttura di un rapportino di lavoro.
 * Collega tutte le anagrafiche pertinenti tramite ID.
 */
export interface Rapportino {
  id: string;
  data: string; // Formato YYYY-MM-DD
  tecnicoId: string;
  clienteId: string;
  
  // Campi specifici dell'attività
  giornataId: string;
  naveId?: string;
  luogoId?: string;
  dittaId?: string;
  
  oreLavorate: number;
  attivitaSvolta: string;
  
  // Dettagli opzionali
  veicoloId?: string;
  kmPercorsi?: number;
  note?: string;
  
  // Stato del rapportino
  stato: 'bozza' | 'confermato' | 'fatturato';
  dataCreazione: any; // Firebase Timestamp
  dataUltimaModifica: any; // Firebase Timestamp
}


// --- INTERFACCE PER FORM E COMPONENTI UI ---

/**
 * Definisce la struttura per la creazione dinamica di campi di form,
 * utilizzata nel componente GestioneAnagrafica.
 */
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'email' | 'password' | 'select' | 'date' | 'textarea' | 'checkbox';
  required?: boolean;
  gridProps?: {
    size: {
      xs?: number;
      sm?: number;
      md?: number;
      lg?: number;
      xl?: number;
    }
  };
  options?: {
    collectionName: string;
    labelField: string;
    valueField: string;
  };
  multiline?: boolean;
  rows?: number;
}
