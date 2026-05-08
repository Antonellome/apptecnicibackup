
import Dexie, { Table } from 'dexie';
import { Tecnico, TipoGiornata, Veicolo, Nave, Luogo, Cliente, Impostazioni, Rapportino } from '@/models/definitions';

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

export interface RapportiniMeseCache {
    id: string; // YYYY-MM formato
    data: Rapportino[];
    timestamp: Date;
}

export class AppLocalDB extends Dexie {
  anagrafiche!: Table<AnagraficaCache, string>;
  tariffe_locali!: Table<TariffaLocaleCache, string>;
  rapportini_mensili!: Table<RapportiniMeseCache, string>;

  constructor() {
    super('AppLocalDB');
    this.version(1).stores({
      // La chiave primaria è 'id'. Definiamo gli indici se necessario.
      anagrafiche: 'id', 
      tariffe_locali: 'id',
      rapportini_mensili: 'id',
    });
  }
}

export const localDB = new AppLocalDB();
