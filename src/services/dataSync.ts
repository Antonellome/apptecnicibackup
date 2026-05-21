
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
        const [tecnici, clienti, sedi, tipiGiornata, veicoli, luoghi, navi, ditte, categorie, impostazioni] = await Promise.all([
            fetchCollection<Tecnico>('tecnici'),
            fetchCollection<Cliente>('clienti'),
            fetchCollection<Sede>('sedi'),
            fetchCollection<TipoGiornata>('tipiGiornata'),
            fetchCollection<Veicolo>('veicoli'),
            fetchCollection<Luogo>('luoghi'),
            fetchCollection<Nave>('navi'),
            fetchCollection<Ditta>('ditte'),
            fetchCollection<Categoria>('categorie'),
            // 1. Aggiunto il fetch per le impostazioni
            fetchCollection<Impostazioni>('impostazioni'),
        ]);
        // 1. Aggiunto 'impostazioni' alla chiamata
        await localDb.populateMasterData({ tecnici, clienti, sedi, tipiGiornata, veicoli, luoghi, navi, ditte, categorie, impostazioni: impostazioni[0] || { tariffe: [] } });
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
            // 2. Rimosso l'assegnamento a docRef non utilizzato
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

// --- GESTIONE PROCESSO IN BACKGROUND ---

// 3. Il tipo NodeJS.Timeout è ora disponibile grazie a @types/node
let syncInterval: NodeJS.Timeout | null = null;
export const startSyncProcess = (intervalMs: number = 30000) => {
    if (syncInterval) {
        return;
    }
    processSyncQueue();
    syncInterval = setInterval(processSyncQueue, intervalMs);
};

export const stopSyncProcess = () => {
    if (syncInterval) {
        clearInterval(syncInterval);
        syncInterval = null;
    }
};
