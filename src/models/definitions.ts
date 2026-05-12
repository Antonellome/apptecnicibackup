
import { Timestamp } from 'firebase/firestore';

// =========================================================================
// --- INTERFACCE DI BASE E GENERICHE ---
// =========================================================================

export interface BaseEntity {
    id: string;
}

export interface GenericItem extends BaseEntity {
    nome: string;
    costo?: number; // Aggiunto per compatibilità
    [key: string]: any;
}

// Alias per retrocompatibilità
export type Anagrafica = GenericItem;
export type BaseAnagrafica = GenericItem;

export interface FormField {
    name: string;
    label: string;
    type: 'text' | 'number' | 'select';
    options?: string[];
}

// =========================================================================
// --- ANAGRAFICHE PRINCIPALI (Collezioni di Root) ---
// =========================================================================

export interface Cliente extends GenericItem {}
export interface Sede extends GenericItem {}
export interface Ditta extends GenericItem {}
export interface Categoria extends GenericItem {}
export interface Qualifica extends GenericItem {}
export interface Luogo extends GenericItem {}
export interface Nave extends GenericItem {}
export interface Documento extends GenericItem {}

export interface Veicolo extends BaseEntity {
  nome?: string; 
  marca?: string;
  modello?: string;
  targa?: string;
}

export interface Tecnico extends BaseEntity {
  nome: string;
  cognome: string;
  email: string;
  attivo?: boolean;
  [key: string]: any;
}

export interface TipoGiornata extends BaseEntity {
  nome: string;
  colore: string;
  lavorativo: boolean;
  icona: string;
  sigla: string;
  tariffa: number; 
  tipoTariffa: 'giornaliera' | 'oraria';
}

export interface Notifica extends BaseEntity {
    title: string;
    body: string;
    recipientId: string;
    senderId: string;
    createdAt: Timestamp;
    readBy: { [key: string]: boolean };
    hiddenFor?: { [key: string]: boolean };
}

export interface UserProfile extends BaseEntity {
    uid: string;
    email: string;
    tecnicoId: string;
    nome: string;
    cognome: string;
    attivo: boolean;
    isAdmin?: boolean; // Aggiunto per risolvere gli errori
    categoria?: {
        id: string;
        nome: string;
    };
}
// Alias per retrocompatibilità
export type WebAppUser = UserProfile;

export interface Tariffa extends BaseEntity {
    clienteId: string;
    clienteNome: string;
    tariffaOraria: number;
}

// Definito per SettingsPage
export interface TariffaLocale extends GenericItem {
    tipoGiornataId: string;
    unita: string;
}

export interface Impostazioni {
    [key: string]: any;
}

// =========================================================================
// --- OGGETTO DATI MASTER (per il fetching iniziale) ---
// =========================================================================

export interface MasterData {
    tecnici: Tecnico[];
    clienti: Cliente[];
    sedi: Sede[];
    tipiGiornata: TipoGiornata[]; 
    veicoli: Veicolo[];
    luoghi: Luogo[];
    navi: Nave[];
    ditte: Ditta[];
    categorie: Categoria[];
    impostazioni: Impostazioni;
}

// =========================================================================
// --- INTERFACCIA PRINCIPALE: RAPPORTINO E SUB-OGGETTI ---
// =========================================================================

export interface DettaglioOreTecnico {
    tecnicoId: string;
    ore: number;
    isManual: boolean;
    oraInizio: string | null;
    oraFine: string | null;
    pausa: number | null;
}

export interface Rapportino extends BaseEntity {
  nome: string; 
  data: Timestamp;
  tecnicoId: string; 
  tipoGiornataId: string;
  dataInizio?: Timestamp;
  dataFine?: Timestamp;
  dettaglioOreTecnici?: DettaglioOreTecnico[];
  isTrasferta?: boolean; 
  oraInizio?: string | null;
  oraFine?: string | null;
  pausa?: number | null;
  oreLavoro?: number | null; 
  presenze?: string[]; 
  altriTecniciIds?: string[];
  descrizioneBreve?: string;
  lavoroEseguito?: string;
  materialiImpiegati?: string;
  veicoloId?: string | null;
  naveId?: string | null;
  luogoId?: string | null;
  firmaFirmatarioNome?: string;
  firmaFirmatarioSocieta?: string;
  firmaVettoriale?: string; 
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
// Alias per retrocompatibilità
export type Report = Rapportino;

// =========================================================================
// --- INTERFACCE LOCALI E "ARRICCHITE" PER L'UI ---
// =========================================================================

export interface DettaglioOreData {
    tecnicoId: string;
    nome: string;
    isManual: boolean; 
    oraInizio: string | null;
    oraFine: string | null;
    pausa: number | null;
    ore: number | null; 
}

export interface EnrichedRapportino extends Omit<Rapportino, 'data' | 'tipoGiornataId' | 'presenze'> {
  data: Date;
  tipoGiornata: TipoGiornata; 
  tecnicoScrivente?: Tecnico;
  presenze: Tecnico[]; 
  destinazione?: string;
  guadagno?: number; 
  veicolo?: Veicolo; 
  nave?: Nave; 
  luogo?: Luogo; 
  isEditable?: boolean;
}
// Alias per retrocompatibilità
export type EnrichedReport = EnrichedRapportino;

