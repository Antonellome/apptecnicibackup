import { Timestamp, DocumentReference } from 'firebase/firestore';

export interface Tecnico {
  id: string;
  nome: string;
  cognome: string;
  email: string;
  qualifica: string;
  livello: string;
  attivo: boolean;
}

export interface Cliente {
  id: string;
  nome: string;
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
    lavorativa: boolean;
    pagata: boolean;
}

export interface Veicolo {
    id: string;
    nome: string;
    targa: string;
}

export interface Rapportino {
  id: string;
  data: Timestamp;
  giornataId: DocumentReference;
  tecnicoScriventeId: DocumentReference;

  // Campi opzionali
  tecniciAggiuntiIds?: DocumentReference[];
  inserimentoManualeOre?: boolean;
  oraInizio?: Timestamp;
  oraFine?: Timestamp;
  pausa?: number;
  oreLavorate?: number;
  
  breveDescrizione?: string;
  lavoroEseguito?: string;
  materialiImpiegati?: string;
  
  naveId?: DocumentReference;
  luogoId?: DocumentReference;
  veicoloId?: DocumentReference;
  clienteId?: DocumentReference; 
  
  note?: string; 
}
