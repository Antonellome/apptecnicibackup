
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
    Impostazioni, // ++ FIX: Importato il tipo
    MasterData
} from '@/models/definitions';

/**
 * Definizione del database locale basato su IndexedDB tramite Dexie.
 * Questo database serve come storage primario per l'applicazione (local-first).
 */
export class LocalDatabase extends Dexie {
    // Dichiarazione delle tabelle (Object Stores)
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
    public impostazioni!: Table<Impostazioni, string>; // ++ FIX: Aggiunta tabella

    constructor() {
        super('RisoTecniciDB'); // Nome del database

        // L'ultima versione DEVE essere dichiarata per ultima.
        this.version(1).stores({
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
        });

        this.version(2).stores({
            syncQueue: '++id, type, syncStatus'
        });

        // ++ FIX: Creata nuova versione per aggiungere la tabella impostazioni
        this.version(3).stores({
            impostazioni: 'id', // Assumiamo che le impostazioni abbiano un ID
        });

        // Assegnazione delle tabelle per l'uso nel codice
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

    /**
     * Popola le tabelle delle anagrafiche con i dati master provenienti da Firestore.
     */
    public async populateMasterData(masterData: MasterData) { // ++ FIX: Usiamo il tipo MasterData completo
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
                // ++ FIX: Aggiunto salvataggio delle impostazioni
                if (masterData.impostazioni) {
                    // Assumiamo che ci sia un solo documento di impostazioni con un id fisso
                    await this.impostazioni.put({ ...masterData.impostazioni, id: 'default' });
                }
            });
            // console.log("Local database populated successfully with master data.");
        } catch (error) {
            console.error("Failed to populate local database:", error);
        }
    }
}

// Esportiamo un'istanza singleton del nostro database
export const db = new LocalDatabase();
