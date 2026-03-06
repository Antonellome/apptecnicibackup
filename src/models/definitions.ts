import { z } from 'zod';

// Zod schema for validation, mirroring the Rapportino interface
export const rapportinoSchema = z.object({
  tecnicoScriventeId: z.string().nonempty("Il tecnico è obbligatorio"),
  data: z.date(),
  tipoGiornataId: z.string().nonempty("Il tipo di giornata è obbligatorio"),
  oraInizio: z.date().nullable().optional(),
  oraFine: z.date().nullable().optional(),
  oreLavoro: z.number().min(0, "Le ore di lavoro non possono essere negative"),
  oreViaggio: z.number().min(0, "Le ore di viaggio non possono essere negative").optional(),
  kmPercorsi: z.number().min(0, "I km non possono essere negativi").optional(),
  pausa: z.number().min(0, "La pausa non può essere negativa").optional(),
  lavoroEseguito: z.string().optional(),
  materialiImpiegati: z.string().optional(),
  problemiRiscontrati: z.string().optional(),
  note: z.string().optional(),
  presenze: z.array(z.string()).optional(), // Array of Tecnico IDs
  allegati: z.array(z.string()).optional(), // Array of URLs
  stato: z.enum(['bozza', 'inviato', 'approvato', 'rifiutato']).default('bozza'),
  isTrasferta: z.boolean().default(false),
  veicoloId: z.string().optional(),
  clienteId: z.string().optional(),
  destinazione: z.string().optional(),
});


// Base Interfaces for main data models
export interface BaseEntity {
    id: string;
  }

export interface Tecnico extends BaseEntity {
  nome: string;
  cognome: string;
  email: string;
  attivo?: boolean;
  codiceFiscale?: string;
  telefono?: string;
  indirizzo?: string;
  cap?: string;
  citta?: string;
  provincia?: string;
  dittaId?: string;
  ditta?: Ditta;
  categoriaId?: string;
  categoria?: Categoria;
  tipoContratto?: string;
  dataAssunzione?: any; // Firestore Timestamp
  scadenzaContratto?: any; // Firestore Timestamp
  scadenzaUnilav?: any; // Firestore Timestamp
  numeroCartaIdentita?: string;
  scadenzaCartaIdentita?: any; // Firestore Timestamp
  numeroPassaporto?: string;
  scadenzaPassaporto?: any; // Firestore Timestamp
  numeroPatente?: string;
  categoriaPatente?: string;
  scadenzaPatente?: any; // Firestore Timestamp
  numeroCQC?: string;
  scadenzaCQC?: any; // Firestore Timestamp
  scadenzaVisita?: any; // Firestore Timestamp
  scadenzaCorsoSicurezza?: any; // Firestore Timestamp
  scadenzaPrimoSoccorso?: any; // Firestore Timestamp
  scadenzaAntincendio?: any; // Firestore Timestamp
  sincronizzazioneAttiva?: boolean;
  note?: string;
  noteInterne?: string;
  scadenzeSilenced?: Record<string, boolean>;
  lastModified?: any;
}

export interface UserProfile {
    uid: string;
    email: string;
    nome: string;
    cognome: string;
    attivo: boolean;
    id_categoria?: string;
    nomeCategoria?: string;
    ruolo?: string;
}

export interface Rapportino extends BaseEntity {
  nome: string; // Ripristinato come obbligatorio per compatibilità con GenericItem
  tecnicoId?: string; 
  tecnicoScriventeId?: string;
  data: any; 
  tipoGiornataId: string;
  oraInizio?: string | null;
  oraFine?: string | null;
  oreLavoro: number;
  oreViaggio?: number;
  kmInizio?: number;
  kmFine?: number; 
  kmPercorsi?: number;
  pausa?: number | null;
  lavoroEseguito?: string;
  materialiImpiegati?: string;
  problemiRiscontrati?: string;
  note?: string;
  presenze?: string[];
  allegati?: string[];
  stato: 'bozza' | 'inviato' | 'approvato' | 'rifiutato';
  isTrasferta: boolean;
  veicoloId?: string | null;
  clienteId?: string | null;
  destinazione?: string;
  naveId?: string | null;
  luogoId?: string | null;
  descrizioneBreve?: string;
  altriTecniciIds?: string[];
  dettaglioOreTecnici?: { tecnicoId: string; ore: number }[];
  createdAt?: any; 
  updatedAt?: any; 
}

// Interfaces for related data
export interface Ditta extends BaseEntity {
  nome: string;
}

export interface Categoria extends BaseEntity {
  nome: string;
}

export interface Cliente extends BaseEntity {
  nome: string;
}

export interface Veicolo extends BaseEntity {
  nome: string;
  targa?: string;
  marca?: string;
  scadenzeSilenced?: Record<string, boolean>;
}

export interface Scadenza extends BaseEntity {
  nome: string;
  data: any; // Firestore Timestamp
  tecnicoId: string;
  silenced?: boolean;
  status?: 'ok' | 'in_scadenza' | 'scaduto';
  descrizione?: string;
  itemOriginaleId?: string;
  collection?: string;
  campoOriginale?: string;
  tipo?: 'tecnico' | 'veicolo' | 'documento';
}

export interface Documento extends BaseEntity {
  nome: string;
  url: string;
  tecnicoId: string;
  scadenzeSilenced?: Record<string, boolean>;
}

export interface Nave extends BaseEntity {
  nome: string;
}

export interface Luogo extends BaseEntity {
  nome: string;
}

export interface TipoGiornata extends BaseEntity {
  nome: string;
  colore: string;
  lavorativo: boolean;
  icona: string;
}

export interface WebAppUser extends BaseEntity {
    email: string;
    role: string;
}

export interface Qualifica extends BaseEntity {
    nome: string;
}

export interface Notifica extends BaseEntity {
  title: string;
  body: string;
  recipientId: string;
  senderId: string;
  createdAt: any; // Firestore Timestamp
  isRead: boolean;
}

// Utility and Form-related interfaces
export interface FormField {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  options?: { value: string; label: string }[];
}

export interface Anagrafica extends BaseEntity {
  nome: string;
  [key: string]: any;
}

export interface GenericItem extends BaseEntity {
  nome: string;
  [key: string]: any;
}

// Enriched (denormalized) versions for UI display
export interface EnrichedRapportino extends Omit<Rapportino, 'data' | 'oraInizio' | 'oraFine' | 'presenze' | 'veicoloId' | 'clienteId'> {
  data: Date;
  oraInizio?: Date;
  oraFine?: Date;
  tipoGiornata: TipoGiornata;
  tecnicoScrivente?: Tecnico;
  presenze?: Tecnico[];
  veicolo?: Veicolo;
  cliente?: Cliente;
  guadagno?: number; // For financial calculations
}

// --- COMPATIBILITY ALIASES ---
export type Report = Rapportino;
export type EnrichedReport = EnrichedRapportino;
export type BaseAnagrafica = Omit<Anagrafica, 'id'>;