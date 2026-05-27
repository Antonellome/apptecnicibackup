
import Dexie, { Table } from 'dexie';
import { 
    Rapportino, 
    Tecnico, 
    Cliente, 
    Sede, 
    TipoGiornata, 
    Veicolo, 
    Luogo, 
    Nave, 
    Ditta, 
    Categoria,
    SyncEvent,
    Impostazioni,
    MasterData,
    CondivisioneInSospeso
} from '@/models/definitions';

export class LocalDatabase extends Dexie {
    public rapportini!: Table<Rapportino, string>;
    public tecnici!: Table<Tecnico, string>;
    public clienti!: Table<Cliente, string>;
    public sedi!: Table<Sede, string>;
    public tipiGiornata!: Table<TipoGiornata, string>;
    public veicoli!: Table<Veicolo, string>;
    public luoghi!: Table<Luogo, string>;
    public navi!: Table<Nave, string>;
    public ditte!: Table<Ditta, string>;
    public categorie!: Table<Categoria, string>;
    public syncQueue!: Table<SyncEvent, number>; 
    public condivisioniInSospeso!: Table<CondivisioneInSospeso, number>;
    public impostazioni!: Table<Impostazioni, string>;

    constructor() {
        super('RisoTecniciDB');

        // **RIPRISTINO E MIGRAZIONE DEFINITIVA**
        // Incremento la versione a 52 per forzare una migrazione pulita.
        // Questa versione definisce la struttura CORRETTA senza tentare di modificare la chiave primaria.
        this.version(52).stores({
            rapportini: 'id, data, tecnicoId, tipoGiornataId',
            tecnici: 'id, cognome, nome',
            clienti: 'id, nome',
            sedi: 'id, nome',
            tipiGiornata: 'id, nome',
            veicoli: 'id, targa, marca, modello',
            luoghi: 'id, nome',
            navi: 'id, nome',
            ditte: 'id, nome',
            categorie: 'id, nome',
            // Struttura corretta: `++id` è la PK, `entityId` è un campo indicizzato.
            syncQueue: '++id, entityId, type, syncStatus',
            condivisioniInSospeso: '++id',
            impostazioni: 'id',
        });

        this.rapportini = this.table('rapportini');
        this.tecnici = this.table('tecnici');
        this.clienti = this.table('clienti');
        this.sedi = this.table('sedi');
        this.tipiGiornata = this.table('tipiGiornata');
        this.veicoli = this.table('veicoli');
        this.luoghi = this.table('luoghi');
        this.navi = this.table('navi');
        this.ditte = this.table('ditte');
        this.categorie = this.table('categorie');
        this.syncQueue = this.table('syncQueue');
        this.condivisioniInSospeso = this.table('condivisioniInSospeso');
        this.impostazioni = this.table('impostazioni');
    }

    public async populateMasterData(masterData: MasterData) {
        try {
            await this.transaction('rw', this.tables, async () => {
                if (!masterData) return;
                await this.tecnici.bulkPut(masterData.tecnici || []);
                await this.clienti.bulkPut(masterData.clienti || []);
                await this.sedi.bulkPut(masterData.sedi || []);
                await this.tipiGiornata.bulkPut(masterData.tipiGiornata || []);
                await this.veicoli.bulkPut(masterData.veicoli || []);
                await this.luoghi.bulkPut(masterData.luoghi || []);
                await this.navi.bulkPut(masterData.navi || []);
                await this.ditte.bulkPut(masterData.ditte || []);
                await this.categorie.bulkPut(masterData.categorie || []);
                if (masterData.impostazioni) {
                    await this.impostazioni.put({ ...masterData.impostazioni, id: 'default' });
                }
            });
        } catch (error) {
            console.error("Failed to populate local database:", error);
        }
    }
}

export const db = new LocalDatabase();
