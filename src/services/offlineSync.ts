import { db } from '@/db/local-db';
import { apiCreateRapportino, apiUpdateRapportino, apiDeleteRapportino, apiCreateCheckin, apiSyncAllAnagrafiche, apiGetAllRapportiniForSync, apiGetCheckinsUpdates } from '@/api/service';
import { Rapportino, SyncEvent, CheckinGiornaliero, FirebaseDoc } from '@/models/definitions';
import { parseAndValidateDate } from '@/utils/dateUtils';
import Dexie from 'dexie';

// CORREZIONE BUG: Il timestamp era bloccato al 2025. Aggiornato a una data futura (2030).
const SANITY_CHECK_TIMESTAMP = 1893456000000; // January 1, 2030 00:00:00 UTC

const processSyncItem = async (item: SyncEvent): Promise<void> => {
    console.log(`UPLOAD_SYNC_V3: Processo l\'evento ${item.id} di tipo \'${item.type}\' con azione \'${item.action}\'`);
    try {
        switch (item.type) {
            case 'rapportino':
                if (item.action === 'create') {
                    await apiCreateRapportino(item.payload as Rapportino);
                } else if (item.action === 'update') {
                    await apiUpdateRapportino(item.payload as Rapportino);
                } else if (item.action === 'delete') {
                    await apiDeleteRapportino(item.entityId);
                }
                break;
            case 'checkin':
                if (item.action === 'create') {
                    const payload = { ...item.payload as CheckinGiornaliero };
                    delete (payload as any).id;
                    await apiCreateCheckin(payload);
                }
                break;
            default:
                console.warn(`Tipo di evento non riconosciuto: ${item.type}`);
                await db.syncQueue.update(item.id!, { syncStatus: 'error' });
                return;
        }

        await db.syncQueue.delete(item.id!);
        console.log(`UPLOAD_SYNC_V3: Evento ${item.id} (${item.type}) completato e rimosso dalla coda.`);

    } catch (error: any) {
        console.error(`UPLOAD_SYNC_V3: Errore durante l\'elaborazione dell\'evento ${item.id} (${item.type}):`, error);
        await db.syncQueue.update(item.id!, { syncStatus: 'error', attempts: (item.attempts || 0) + 1 });
    }
};

export const uploadLocalChanges = async (tecnicoId: string) => {
    const pendingItems = await db.syncQueue.where('syncStatus').equals('pending').toArray();
    if (pendingItems.length === 0) return;

    console.log(`UPLOAD_SYNC_V3: Trovati ${pendingItems.length} eventi da inviare.`);
    for (const item of pendingItems) {
        await processSyncItem(item);
    }
    console.log('UPLOAD_SYNC_V3: Processo di upload terminato.');
};

const downloadAnagrafiche = async (tecnicoId: string) => {
    console.log("ANAGRAFICHE_SYNC_V3: Avvio sincronizzazione anagrafiche.");
    try {
        const delta = await apiSyncAllAnagrafiche({}, tecnicoId);
        if (!delta) {
            console.log("ANAGRAFICHE_SYNC_V3: Nessun delta ricevuto dal server.");
            return;
        }

        if (delta.config && !delta.impostazioni) {
            delta.impostazioni = delta.config;
            delete delta.config;
        }

        const tableNames = Object.keys(delta).filter(key => db.table(key));
        if (tableNames.length === 0) {
            console.log("ANAGRAFICHE_SYNC_V3: Nessuna tabella valida nel delta ricevuto.");
            return;
        }

        await db.transaction('rw', tableNames, async () => {
            for (const key of tableNames) {
                const table = db.table(key);
                const { data, timestamp } = delta[key];
                if (data && data.length > 0) {
                    await table.clear();
                    await table.bulkPut(data);
                }
                if (timestamp) {
                    await db.anagrafiche.put({ id: key, data: [], timestamp: new Date(timestamp) });
                }
            }
        });
        console.log("ANAGRAFICHE_SYNC_V3: Sincronizzazione completata.");
    } catch (error) {
        console.error("ANAGRAFICHE_SYNC_V3: Errore durante il download.", error);
        throw error;
    }
};

async function reconcileData<T extends FirebaseDoc>(
    table: Dexie.Table<T, string>,
    serverData: T[],
    localTemporaryData: T[],
    matcher: (serverItem: T, localItem: T) => boolean
) {
    const itemsToBulkPut: T[] = [];
    const localItemsToDelete: string[] = [];

    serverData.forEach(serverItem => {
        const matchingLocalItem = localTemporaryData.find(localItem => matcher(serverItem, localItem));

        if (matchingLocalItem) {
            localItemsToDelete.push(matchingLocalItem.id);
        }
        itemsToBulkPut.push(serverItem);
    });

    if (localItemsToDelete.length > 0 || itemsToBulkPut.length > 0) {
        await db.transaction('rw', table, async () => {
            if (localItemsToDelete.length > 0) {
                await table.bulkDelete(localItemsToDelete);
            }
            if (itemsToBulkPut.length > 0) {
                await table.bulkPut(itemsToBulkPut);
            }
        });
    }
}

const downloadAndReconcileCheckins = async (tecnicoId: string) => {
    console.log("CHECKINS_DOWNLOAD_V3: Avvio sincronizzazione incrementale.");
    try {
        let lastSyncTimestamp = (await db.localSyncInfo.get('lastCheckinsSync'))?.timestamp || 0;

        if (lastSyncTimestamp > SANITY_CHECK_TIMESTAMP) {
            console.warn(`[SANITY CHECK] Timestamp futuro (${new Date(lastSyncTimestamp)}) rilevato per Checkins. Reset a 0 per full-sync.`);
            lastSyncTimestamp = 0;
        }

        const serverResponse = await apiGetCheckinsUpdates({ lastSyncTimestamp, tecnicoId });
        const serverCheckins = serverResponse?.data || [];

        if (serverCheckins.length === 0) {
            console.log("CHECKINS_DOWNLOAD_V3: Nessun nuovo check-in.");
            return;
        }

        const sanitizedCheckins = serverCheckins.map((c: any) => {
            const timestampImpostato = parseAndValidateDate(c.timestampImpostato);
            const timestampReale = parseAndValidateDate(c.timestampReale);
            if (!timestampImpostato || !timestampReale) return null;
            return { ...c, timestampImpostato, timestampReale };
        }).filter((c: any): c is CheckinGiornaliero => c !== null);

        if (sanitizedCheckins.length === 0) {
            console.log("CHECKINS_DOWNLOAD_V3: Dati ricevuti non validi o corrotti.");
            return;
        }

        const localTemporaryCheckins = await db.checkin_giornalieri.where('id').startsWith('local_').toArray();

        await reconcileData(
            db.checkin_giornalieri,
            sanitizedCheckins,
            localTemporaryCheckins,
            (serverItem, localItem) => 
                serverItem.tipo === localItem.tipo &&
                new Date(serverItem.timestampImpostato).getTime() === new Date(localItem.timestampImpostato).getTime() &&
                serverItem.tecnicoId === localItem.tecnicoId
        );

        const latestTimestamp = Math.max(...sanitizedCheckins.map((c: CheckinGiornaliero) => c.timestampReale.getTime()));
        if (latestTimestamp > (lastSyncTimestamp || 0)) {
            await db.localSyncInfo.put({ id: 'lastCheckinsSync', timestamp: latestTimestamp });
        }
        console.log(`CHECKINS_DOWNLOAD_V3: Sincronizzazione completata.`);
    } catch (error) {
        console.error("CHECKINS_DOWNLOAD_V3: Errore grave durante il download.", error);
        throw error;
    }
};

const downloadAndReconcileRapportini = async (tecnicoId: string) => {
    console.log("RAPPORTINI_DOWNLOAD_V3: Avvio sincronizzazione incrementale.");
    try {
        let lastSyncTimestamp = (await db.localSyncInfo.get('lastRapportiniSync'))?.timestamp || 0;

        if (lastSyncTimestamp > SANITY_CHECK_TIMESTAMP) {
            console.warn(`[SANITY CHECK] Timestamp futuro (${new Date(lastSyncTimestamp)}) rilevato per Rapportini. Reset a 0 per full-sync.`);
            lastSyncTimestamp = 0;
        }

        const serverResponse = await apiGetAllRapportiniForSync({ lastSyncTimestamp, tecnicoId });
        const serverRapportini = serverResponse?.data || [];

        if (!serverRapportini || serverRapportini.length === 0) {
            console.log("RAPPORTINI_DOWNLOAD_V3: Nessun nuovo report.");
            return;
        }

        const sanitizedRapportini = serverRapportini.map((r: any) => {
            const correctedData = parseAndValidateDate(r.data);
            if (!correctedData) return null;
            return { ...r, data: correctedData, createdAt: parseAndValidateDate(r.createdAt), updatedAt: parseAndValidateDate(r.updatedAt) };
        }).filter((r: any): r is Rapportino => r !== null);

        if(sanitizedRapportini.length === 0) {
            console.log("RAPPORTINI_DOWNLOAD_V3: Dati ricevuti non validi o corrotti.");
            return;
        }

        const localTemporaryRapportini = await db.rapportini.where('id').startsWith('local_').toArray();

        await reconcileData(
            db.rapportini,
            sanitizedRapportini,
            localTemporaryRapportini,
            (serverItem, localItem) =>
                new Date(serverItem.data).getTime() === new Date(localItem.data).getTime() &&
                serverItem.tecnicoId === localItem.tecnicoId &&
                serverItem.tipoGiornataId === localItem.tipoGiornataId
        );

        const latestTimestamp = Math.max(...sanitizedRapportini.map((r: Rapportino) => new Date(r.updatedAt).getTime()));
         if (latestTimestamp > (lastSyncTimestamp || 0)) {
            await db.localSyncInfo.put({ id: 'lastRapportiniSync', timestamp: latestTimestamp });
        }
        console.log(`RAPPORTINI_DOWNLOAD_V3: Sincronizzazione completata.`);
    } catch (error) {
        console.error("RAPPORTINI_DOWNLOAD_V3: Errore grave durante il download.", error);
        throw error;
    }
};

export const sincronizzaTutto = async (tecnicoId: string) => {
    console.log("SYNC_V3: Avvio ciclo di sincronizzazione completo.");
    try {
        await uploadLocalChanges(tecnicoId);
        
        await Promise.all([
            downloadAnagrafiche(tecnicoId),
            downloadAndReconcileRapportini(tecnicoId),
            downloadAndReconcileCheckins(tecnicoId)
        ]);

        console.log("SYNC_V3: Ciclo di sincronizzazione completato con successo.");
    } catch (error) {
        console.error("SYNC_V3: Errore critico nel ciclo di sincronizzazione. Uno dei download è fallito.", error);
        throw error;
    } finally {
        console.log("SYNC_V3: Fine del ciclo di sincronizzazione.");
    }
};
