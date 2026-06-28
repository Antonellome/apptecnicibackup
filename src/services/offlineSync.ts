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
    const lastSyncState = await db.syncState.get('rapportini');
    const lastSyncTimestamp = lastSyncState ? lastSyncState.timestamp : new Date(0);

    console.log(`DOWNLOAD_SYNC: Sincronizzo rapportini per ${tecnicoId} modificati dopo ${lastSyncTimestamp.toISOString()}`);

    const rapportiniCollection = collection(firestoreDb, 'rapportini');
    
    // Query 1: Rapportini dove l'utente è il creatore (con filtro data)
    const q1 = query(rapportiniCollection, where('tecnicoId', '==', tecnicoId), where('updatedAt', '>', lastSyncTimestamp));
    
    // Query 2: Rapportini dove l'utente è partecipante (SENZA filtro data - verrà applicato nel client)
    const q2 = query(rapportiniCollection, where(`dettaglioOreTecnici.${tecnicoId}`, '!=', null));

    const [snapshot1, snapshot2] = await Promise.all([getDocs(q1), getDocs(q2)]);
    const rapportiniMap = new Map<string, Rapportino>();

    const processSnapshot = (snapshot: any, filterByDate: boolean) => {
      snapshot.docs.forEach((doc: any) => {
        const data = doc.data();
        const updatedAt = safeConvertToDate(data.updatedAt);

        // Applica il filtro data nel client se richiesto (per la query q2)
        if (filterByDate && updatedAt <= lastSyncTimestamp) {
            return; // Salta questo documento perché non è stato modificato di recente
        }

        const rapportinoProcessato: Rapportino = {
          ...data,
          id: doc.id,
          data: safeConvertToDate(data.data),
          oraInizio: data.oraInizio ? safeConvertToDate(data.oraInizio) : undefined,
          oraFine: data.oraFine ? safeConvertToDate(data.oraFine) : undefined,
          updatedAt: updatedAt,
          createdAt: data.createdAt ? safeConvertToDate(data.createdAt) : new Date(),
          isOffline: false,
        };
        rapportiniMap.set(doc.id, rapportinoProcessato);
      });
    };

    // Processa i risultati di q1 (il filtro data è già nella query)
    processSnapshot(snapshot1, false);
    // Processa i risultati di q2 (il filtro data viene applicato qui)
    processSnapshot(snapshot2, true);

    if (rapportiniMap.size > 0) {
        const allRapportini = Array.from(rapportiniMap.values());
        console.log(`DOWNLOAD_SYNC: Trovati ${allRapportini.length} rapportini totali da aggiornare. Aggiorno cache...`);
        await db.rapportini.bulkPut(allRapportini);
    } else {
        console.log("DOWNLOAD_SYNC: Nessun rapportino nuovo o modificato da scaricare.");
    }

    await db.syncState.put({ id: 'rapportini', timestamp: new Date() });

  } catch (error) {
    console.error("DOWNLOAD_SYNC: Errore durante il download dei rapportini:", error);
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
        await syncRapportiniFromFirebase(tecnicoId);
        await syncUploadsToFirebase();
    } catch (error) {
        console.error("SYNC: Errore critico durante il ciclo di sincronizzazione.", error);
    } finally {
        isSyncing = false;
    }
};
