import Dexie, { Table } from 'dexie';
import type { 
    Impostazioni, Rapportino, SyncEvent, SyncManifest, Tecnico, Ditta, 
    Categoria, Veicolo, Cliente, TipoGiornata, Nave, Luogo, Sede, 
    UserProfile, Qualifica, Documento, Notifica, Checkin, // Uso Checkin per coerenza
    Lavorazione, Sistema 
} from '@/models/definitions';

// Tipi e interfacce per le tabelle locali
export type { SyncEvent };

export interface Settings {
  id: string; 
  value: any;
}

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

export interface SyncState {
    id: string;
    value: number;
}

export interface LocalSyncInfo {
    id: string; 
    timestamp: number;
}

// Definizione del database locale dell'applicazione
export class AppLocalDB extends Dexie {
  // Dichiarazione di tutte le tabelle
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
  impostazioni!: Table<Impostazioni, string>;
  syncState!: Table<SyncState, string>; 
  notifiche!: Table<Notifica, string>;
  checkins!: Table<Checkin, string>; // NOME CORRETTO
  localSyncInfo!: Table<LocalSyncInfo, string>;
  settings!: Table<Settings, string>; 
  lavorazioni!: Table<Lavorazione, string>;
  sistemi!: Table<Sistema, string>;

  constructor() {
    super('AppLocalDB');
    
    // Definizione di una VERSIONE UNICA E CONSOLIDATA dello schema.
    // Questo previene la cancellazione accidentale di tabelle durante gli aggiornamenti.
    this.version(15).stores({
      anagrafiche: 'id',
      tariffe_locali: 'id',
      syncQueue: '++id, type, syncStatus, entityId',
      rapportini: 'id, [tecnicoId+data], tecnicoId, data',
      sync_manifest: 'id',
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
      impostazioni: 'id',
      syncState: 'id',
      notifiche: 'id, isRead, createdAt',
      checkins: 'id, [tecnicoId+timestampReale], tipo, timestampImpostato, [tecnicoId+timestampImpostato]', // NOME CORRETTO
      localSyncInfo: 'id',
      settings: 'id',
      lavorazioni: 'id',
      sistemi: 'id'
    });
  }
}

// Esportazione di un'unica istanza del database per tutta l'app
export const db = new AppLocalDB();
