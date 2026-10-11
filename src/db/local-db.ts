
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
    SaldiContatori,
    SaldoManuale, // Importo la nuova interfaccia
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
    saldi!: Table<SaldiContatori>;
    saldiManuali!: Table<SaldoManuale>; // Aggiungo la nuova tabella

    constructor() {
        super('rapportini-db-v5'); // AUMENTO LA VERSIONE DEL DB a 5

        this.version(5).stores({
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
            saldi: '&[dipendenteId+anno]', // Modifico l'indice per supportare la query
            saldiManuali: '++id, dipendenteId, meseApplicazione', // Definisco la nuova tabella e i suoi indici
        });

        // Mantengo le versioni precedenti per la migrazione
         this.version(4).stores({
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
            saldi: '&dipendenteId, anno',
        });

        this.version(3).stores({});
        this.version(2).stores({});
        this.version(1).stores({});
    }
}

export const db = new MySubClassedDexie();
