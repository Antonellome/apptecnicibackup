import Dexie, { Table } from 'dexie';
import { Rapportino } from '@/models/definitions';

export interface RapportinoInSospeso extends Omit<Rapportino, 'id'> {
  localId?: number;
  id?: string; 
}

export interface CondivisioneInSospeso {
  id?: number;
  blob: Blob;
  fileName: string;
}

export class MySubClassedDexie extends Dexie {
  rapportiniInSospeso!: Table<RapportinoInSospeso>; 
  condivisioniInSospeso!: Table<CondivisioneInSospeso>;

  constructor() {
    super('rapportiniDB');
    // AZIONE CORRETTIVA: Versione 3
    // Aggiunto l'indice 'id' a rapportiniInSospeso per permettere la ricerca
    // e l'aggiornamento dei rapportini offline tramite il loro ID di Firestore.
    this.version(3).stores({
      rapportiniInSospeso: '++localId, id', // <-- INDICE AGGIUNTO
      condivisioniInSospeso: '++id' 
    });

    // Manteniamo la compatibilità con la versione precedente per evitare errori durante l'upgrade
    this.version(2).stores({
      rapportiniInSospeso: '++localId',
      condivisioniInSospeso: '++id'
    });

  }
}

export const db = new MySubClassedDexie();
