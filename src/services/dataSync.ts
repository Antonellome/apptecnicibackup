
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
} from '@/models/definitions';

// --- Funzioni Esistenti (Master Data Sync) ---

const fetchCollection = async <T extends { id: string }>(collectionName: string): Promise<T[]> => {
    try {
        const querySnapshot = await getDocs(collection(firestoreDb, collectionName));
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
    } catch (error) {
        console.error(`Errore durante il fetch della collezione ${collectionName}:`, error);
        return [];
    }
};

export const syncMasterData = async () => {
    try {
        console.log("Avvio sincronizzazione dati anagrafici...");
        const [tecnici, clienti, sedi, tipiGiornata, veicoli, luoghi, navi, ditte, categorie] = await Promise.all([
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
        await localDb.populateMasterData({ tecnici, clienti, sedi, tipiGiornata, veicoli, luoghi, navi, ditte, categorie });
        console.log("Sincronizzazione dati anagrafici completata con successo.");
    } catch (error) {
        console.error("Errore fatale durante la sincronizzazione dei dati anagrafici:", error);
        throw error;
    }
};

// --- NUOVA LOGICA DI SINCRONIZZAZIONE EVENTI ---

export const addSyncEvent = async (event: Omit<SyncEvent, 'id' | 'syncStatus' | 'attempts'>): Promise<void> => {
    try {
        const eventToAdd: SyncEvent = {
            ...event,
            syncStatus: 'pending',
            attempts: 0,
        };
        await localDb.syncQueue.add(eventToAdd as any);
        console.log(`[SYNC] Evento ${event.type} aggiunto alla coda locale.`);
        processSyncQueue();
    } catch (error) {
        console.error("[SYNC] Fallimento nell'aggiungere l'evento alla coda locale:", error);
        throw error;
    }
};

/**
 * Elabora la coda di sincronizzazione con gestione degli errori dettagliata.
 */
export const processSyncQueue = async () => {
    console.log("[SYNC] Inizio elaborazione coda di sincronizzazione...");
    const eventsToSync = await localDb.syncQueue.where('syncStatus').equals('pending').toArray();

    if (eventsToSync.length === 0) {
        console.log("[SYNC] La coda è vuota. Nessuna operazione da eseguire.");
        return;
    }

    console.log(`[SYNC] Trovati ${eventsToSync.length} eventi in attesa. Elaborazione in corso...`);

    for (const event of eventsToSync) {
        if (event.id === undefined) {
            console.error("[SYNC] ERRORE INTERNO: Trovato evento senza ID locale, impossibile processare:", event);
            continue;
        }

        console.log(`[SYNC] TENTATIVO DI INVIO per evento locale ID: ${event.id}, Tipo: ${event.type}`);
        const { syncStatus, attempts, id, ...payloadToSend } = event;

        try {
            // ++ CORREZIONE FINALE E DEFINITIVA: Scrittura nella collezione corretta 'sync' ++
            const docRef = await addDoc(collection(firestoreDb, 'sync'), payloadToSend);
            
            console.log(`[SYNC] SUCCESSO! Evento inviato a Firestore. ID locale: ${event.id}, ID Firestore: ${docRef.id}.`);

            await localDb.syncQueue.delete(event.id);
            console.log(`[SYNC] Evento locale ${event.id} eliminato dalla coda.`);

        } catch (error: any) {
            console.error(`----------------------------------------------------------------`);
            console.error(`[SYNC] ERRORE CRITICO nell'invio a Firestore per l'evento locale ID: ${event.id}.`);
            console.error(`[SYNC] L'evento NON è stato eliminato e sarà ritentato.`);
            console.error(`[SYNC] Messaggio di errore:`, error.message);
            console.error(`[SYNC] Codice di errore:`, error.code);
            console.error(`[SYNC] Dettagli completi dell'errore:`, error);
            console.error(`----------------------------------------------------------------`);
        }
    }
};

// --- GESTIONE PROCESSO IN BACKGROUND ---

let syncInterval: NodeJS.Timeout | null = null;
export const startSyncProcess = (intervalMs: number = 30000) => {
    if (syncInterval) {
        return;
    }
    console.log(`[SYNC] Avvio processo di sincronizzazione in background ogni ${intervalMs / 1000} secondi.`);
    processSyncQueue();
    syncInterval = setInterval(processSyncQueue, intervalMs);
};

export const stopSyncProcess = () => {
    if (syncInterval) {
        clearInterval(syncInterval);
        syncInterval = null;
        console.log("[SYNC] Processo di sincronizzazione in background interrotto.");
    }
};
