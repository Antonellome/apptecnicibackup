
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
    Lavorazione,
    Ditta,
    Qualifica,
    Sistema,
    Sede, // Aggiunta
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
    lavorazioni!: Table<Lavorazione>;
    ditte!: Table<Ditta>;
    qualifiche!: Table<Qualifica>; // Esisteva già
    sistemi!: Table<Sistema>;       // Esisteva già
    sedi!: Table<Sede>;             // Aggiunta
    notifiche!: Table<Notifica>;
    syncQueue!: Table<SyncEvent>; 
    syncState!: Table<SyncState>;
    webAppUsers!: Table<UserProfile>;

    constructor() {
        super('rapportini-db-v3'); 

        // Incremento versione a 2 per applicare il nuovo schema che include TUTTE le tabelle
        this.version(2).stores({
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
            lavorazioni: '++id, nome',
            ditte: '++id, nome',
            qualifiche: '++id, nome',
            sistemi: '++id, nome',
            sedi: '++id, nome', // Aggiunta la definizione della tabella
            notifiche: '++id, isRead',
            syncQueue: '++id, syncStatus',
            syncState: '&id',
            webAppUsers: '&id',
        });
        
        // La vecchia versione viene lasciata per gestire la migrazione, ma vuota.
        this.version(1).stores({});
    }
}

export const db = new MySubClassedDexie();
