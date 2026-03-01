export interface Tecnico {
  id: string;
  nome: string;
  cognome: string;
  email: string;
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
  colore: string;
  lavorativo: boolean;
  icona: string;
}

export interface Report {
  id: string;
  tecnicoId: string;
  data: any; // Firestore Timestamp
  tipoGiornataId: string;
  oreLavoro: number;
  descrizioneBreve?: string;
  naveId?: string;
  luogoId?: string;
  oraInizio?: any; // Firestore Timestamp
  oraFine?: any; // Firestore Timestamp
}

// Tipo "arricchito" per l'uso nel frontend
export interface EnrichedReport extends Omit<Report, 'data' | 'oraInizio' | 'oraFine'> {
  data: Date;
  oraInizio?: Date;
  oraFine?: Date;
  tipoGiornata: TipoGiornata; // Oggetto completo invece del solo ID
}

// Definizione per il form, dove le date possono essere null o Date
export interface RapportinoFormValues {
  id?: string;
  data: Date | null;
  tipoGiornataId: string;
  oreLavoro: number;
  descrizioneBreve: string;
  naveId: string;
  luogoId: string;
  oraInizio: Date | null;
  oraFine: Date | null;
}
