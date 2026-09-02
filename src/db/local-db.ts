import Dexie, { Table } from 'dexie';
// AGGIUNGO Lavorazione e Sistema per le nuove tabelle
import type { Impostazioni, Rapportino, SyncEvent, SyncManifest, Tecnico, Ditta, Categoria, Veicolo, Cliente, TipoGiornata, Nave, Luogo, Sede, UserProfile, Qualifica, Documento, Notifica, CheckinGiornaliero, Lavorazione, Sistema } from '@/models/definitions';

// Esporto i tipi per renderli disponibili ad altri moduli
export type { CheckinGiornaliero, SyncEvent };

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
  impostazioni!: Table<Impostazioni, string>;
  syncState!: Table<SyncState, string>; 
  notifiche!: Table<Notifica, string>;
  checkin_giornalieri!: Table<CheckinGiornaliero, string>;
  localSyncInfo!: Table<LocalSyncInfo, string>;
  settings!: Table<Settings, string>; 
  lavorazioni!: Table<Lavorazione, string>;
  sistemi!: Table<Sistema, string>; // NUOVA TABELLA

  constructor() {
    super('AppLocalDB');
    
    // DEFINIZIONI VECCHIE...
    this.version(13).stores({
        settings: 'id',
        rapportini: 'id, [tecnicoId+data], tecnicoId, data', tecnici: 'id', ditte: 'id',
        categorie: 'id', veicoli: 'id', clienti: 'id', tipiGiornata: 'id',
        navi: 'id', luoghi: 'id', sedi: 'id', webAppUsers: 'id', qualifiche: 'id',
        documenti: 'id', anagrafiche: 'id', tariffe_locali: 'id',
        syncQueue: '++id, type, syncStatus, entityId', sync_manifest: 'id',
        impostazioni: 'id', syncState: 'id', notifiche: 'id, isRead, createdAt',
        checkin_giornalieri: 'id, [tecnicoId+timestampReale], tipo, timestampImpostato, [tecnicoId+timestampImpostato]',
        localSyncInfo: 'id'
    });

    this.version(14).stores({
      lavorazioni: 'id',
    });

    // AGGIORNAMENTO SCHEMA v15: Aggiunta tabella 'sistemi' e consolidamento
    this.version(15).stores({
      sistemi: 'id', // <-- NUOVA TABELLA
      // Reinserisco TUTTE le tabelle esistenti per assicurarmi che non vengano cancellate
      lavorazioni: 'id',
      settings: 'id',
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
      syncQueue: '++id, type, syncStatus, entityId',
      sync_manifest: 'id',
      impostazioni: 'id',
      syncState: 'id', 
      notifiche: 'id, isRead, createdAt',
      checkin_giornalieri: 'id, [tecnicoId+timestampReale], tipo, timestampImpostato, [tecnicoId+timestampImpostato]',
      localSyncInfo: 'id'
    });
  }
}

export const db = new AppLocalDB();