
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
    MasterData
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
    public impostazioni!: Table<Impostazioni, string>;

    constructor() {
        super('RisoTecniciDB');

        // **AZIONE CORRETTIVA DEFINITIVA**
        // Allineo la versione del database a 50 per risolvere il blocco critico.
        // Mantengo le definizioni delle tabelle delle versioni precedenti e le consolido
        // in un'unica dichiarazione di versione per pulizia e stabilità.
        this.version(50).stores({
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
            syncQueue: '++id, type, syncStatus',
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
        this.impostazioni = this.table('impostazioni');
    }

    public async populateMasterData(masterData: MasterData) {
        try {
            await this.transaction('rw', this.tables, async () => {
                await this.tecnici.bulkPut(masterData.tecnici);
                await this.clienti.bulkPut(masterData.clienti);
                await this.sedi.bulkPut(masterData.sedi);
                await this.tipiGiornata.bulkPut(masterData.tipiGiornata);
                await this.veicoli.bulkPut(masterData.veicoli);
                await this.luoghi.bulkPut(masterData.luoghi);
                await this.navi.bulkPut(masterData.navi);
                await this.ditte.bulkPut(masterData.ditte);
                await this.categorie.bulkPut(masterData.categorie);
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
