
import Dexie, { Table } from 'dexie';
import {
    Rapportino,
    Cliente,
    Cantiere,
    Nave,
    TipoOra,
    TipoGiornata,
    Impostazioni,
    Veicolo,
    SyncEvent,
    CheckinGiornaliero,
    UserProfile,
    Luogo,
    Categoria,
    Lavorazione,
    Ditta,
    Qualifica,
    Sistema,
    Notifica
} from '@/models/definitions';

export class MySubClassedDexie extends Dexie {
    rapportini!: Table<Rapportino>;
    clienti!: Table<Cliente>;
    cantieri!: Table<Cantiere>;
    navi!: Table<Nave>;
    tipiOra!: Table<TipoOra>;
    tipiGiornata!: Table<TipoGiornata>;
    impostazioni!: Table<Impostazioni>;
    veicoli!: Table<Veicolo>;
    anagrafiche!: Table<{ id: string, data: any[], timestamp: Date }>;
    localSyncInfo!: Table<{ id:string, timestamp: number }>;
    syncQueue!: Table<SyncEvent>;
    checkin_giornalieri!: Table<CheckinGiornaliero>;
    webAppUsers!: Table<UserProfile & { id: string }>;
    tecnici!: Table<UserProfile & { id: string }>;
    luoghi!: Table<Luogo>;
    categorie!: Table<Categoria>;
    lavorazioni!: Table<Lavorazione>;
    ditte!: Table<Ditta>;
    qualifiche!: Table<Qualifica>;
    sistemi!: Table<Sistema>;
    notifiche!: Table<Notifica>;
    syncState!: Table<{ id: string; value: any }>; 


    constructor() {
        super('rapportini-db');

        // Versione 9: Aggiunge la tabella syncState
        this.version(9).stores({
            rapportini: '++id, data, tecnicoId, cantiereId, clienteId, isDeleted, tipoGiornataId',
            clienti: '++id, nome',
            cantieri: '++id, clienteId',
            navi: '++id, clienteId, nome',
            tipiOra: '++id, nome',
            tipiGiornata: '++id, nome',
            impostazioni: '++id',
            veicoli: '++id, targa',
            anagrafiche: '&id',
            localSyncInfo: '&id',
            syncQueue: '++id, type, action, syncStatus',
            checkin_giornalieri: '++id, tecnicoId, tipo, timestampImpostato',
            webAppUsers: '&id, uid',
            tecnici: '&id, uid, nome, cognome',
            luoghi: '++id, nome',
            categorie: '++id, nome',
            lavorazioni: '++id, nome',
            ditte: '++id, nome',
            qualifiche: '++id, nome',
            sistemi: '++id, nome',
            notifiche: '++id, isRead',
            syncState: '&id'
        });

        // Versione 8: Aggiunge l'indice su 'isRead' per la tabella notifiche
        this.version(8).stores({
            rapportini: '++id, data, tecnicoId, cantiereId, clienteId, isDeleted, tipoGiornataId',
            clienti: '++id, nome',
            cantieri: '++id, clienteId',
            navi: '++id, clienteId, nome',
            tipiOra: '++id, nome',
            tipiGiornata: '++id, nome',
            impostazioni: '++id',
            veicoli: '++id, targa',
            anagrafiche: '&id',
            localSyncInfo: '&id',
            syncQueue: '++id, type, action, syncStatus',
            checkin_giornalieri: '++id, tecnicoId, tipo, timestampImpostato',
            webAppUsers: '&id, uid',
            tecnici: '&id, uid, nome, cognome',
            luoghi: '++id, nome',
            categorie: '++id, nome',
            lavorazioni: '++id, nome',
            ditte: '++id, nome',
            qualifiche: '++id, nome',
            sistemi: '++id, nome',
            notifiche: '++id, isRead' 
        });

        // Mantengo le versioni precedenti per garantire la migrazione
        this.version(7).stores({
            rapportini: '++id, data, tecnicoId, cantiereId, clienteId, isDeleted, tipoGiornataId',
            clienti: '++id, nome',
            cantieri: '++id, clienteId',
            navi: '++id, clienteId, nome',
            tipiOra: '++id, nome',
            tipiGiornata: '++id, nome',
            impostazioni: '++id',
            veicoli: '++id, targa',
            anagrafiche: '&id',
            localSyncInfo: '&id',
            syncQueue: '++id, type, action, syncStatus',
            checkin_giornalieri: '++id, tecnicoId, tipo, timestampImpostato',
            webAppUsers: '&id, uid',
            tecnici: '&id, uid, nome, cognome',
            luoghi: '++id, nome',
            categorie: '++id, nome',
            lavorazioni: '++id, nome',
            ditte: '++id, nome',
            qualifiche: '++id, nome',
            sistemi: '++id, nome',
            notifiche: '++id, letta' 
        });
    }
}

export const db = new MySubClassedDexie();
