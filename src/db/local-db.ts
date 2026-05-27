
import Dexie, { Table } from 'dexie';
import { Impostazioni, Rapportino, SyncEvent } from '@/models/definitions';

export interface AnagraficaCache {
  id: string; // 'tecnici', 'tipiGiornata', etc.
  data: any[];
  timestamp: Date;
}

export interface TariffaLocaleCache {
    id: 'main'; // ID fisso per le impostazioni
    data: Impostazioni;
    timestamp: Date;
}

export class AppLocalDB extends Dexie {
  anagrafiche!: Table<AnagraficaCache, string>;
  tariffe_locali!: Table<TariffaLocaleCache, string>;
  syncQueue!: Table<SyncEvent, number>; // La chiave primaria è auto-incrementante
  rapportini!: Table<Rapportino, string>; // La chiave primaria è l'id del rapportino (stringa)

  constructor() {
    super('AppLocalDB');
    // INCREMENTO VERSIONE A 2
    this.version(2).stores({
      anagrafiche: 'id',
      tariffe_locali: 'id',
      syncQueue: '++id, type',
      rapportini: 'id, data, tecnicoId',
    });

    // Definizione della versione 1 per garantire una migrazione corretta
    this.version(1).stores({
        anagrafiche: 'id',
        tariffe_locali: 'id',
        rapportini_mensili: 'id', // Vecchia tabella, ora obsoleta
    });

    // Apriamo il DB
    this.open().catch(err => {
        console.error(`Errore nell'apertura di Dexie: ${err.stack || err}`);
    });
  }
}

// Riportiamo l'export a 'db' per compatibilità con il resto del codebase
export const db = new AppLocalDB();
