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

export interface SyncManifestCache {
  id: 'main';
  data: SyncManifest;
}

export class AppLocalDB extends Dexie {
  anagrafiche!: Table<AnagraficaCache, string>;
  tariffe_locali!: Table<TariffaLocaleCache, string>;
  syncQueue!: Table<SyncEvent, number>;
  rapportini!: Table<Rapportino, string>;
  sync_manifest!: Table<SyncManifestCache, string>;

  constructor() {
    super('AppLocalDB');
    
    this.version(1).stores({
        anagrafiche: 'id',
        tariffe_locali: 'id',
        rapportini_mensili: 'id', 
    });

    this.version(2).stores({
      anagrafiche: 'id',
      tariffe_locali: 'id',
      syncQueue: '++id, type',
      rapportini: 'id, data, tecnicoId',
    });

    this.version(3).stores({
        anagrafiche: 'id',
        tariffe_locali: 'id',
        syncQueue: '++id, type',
        rapportini: 'id, data, tecnicoId',
        sync_manifest: 'id'
    });

    // VERSIONE 4: Aggiungo indice composto per ottimizzare le query dei report per utente/mese.
    this.version(4).stores({
      rapportini: 'id, [tecnicoId+data], tecnicoId, data'
    });

    this.open().catch(err => {
        console.error(`Errore nell'apertura di Dexie: ${err.stack || err}`);
    });
  }
}

export const db = new AppLocalDB();