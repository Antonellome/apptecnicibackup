import Dexie, { Table } from 'dexie';
import { Rapportino } from '@/models/definitions';

// Definiamo un tipo per il rapportino in sospeso che include un ID locale opzionale
export interface RapportinoInSospeso extends Omit<Rapportino, 'id'> {
  // L'ID locale è opzionale perché verrà assegnato da Dexie al momento dell'inserimento
  localId?: number;
  // Manteniamo l'ID originale se stiamo modificando un rapportino esistente offline
  id?: string; 
}

export class MySubClassedDexie extends Dexie {
  // 'rapportiniInSospeso' è una proprietà che rappresenterà la nostra tabella.
  // Sarà "tipizzata" per assicurarci di inserire solo oggetti che rispettano l'interfaccia RapportinoInSospeso.
  rapportiniInSospeso!: Table<RapportinoInSospeso>; 

  constructor() {
    super('rapportiniDB');
    this.version(1).stores({
      // Creiamo la tabella 'rapportiniInSospeso' con un indice primario auto-incrementante '++localId'
      rapportiniInSospeso: '++localId' 
    });
  }
}

// Esportiamo un'istanza singola (singleton) del nostro database.
// Tutta l'applicazione userà questa stessa istanza per interagire con IndexedDB.
export const db = new MySubClassedDexie();
