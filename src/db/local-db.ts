import Dexie, { Table } from 'dexie';
import { Impostazioni, Rapportino, SyncEvent, SyncManifest, Tecnico, Ditta, Categoria, Veicolo, Cliente, TipoGiornata, Nave, Luogo, Sede, UserProfile, Qualifica, Documento } from '@/models/definitions';

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
  tecnici!: Table<Tecnico, string>;
  ditte!: Table<Ditta, string>;
  categorie!: Table<Categoria, string>;
  veicoli!: Table<Veicolo, string>;
  clienti!: Table<Cliente, string>;
  tipiGiornata!: Table<TipoGiornata, string>;
  navi!: Table<Nave, string>;
  luoghi!: Table<Luogo, string>;
  sedi!: Table<Sede, string>;
  webAppUsers!: Table<UserProfile, string>;
  qualifiche!: Table<Qualifica, string>;
  documenti!: Table<Documento, string>;


  constructor() {
    super('AppLocalDB');
    
    this.version(4).stores({
      rapportini: 'id, [tecnicoId+data], tecnicoId, data',
      tecnici: 'id',
      ditte: 'id',
      categorie: 'id',
      veicoli: 'id',
      clienti: 'id',
      tipiGiornata: 'id',
      navi: 'id',
      luoghi: 'id',
      sedi: 'id',
      webAppUsers: 'id',
      qualifiche: 'id',
      documenti: 'id',
      anagrafiche: 'id',
      tariffe_locali: 'id',
      syncQueue: '++id, type',
      sync_manifest: 'id'
    });

    this.open().catch(err => {
        console.error(`Errore nell'apertura di Dexie: ${err.stack || err}`);
    });
  }
}

export const db = new AppLocalDB();