
import { collection, getDocs } from 'firebase/firestore';
import { db as firestoreDb } from '@/firebase';
import { db as localDb } from './localDatabase';
import {
    Tecnico,
    Cliente,
    Sede,
    TipoGiornata,
    Veicolo,
    Luogo,
    Nave,
    Ditta,
    Categoria,
} from '@/models/definitions';

/**
 * Fetches all documents from a specific Firestore collection.
 * @param collectionName The name of the collection to fetch.
 * @returns A promise that resolves to an array of documents.
 */
const fetchCollection = async <T extends { id: string }>(collectionName: string): Promise<T[]> => {
    try {
        const querySnapshot = await getDocs(collection(firestoreDb, collectionName));
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
    } catch (error) {
        console.error(`Error fetching collection ${collectionName}:`, error);
        return []; // Return an empty array on error to avoid crashing the sync
    }
};

/**
 * Synchronizes all master data from Firestore to the local IndexedDB.
 * This function is the core of the local-first data strategy, ensuring
 * the app has all necessary data available offline.
 */
export const syncMasterData = async () => {
    try {
        console.log("Starting master data synchronization...");

        // Fetch all master data collections in parallel
        const [
            tecnici,
            clienti,
            sedi,
            tipiGiornata,
            veicoli,
            luoghi,
            navi,
            ditte,
            categorie,
        ] = await Promise.all([
            fetchCollection<Tecnico>('tecnici'),
            fetchCollection<Cliente>('clienti'),
            fetchCollection<Sede>('sedi'),
            fetchCollection<TipoGiornata>('tipiGiornata'),
            fetchCollection<Veicolo>('veicoli'),
            fetchCollection<Luogo>('luoghi'),
            fetchCollection<Nave>('navi'),
            fetchCollection<Ditta>('ditte'),
            fetchCollection<Categoria>('categorie'),
        ]);

        // Populate the local database with the fetched data
        await localDb.populateMasterData({
            tecnici,
            clienti,
            sedi,
            tipiGiornata,
            veicoli,
            luoghi,
            navi,
            ditte,
            categorie,
        });

        console.log("Master data synchronization completed successfully.");

    } catch (error) {
        console.error("Fatal error during master data synchronization:", error);
        // In a real-world scenario, you might want to handle this more gracefully
        // (e.g., show a persistent error message to the user).
        throw error;
    }
};
