import { db } from '@/db/local-db';
import { collection, doc, writeBatch, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db as firestoreDb } from '@/firebase';
import { Rapportino, SyncEvent } from '@/models/definitions';

let isSyncing = false;

// --- FUNZIONI DI SANITIZZAZIONE ---

function removeUndefinedKeys(obj: any): any {
  if (obj === null || typeof obj !== 'object' || obj instanceof Date || obj instanceof Timestamp) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefinedKeys(item)).filter(item => item !== undefined);
  }

  const newObj: { [key: string]: any } = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key) && obj[key] !== undefined) {
      const value = removeUndefinedKeys(obj[key]);
      if (value !== undefined) {
        newObj[key] = value;
      }
    }
  }
  return newObj;
}

// --- FUNZIONE DI DOWNLOAD INCREMENTALE: DA FIRESTORE A DEXIE ---

const safeConvertToDate = (timestamp: any): Date => {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  if (timestamp && typeof timestamp.seconds === 'number') {
    return new Date(timestamp.seconds * 1000);
  }
  const d = new Date(timestamp);
  if (!isNaN(d.getTime())) {
    return d;
  }
  return new Date();
};

export const syncRapportiniFromFirebase = async (tecnicoId: string) => {
  if (!navigator.onLine) return;

  try {
    // 1. Leggi l'ultimo timestamp di sincronizzazione da Dexie
    const lastSyncState = await db.syncState.get('rapportini');
    const lastSyncTimestamp = lastSyncState ? lastSyncState.timestamp : new Date(0); // Usa epoch se non ha mai sincronizzato

    console.log(`DOWNLOAD_SYNC (INCREMENTALE): Sincronizzo rapportini modificati dopo ${lastSyncTimestamp.toISOString()}`);

    // 2. Costruisci le query con il filtro temporale basato su 'updatedAt'
    const rapportiniCollection = collection(firestoreDb, 'rapportini');
    const q1 = query(rapportiniCollection, where('tecnicoId', '==', tecnicoId), where('updatedAt', '>', lastSyncTimestamp));
    const q2 = query(rapportiniCollection, where('presenze', 'array-contains', tecnicoId), where('updatedAt', '>', lastSyncTimestamp));

    const [snapshot1, snapshot2] = await Promise.all([getDocs(q1), getDocs(q2)]);
    const rapportiniMap = new Map<string, Rapportino>();

    const processSnapshot = (snapshot: any) => {
      snapshot.docs.forEach((doc: any) => {
        const data = doc.data();
        const rapportinoProcessato: Rapportino = {
          ...data,
          id: doc.id,
          data: safeConvertToDate(data.data),
          oraInizio: data.oraInizio ? safeConvertToDate(data.oraInizio) : undefined,
          oraFine: data.oraFine ? safeConvertToDate(data.oraFine) : undefined,
          updatedAt: data.updatedAt ? safeConvertToDate(data.updatedAt) : new Date(),
          createdAt: data.createdAt ? safeConvertToDate(data.createdAt) : new Date(),
          isOffline: false,
        };
        rapportiniMap.set(doc.id, rapportinoProcessato);
      });
    };

    processSnapshot(snapshot1);
    processSnapshot(snapshot2);

    if (rapportiniMap.size > 0) {
        const allRapportini = Array.from(rapportiniMap.values());
        console.log(`DOWNLOAD_SYNC (INCREMENTALE): Trovati ${allRapportini.length} rapportini nuovi o modificati. Aggiorno cache...`);
        await db.rapportini.bulkPut(allRapportini);
    } else {
        console.log("DOWNLOAD_SYNC (INCREMENTALE): Nessun rapportino nuovo o modificato da scaricare.");
    }

    // 3. Aggiorna il timestamp di sincronizzazione all'ora attuale, anche se non sono stati trovati documenti,
    // per evitare di ricontrollare lo stesso periodo di tempo inutilmente.
    await db.syncState.put({ id: 'rapportini', timestamp: new Date() });

  } catch (error) {
    console.error("DOWNLOAD_SYNC (INCREMENTALE): Errore durante il download dei rapportini:", error);
  }
};

// --- FUNZIONE DI UPLOAD: DA DEXIE A FIRESTORE (INVARIATA) ---

export const aggiungiAllaCoda = async (rapportino: Omit<Rapportino, 'id'>, reportId?: string): Promise<string> => {
    const idEntita = reportId || `local-${Date.now()}`;
    const rapportinoCompleto: Rapportino = {
        ...(rapportino as Rapportino),
        id: idEntita,
        isOffline: true,
        updatedAt: new Date(),
    };
    const evento: Omit<SyncEvent, 'id'> = {
        entityId: idEntita,
        type: 'rapportino',
        payload: rapportino,
        timestamp: new Date(),
        syncStatus: 'pending',
    };
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

        const payload = syncEvent.payload as Rapportino;
        const { entityId } = syncEvent;

        const rapportinoDaInviare = removeUndefinedKeys({
            ...payload,
            updatedAt: new Date(),
        });

        delete (rapportinoDaInviare as any).id;
        delete (rapportinoDaInviare as any).isOffline;

        if (entityId.startsWith('local-')) {
            const newDocRef = doc(collection(firestoreDb, 'rapportini'));
            batch.set(newDocRef, { ...rapportinoDaInviare, id: newDocRef.id, createdAt: payload.createdAt || new Date() });
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
        if (updates.length > 0) {
            await db.rapportini.bulkPut(updates);
        }
    } catch (error) {
        console.error("UPLOAD_SYNC: Errore durante il commit batch:", error);
    }
};

// --- FUNZIONE ORCHESTRATORE (INVARIATA) ---

export const sincronizzaTutto = async (tecnicoId: string) => {
    if (isSyncing || !navigator.onLine) return;

    isSyncing = true;
    try {
        // Ora invoca la nuova funzione di sync incrementale
        await syncRapportiniFromFirebase(tecnicoId);
        await syncUploadsToFirebase();
    } catch (error) {
        console.error("SYNC: Errore critico durante il ciclo di sincronizzazione.", error);
    } finally {
        isSyncing = false;
    }
};
