
import Dexie, { Table } from 'dexie';
import {
    Rapportino,
    Cliente,
    Nave,
    TipoGiornata,
    Impostazioni,
    Veicolo,
    CheckinGiornaliero,
    Tecnico,
    Luogo,
    Categoria,
    Ditta,
    Notifica,
    SyncEvent,
    UserProfile,
} from '@/models/definitions';

export interface SyncState {
    id: string;
    timestamp: number;
}

export class MySubClassedDexie extends Dexie {
    rapportini!: Table<Rapportino>;
    clienti!: Table<Cliente>;
    navi!: Table<Nave>;
    tipiGiornata!: Table<TipoGiornata>;
    impostazioni!: Table<Impostazioni>;
    veicoli!: Table<Veicolo>;
    checkin_giornalieri!: Table<CheckinGiornaliero>;
    tecnici!: Table<Tecnico>;
    luoghi!: Table<Luogo>;
    categorie!: Table<Categoria>;
    ditte!: Table<Ditta>;
    notifiche!: Table<Notifica>;
    syncQueue!: Table<SyncEvent>; 
    syncState!: Table<SyncState>;
    webAppUsers!: Table<UserProfile>;

    constructor() {
        super('rapportini-db-v3'); 

        // Versione 3: Rimuove le tabelle fantasma (qualifiche, sistemi, sedi, lavorazioni)
        this.version(3).stores({
            rapportini: '++id, data, tecnicoId, luogoId, clienteId',
            clienti: '++id, nome',
            navi: '++id, clienteId, nome',
            tipiGiornata: '++id, nome',
            impostazioni: '&id',
            veicoli: '++id, nome',
            checkin_giornalieri: '++id, data, tecnicoId',
            tecnici: '&id, userId', 
            luoghi: '++id, nome',
            categorie: '++id, nome',
            ditte: '++id, nome',
            notifiche: '++id, isRead',
            syncQueue: '++id, syncStatus',
            syncState: '&id',
            webAppUsers: '&id',
        });

        this.version(2).stores({});
        this.version(1).stores({});
    }
}

export const db = new MySubClassedDexie();
