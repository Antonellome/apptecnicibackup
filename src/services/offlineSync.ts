import { db } from '@/db/local-db';
import { collection, doc, writeBatch, query, where, getDocs, Timestamp, DocumentData } from 'firebase/firestore';
import { db as firestoreDb } from '@/firebase';
import { Rapportino, SyncEvent } from '@/models/definitions';

let isSyncing = false;

// --- FUNZIONI DI SANITIZZAZIONE (INVARIATE) ---
function removeUndefinedKeys(obj: any): any {
    if (obj === null || typeof obj !== 'object' || obj instanceof Date || obj instanceof Timestamp) return obj;
    if (Array.isArray(obj)) return obj.map(item => removeUndefinedKeys(item)).filter(item => item !== undefined);
    const newObj: { [key: string]: any } = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key) && obj[key] !== undefined) {
            const value = removeUndefinedKeys(obj[key]);
            if (value !== undefined) newObj[key] = value;
        }
    }
    return newObj;
}

const safeConvertToDate = (timestamp: any): Date => {
    if (timestamp instanceof Timestamp) return timestamp.toDate();
    if (timestamp && typeof timestamp.seconds === 'number') return new Date(timestamp.seconds * 1000);
    const d = new Date(timestamp);
    return !isNaN(d.getTime()) ? d : new Date();
};

// --- FUNZIONE DI DOWNLOAD (ORA FULL-SYNC CON SAFETY-LOCK): DA FIRESTORE A DEXIE ---
export const syncRapportiniFromFirebase = async (tecnicoId: string) => {
    if (!tecnicoId) {
        console.error("[FULL_SYNC] Annullato: tecnicoId non fornito.");
        return;
    }
    if (!navigator.onLine) {
        console.log("[FULL_SYNC] Offline. Sincronizzazione saltata.");
        return;
    }

    console.log(`[FULL_SYNC] Avvio sincronizzazione per l'utente: ${tecnicoId}`);

    try {
        // 1. Ottieni TUTTI i dati remoti pertinenti da Firestore
        const rapportiniCollection = collection(firestoreDb, 'rapportini');
        const q1 = query(rapportiniCollection, where('tecnicoId', '==', tecnicoId));
        const q2 = query(rapportiniCollection, where(`dettaglioOreTecnici.${tecnicoId}`, '!=', null));

        const [snapshot1, snapshot2] = await Promise.all([getDocs(q1), getDocs(q2)]);
        const remoteRapportiniMap = new Map<string, Rapportino>();

        const processSnapshot = (snapshot: DocumentData) => {
            snapshot.docs.forEach((doc: DocumentData) => {
                const data = doc.data();
                remoteRapportiniMap.set(doc.id, {
                    ...data,
                    id: doc.id,
                    data: safeConvertToDate(data.data),
                    oraInizio: data.oraInizio ? safeConvertToDate(data.oraInizio) : undefined,
                    oraFine: data.oraFine ? safeConvertToDate(data.oraFine) : undefined,
                    updatedAt: safeConvertToDate(data.updatedAt),
                    createdAt: data.createdAt ? safeConvertToDate(data.createdAt) : new Date(),
                    isOffline: false,
                });
            });
        };

        processSnapshot(snapshot1);
        processSnapshot(snapshot2);

        const remoteData = Array.from(remoteRapportiniMap.values());
        const remoteIds = remoteData.map(item => item.id);
        console.log(`[FULL_SYNC] Trovati ${remoteIds.length} rapportini su Firestore.`);

        // 2. Ottieni TUTTI gli ID locali da Dexie (CON LA SINTASSI CORRETTA)
        const localIds = await db.rapportini.toCollection().keys() as string[];
        console.log(`[FULL_SYNC] Trovati ${localIds.length} rapportini in locale.`);

        // 3. Esegui operazioni in batch con TRANSAZIONE e SAFETY LOCK
        await db.transaction('rw', db.rapportini, async () => {
            // SEZIONE A: CANCELLAZIONE - Eseguita solo in condizioni di sicurezza
            const isSafeToDelete = remoteIds.length > 0 || (remoteIds.length === 0 && localIds.length === 0);
            
            if (isSafeToDelete) {
                const idsToDelete = localIds.filter(id => !remoteIds.includes(id));
                if (idsToDelete.length > 0) {
                    await db.rapportini.bulkDelete(idsToDelete);
                    console.log(`[FULL_SYNC] CANCELLATI ${idsToDelete.length} rapportini obsoleti.`);
                }
            } else {
                // SAFETY LOCK: Previene la cancellazione di massa se il server risponde vuoto ma localmente ci sono dati
                console.warn(`[FULL_SYNC] SAFETY LOCK! La query remota è vuota ma ci sono ${localIds.length} record locali. Cancellazione saltata per prevenire perdita di dati.`);
            }

            // SEZIONE B: UPSERT (Update/Insert) - Eseguita sempre se ci sono dati remoti
            if (remoteData.length > 0) {
                await db.rapportini.bulkPut(remoteData);
                console.log(`[FULL_SYNC] AGGIORNATI/INSERITI ${remoteData.length} rapportini in Dexie.`);
            }
        });

        console.log("[FULL_SYNC] Sincronizzazione completata.");

    } catch (error) {
        console.error("[FULL_SYNC] ERRORE GRAVE durante la sincronizzazione:", error);
    }
};

// --- FUNZIONI DI UPLOAD E ORCHESTRAZIONE (INVARIATE) ---

export const aggiungiAllaCoda = async (rapportino: Omit<Rapportino, 'id'>, reportId?: string): Promise<string> => {
    const idEntita = reportId || `local-${Date.now()}`;
    const rapportinoCompleto: Rapportino = { ...(rapportino as Rapportino), id: idEntita, isOffline: true, updatedAt: new Date() };
    const evento: Omit<SyncEvent, 'id'> = { entityId: idEntita, type: 'rapportino', payload: rapportino, timestamp: new Date(), syncStatus: 'pending' };
    try {
        await db.transaction('rw', db.rapportini, db.syncQueue, async () => {
            await db.rapportini.put(rapportinoCompleto);
            await db.syncQueue.put(evento);
        });
        return idEntita;
    } catch (error) {
        console.error(`Errore durante il salvataggio atomico del rapportino ${idEntita}:`, error);
        throw error;
    }
};

const syncUploadsToFirebase = async () => {
    const rapportiniDaSincronizzare = await db.syncQueue.where('type').equals('rapportino').and(item => item.syncStatus === 'pending').toArray();
    if (rapportiniDaSincronizzare.length === 0) return;
    const batch = writeBatch(firestoreDb);
    const syncEventIdsToDelete: number[] = [];
    for (const syncEvent of rapportiniDaSincronizzare) {
        if (!syncEvent.id) continue;
        const { entityId, payload } = syncEvent;
        const rapportinoDaInviare = removeUndefinedKeys({ ...payload, updatedAt: new Date() });
        delete (rapportinoDaInviare as any).id;
        delete (rapportinoDaInviare as any).isOffline;
        if (entityId.startsWith('local-')) {
            const newDocRef = doc(collection(firestoreDb, 'rapportini'));
            batch.set(newDocRef, { ...rapportinoDaInviare, id: newDocRef.id, createdAt: (payload as Rapportino).createdAt || new Date() });
        } else {
            const reportRef = doc(firestoreDb, 'rapportini', entityId);
            batch.update(reportRef, rapportinoDaInviare);
        }
        syncEventIdsToDelete.push(syncEvent.id);
    }
    try {
        await batch.commit();
        await db.syncQueue.bulkDelete(syncEventIdsToDelete);
        const idsAggiornati = rapportiniDaSincronizzare.map(e => e.entityId);
        const rapportiniLocaliDaAggiornare = await db.rapportini.where('id').anyOf(idsAggiornati).toArray();
        const updates = rapportiniLocaliDaAggiornare.map(r => ({ ...r, isOffline: false }));
        if (updates.length > 0) await db.rapportini.bulkPut(updates);
    } catch (error) {
        console.error("UPLOAD_SYNC: Errore durante il commit batch:", error);
    }
};

export const sincronizzaTutto = async (tecnicoId: string) => {
    if (isSyncing || !navigator.onLine) return;
    isSyncing = true;
    try {
        await syncRapportiniFromFirebase(tecnicoId);
        await syncUploadsToFirebase();
    } catch (error) {
        console.error("SYNC: Errore critico durante il ciclo di sincronizzazione.", error);
    } finally {
        isSyncing = false;
    }
};
