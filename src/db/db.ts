import Dexie, { Table } from 'dexie';
import { Rapportino } from '@/models/definitions';

// Definiamo un tipo per il rapportino in sospeso che include un ID locale opzionale
export interface RapportinoInSospeso extends Omit<Rapportino, 'id'> {
  localId?: number;
  id?: string; 
}

// NUOVA INTERFACCIA per le condivisioni in coda
export interface CondivisioneInSospeso {
  id?: number;
  blob: Blob;
  fileName: string;
}

export class MySubClassedDexie extends Dexie {
  rapportiniInSospeso!: Table<RapportinoInSospeso>; 
  condivisioniInSospeso!: Table<CondivisioneInSospeso>; // <-- NUOVA TABELLA

  constructor() {
    super('rapportiniDB');
    this.version(2).stores({ // <-- AUMENTO VERSIONE A 2
      rapportiniInSospeso: '++localId',
      condivisioniInSospeso: '++id' // <-- DEFINIZIONE NUOVA TABELLA
    });
  }
}

// Esportiamo un'istanza singola (singleton) del nostro database.
export const db = new MySubClassedDexie();
