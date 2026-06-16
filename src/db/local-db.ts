import Dexie, { Table } from 'dexie';
import { Impostazioni, Rapportino, SyncEvent, SyncManifest } from '@/models/definitions';

export interface AnagraficaCache {
  id: string; 
  data: any[];
  timestamp: Date;
}

export interface TariffaLocaleCache {
    id: 'main';
    data: Impostazioni;
    timestamp: Date;
}

// Aggiungo l'interfaccia per la cache del manifest, come richiesto dall'architettura
export interface SyncManifestCache {
  id: 'main';
  data: SyncManifest;
}

export class AppLocalDB extends Dexie {
  anagrafiche!: Table<AnagraficaCache, string>;
  tariffe_locali!: Table<TariffaLocaleCache, string>;
  syncQueue!: Table<SyncEvent, number>;
  rapportini!: Table<Rapportino, string>;
  // Dichiaro la nuova tabella
  sync_manifest!: Table<SyncManifestCache, string>;

  constructor() {
    super('AppLocalDB');
    
    // Le versioni sono cumulative e non vanno modificate.
    this.version(1).stores({
        anagrafiche: 'id',
        tariffe_locali: 'id',
        rapportini_mensili: 'id', // Obsoleta
    });

    this.version(2).stores({
      anagrafiche: 'id',
      tariffe_locali: 'id',
      syncQueue: '++id, type',
      rapportini: 'id, data, tecnicoId',
    });

    // VERSIONE 3: Aggiungo la tabella sync_manifest per allineare il db al blueprint.
    this.version(3).stores({
        anagrafiche: 'id',
        tariffe_locali: 'id',
        syncQueue: '++id, type',
        rapportini: 'id, data, tecnicoId',
        sync_manifest: 'id' // <-- La tabella che risolve l'errore
    });

    this.open().catch(err => {
        console.error(`Errore nell'apertura di Dexie: ${err.stack || err}`);
    });
  }
}

export const db = new AppLocalDB();