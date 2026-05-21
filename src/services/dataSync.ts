
import { collection, getDocs, addDoc } from 'firebase/firestore';
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
    SyncEvent,
    Impostazioni,
} from '@/models/definitions';

// Funzione generica per collezioni standard con ID
const fetchCollection = async <T extends { id: string }>(collectionName: string): Promise<T[]> => {
    try {
        const querySnapshot = await getDocs(collection(firestoreDb, collectionName));
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
    } catch (error) {
        console.error(`Errore during fetch della collezione ${collectionName}:`, error);
        return [];
    }
};

// --- NUOVA FUNZIONE SPECIFICA PER IMPOSTAZIONI ---
// Funzione dedicata per recuperare il documento singleton 'impostazioni'
const fetchImpostazioni = async (): Promise<Impostazioni> => {
    try {
        const impostazioniSnapshot = await getDocs(collection(firestoreDb, 'impostazioni'));
        // C'è un solo documento 'impostazioni', quindi prendiamo il primo.
        const impostazioniData = impostazioniSnapshot.docs.map(doc => doc.data() as Impostazioni);
        // Se non esiste, restituisce un oggetto di default vuoto.
        return impostazioniData[0] || { tariffe: [] };
    } catch (error) {
        console.error("Errore durante il fetch delle impostazioni:", error);
        // In caso di errore, restituisce un oggetto di default per non bloccare l'app.
        return { tariffe: [] };
    }
};

export const syncMasterData = async () => {
    try {
        // Fetch di tutte le collezioni standard in parallelo
        const [
            tecnici, clienti, sedi, tipiGiornata, 
            veicoli, luoghi, navi, ditte, categorie,
            settings // Aggiunta della nuova funzione
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
            fetchImpostazioni() // Usa la nuova funzione dedicata
        ]);

        // Popola il DB locale con tutti i dati recuperati
        await localDb.populateMasterData({ 
            tecnici, clienti, sedi, tipiGiornata, veicoli, luoghi, navi, ditte, categorie, 
            impostazioni: settings 
        });

    } catch (error) {
        console.error("Errore fatale durante la sincronizzazione dei dati anagrafici:", error);
        throw error;
    }
};

export const addSyncEvent = async (event: Omit<SyncEvent, 'id' | 'syncStatus' | 'attempts'>): Promise<void> => {
    try {
        const eventToAdd: SyncEvent = {
            ...event,
            syncStatus: 'pending',
            attempts: 0,
        };
        await localDb.syncQueue.add(eventToAdd as any);
    } catch (error) {
        console.error("[SYNC] Fallimento nell'aggiungere l'evento alla coda locale:", error);
        throw error;
    }
};

export const processSyncQueue = async () => {
    const eventsToSync = await localDb.syncQueue.where('syncStatus').equals('pending').toArray();

    if (eventsToSync.length === 0) {
        return;
    }

    for (const event of eventsToSync) {
        if (event.id === undefined) {
            console.error("[SYNC] ERRORE INTERNO: Trovato evento senza ID locale, impossibile processare:", event);
            continue;
        }

        const { syncStatus, attempts, id, ...payloadToSend } = event;

        try {
            // Qui 'sync' è il nome della collezione su Firestore dove vengono inviati gli eventi
            await addDoc(collection(firestoreDb, 'sync'), payloadToSend);
            await localDb.syncQueue.delete(event.id);
        } catch (error: any) {
            console.error(`----------------------------------------------------------------`);
            console.error(`[SYNC] ERRORE CRITICO nell'invio a Firestore per l'evento locale ID: ${event.id}.`);
            console.error(`[SYNC] Messaggio di errore:`, error.message);
            console.error(`----------------------------------------------------------------`);
        }
    }
};

// Usa 'NodeJS.Timeout' per compatibilità con l'ambiente di test (Vitest/Node)
// e 'number' per il browser. TypeScript sceglierà quello corretto.
let syncInterval: NodeJS.Timeout | number | null = null;

export const startSyncProcess = (intervalMs: number = 30000) => {
    if (syncInterval) {
        return;
    }
    processSyncQueue();
    syncInterval = setInterval(processSyncQueue, intervalMs);
};

export const stopSyncProcess = () => {
    if (syncInterval) {
        clearInterval(syncInterval as any);
        syncInterval = null;
    }
};
