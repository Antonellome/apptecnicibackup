import { db } from '@/db/local-db';
import { functions, db as firestore } from '@/utils/firebase';
import { httpsCallable } from 'firebase/functions';
import { createRapportino, updateRapportino } from './rapportiniService';
import { onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
import { Rapportino } from '@/models/definitions';

// --- Funzioni di Sincronizzazione basate su Cloud Functions ---

const syncAllAnagraficheCallable = httpsCallable(functions, 'syncAllAnagrafiche');
const getAllRapportiniForSyncCallable = httpsCallable(functions, 'getAllRapportiniForSync');

/**
 * Esegue la sincronizzazione delle sole anagrafiche con una chiamata al backend.
 */
export const syncAllAnagrafiche = async () => {
  console.log("Avvio procedura di sincronizzazione ANAGRAFICHE...");
  try {
    const result = await syncAllAnagraficheCallable();
    const allData = result.data as { [key: string]: any[] };

    if (!allData || Object.keys(allData).length === 0) {
      console.warn("La funzione di sync anagrafiche non ha restituito dati.");
      return;
    }

    const tablesToUpdate = Object.keys(allData).filter(key => db.table(key));
    if (tablesToUpdate.length === 0) {
        console.warn("Nessuna delle collezioni anagrafiche ricevute corrisponde a una tabella.");
        return;
    }
    const dexieTables = tablesToUpdate.map(name => (db as any)[name]);

    await db.transaction('rw', dexieTables, async () => {
      for (const collectionName of tablesToUpdate) {
        const items = allData[collectionName];
        if (items && Array.isArray(items)) {
            const table = (db as any)[collectionName];
            await table.clear();
            await table.bulkAdd(items);
            console.log(`Sync anagrafiche completata per ${collectionName}: ${items.length} record.`);
        }
      }
    });
  } catch (error) {
    console.error("ERRORE CRITICO durante la sincronizzazione delle anagrafiche:", error);
    throw new Error("La procedura di sync anagrafiche è fallita.");
  }
}

/**
 * Esegue la sincronizzazione dei soli rapportini utente con una chiamata al backend.
 * @param tecnicoId L'ID del tecnico per cui scaricare i rapportini.
 */
export const syncUserRapportini = async (tecnicoId: string) => {
  console.log(`Avvio procedura di sincronizzazione RAPPORTINI per tecnico: ${tecnicoId}...`);
  if (!tecnicoId) {
    console.error("ID tecnico non fornito per sync rapportini.");
    throw new Error("ID Tecnico non valido");
  }

  try {
    const result = await getAllRapportiniForSyncCallable({ tecnicoId });
    const rapportini = result.data as Rapportino[];

    if (!rapportini || rapportini.length === 0) {
      console.warn("Nessun rapportino restituito dalla funzione di sync. La tabella locale sarà svuotata.");
      await db.rapportini.clear();
      return;
    }

    await db.transaction('rw', db.rapportini, async () => {
        await db.rapportini.clear();
        await db.rapportini.bulkPut(rapportini);
    });

    console.log(`Sync completata per i rapportini: ${rapportini.length} record.`);

  } catch (error) {
    console.error("ERRORE CRITICO durante la sincronizzazione dei rapportini:", error);
    throw new Error("La procedura di sync rapportini è fallita.");
  }
}


// --- Le altre funzioni rimangono invariate ---

export const processSyncQueue = async () => {
    const itemsToSync = await db.syncQueue.where('syncStatus').equals('pending').toArray();
    if (itemsToSync.length === 0) return;
  
    for (const item of itemsToSync) {
      try {
        let result;
        switch (item.type) {
          case 'rapportino':
            switch (item.action) {
              case 'create':
                result = await createRapportino(item.payload);
                break;
              case 'update':
                result = await updateRapportino(item.entityId, item.payload);
                break;
              default:
                throw new Error(`Azione non supportata: ${item.action}`);
            }
            break;
          default:
            throw new Error(`Tipo non supportato: ${item.type}`);
        }
        await db.syncQueue.delete(item.id!);
      } catch (error) {
        console.error(`Errore sync elemento ${item.id}:`, error);
      }
    }
  };

export const listenForRapportiniUpdates = (tecnicoId: string, onUpdate: (rapportini: Rapportino[]) => void) => {
  const rapportiniRef = collection(firestore, 'rapportini');
  const q = query(
    rapportiniRef,
    where('tecnicoId', '==', tecnicoId)
  );

  return onSnapshot(q, async (snapshot) => {
    const rapportini: Rapportino[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Rapportino));
    try {
      await db.rapportini.bulkPut(rapportini);
      onUpdate(rapportini);
    } catch (error) {
      console.error("Errore durante l'aggiornamento dei rapportini in Dexie via listener:", error);
    }
  }, (error) => {
    console.error("Errore nell'ascolto dei rapportini:", error);
  });
};
