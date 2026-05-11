
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
    Categoria 
} from '@/models/definitions';

/**
 * Definizione del database locale basato su IndexedDB tramite Dexie.
 * Questo database serve come storage primario per l'applicazione (local-first).
 */
export class LocalDatabase extends Dexie {
    // Dichiarazione delle tabelle (Object Stores)
    public rapportini!: Table<Rapportino, string>; // La chiave primaria è `id` di tipo stringa
    public tecnici!: Table<Tecnico, string>;
    public clienti!: Table<Cliente, string>;
    public sedi!: Table<Sede, string>;
    public tipiGiornata!: Table<TipoGiornata, string>;
    public veicoli!: Table<Veicolo, string>;
    public luoghi!: Table<Luogo, string>;
    public navi!: Table<Nave, string>;
    public ditte!: Table<Ditta, string>;
    public categorie!: Table<Categoria, string>;

    constructor() {
        super('RisoTecniciDB'); // Nome del database

        this.version(1).stores({
            // Sintassi Dexie: 'primaryKey,++autoIncrementKey,indexedProperty'
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
    }

    /**
     * Popola le tabelle delle anagrafiche con i dati master provenienti da Firestore.
     * Questa funzione viene chiamata dal sistema di sincronizzazione.
     * Utilizza `bulkPut` per un inserimento/aggiornamento efficiente.
     */
    public async populateMasterData(masterData: {
        tecnici: Tecnico[];
        clienti: Cliente[];
        sedi: Sede[];
        tipiGiornata: TipoGiornata[];
        veicoli: Veicolo[];
        luoghi: Luogo[];
        navi: Nave[];
        ditte: Ditta[];
        categorie: Categoria[];
    }) {
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
            });
            console.log("Local database populated successfully with master data.");
        } catch (error) {
            console.error("Failed to populate local database:", error);
        }
    }
}

// Esportiamo un'istanza singleton del nostro database
export const db = new LocalDatabase();
