
import { db } from '@/db/local-db';
import { functions, db as firestore } from '@/utils/firebase';
import { httpsCallable } from 'firebase/functions';
import { createRapportino, updateRapportino } from './rapportiniService';
import { onSnapshot, collection, query, where, doc, setDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { Rapportino, CheckinGiornaliero, SyncEvent } from '@/models/definitions';
import { TipiGiornataSchema, CategorieSchema, ClientiSchema, DitteSchema, LuoghiSchema, NaviSchema, TecniciSchema, VeicoliSchema } from '@/models/schemas';
import { z } from 'zod';

const syncAllAnagraficheCallable = httpsCallable(functions, 'syncAllAnagrafiche');
const getAllRapportiniForSyncCallable = httpsCallable(functions, 'getAllRapportiniForSync');

const schemaMap: { [key: string]: z.ZodArray<any> } = {
  tipiGiornata: TipiGiornataSchema,
  categorie: CategorieSchema,
  clienti: ClientiSchema,
  ditte: DitteSchema,
  luoghi: LuoghiSchema,
  navi: NaviSchema,
  tecnici: TecniciSchema,
  veicoli: VeicoliSchema,
};

export const aggiungiAllaCoda = async (item: Omit<SyncEvent, 'id' | 'timestamp' | 'syncStatus'>) => {
  console.log("Aggiungo alla coda di sincronizzazione", item);
  
  if (item.type === 'rapportino' && item.action === 'update' && item.entityId && item.entityId.startsWith('local-')) {
    const createOp = await db.syncQueue.where({ entityId: item.entityId, action: 'create' }).first();
    if (createOp) {
      console.log(`Consolido l'update per ${item.entityId} nel task di creazione esistente.`);
      const mergedPayload = { ...createOp.payload, ...item.payload };
      await db.syncQueue.update(createOp.id!, { payload: mergedPayload });
      return; 
    }
  }

  await db.syncQueue.add({
    ...item,
    timestamp: new Date(),
    syncStatus: 'pending'
  } as SyncEvent);
};

export const syncAllAnagrafiche = async () => {
    console.log("Avvio procedura di sincronizzazione ANAGRAFICHE...");
    try {
        const result = await syncAllAnagraficheCallable();
        const allData = result.data as { [key: string]: any[] };

        if (!allData || Object.keys(allData).length === 0) {
            console.warn("La funzione di sync anagrafiche non ha restituito dati.");
            return;
        }

        const knownTables = Object.keys(schemaMap);
        const dexieTables = knownTables.map(name => (db as any)[name]);

        await db.transaction('rw', dexieTables, async () => {
            for (const collectionName of knownTables) {
                const items = allData[collectionName];

                if (!items || !Array.isArray(items)) {
                    console.warn(`Dati per l'anagrafica '${collectionName}' non presenti o non validi nella risposta del server. Salto.`);
                    continue;
                }

                const schema = schemaMap[collectionName];
                const validationResult = schema.safeParse(items);

                if (validationResult.success) {
                    const table = (db as any)[collectionName];
                    await table.bulkPut(validationResult.data);
                    console.log(`Sync anagrafiche completata per ${collectionName}: ${validationResult.data.length} record validi.`);
                } else {
                    console.error(`Validazione fallita per ${collectionName}.`, validationResult.error.issues);

                    // LOG DI DEBUG AVANZATO
                    const firstFailingItem = items.find(item => !schema.element.safeParse(item).success);
                    if (firstFailingItem) {
                        console.error(`Dati del primo record fallito per ${collectionName}:`, JSON.stringify(firstFailingItem, null, 2));
                        const itemValidation = schema.element.safeParse(firstFailingItem);
                        if (!itemValidation.success) {
                            console.error(`Errore di validazione specifico per il record:`, JSON.stringify(itemValidation.error.issues, null, 2));
                        }
                    }

                    const validItems = items.filter(item => schema.element.safeParse(item).success);
                    if (validItems.length > 0) {
                        const table = (db as any)[collectionName];
                        await table.bulkPut(validItems);
                        console.log(`Salvato un subset di dati validi per ${collectionName}: ${validItems.length}/${items.length} record.`);
                    }
                }
            }
        });
    } catch (error: any) {
        console.error("ERRORE CRITICO durante la sincronizzazione delle anagrafiche. Dettagli:", error);
        if (error.message) {
            console.error("Messaggio Errore:", error.message);
        }
        if (error.details) {
            console.error("Dettagli Errore:", JSON.stringify(error.details));
        }
        throw new Error(`La procedura di sync anagrafiche è fallita: ${error.message || 'Errore sconosciuto'}`);
    }
}


export const syncUserRapportini = async (tecnicoId: string) => {
  console.log(`Avvio procedura di sincronizzazione RAPPORTINI per tecnico: ${tecnicoId}...`);
  if (!tecnicoId) {
    console.error("ID tecnico non fornito per sync rapportini.");
    throw new Error("ID Tecnico non valido");
  }

  try {
    const result = await getAllRapportiniForSyncCallable({ tecnicoId });
    const rapportini = result.data as Rapportino[];

    if (!rapportini) {
      console.warn("Nessun rapportino restituito dalla funzione di sync. La tabella locale non verrà modificata.");
      return;
    }

    await db.rapportini.bulkPut(rapportini);

    console.log(`Sync (non-distruttiva) completata per i rapportini: ${rapportini.length} record.`);

  } catch (error) {
    console.error("ERRORE CRITICO during la sincronizzazione dei rapportini:", error);
    throw new Error("La procedura di sync rapportini è fallita.");
  }
}

const syncCheckin = async (payload: CheckinGiornaliero) => {
    const { isSync, ...dataToSync } = payload;

    if (payload.id && payload.id.startsWith('local_')) {
        const collectionRef = collection(firestore, 'checkin_giornalieri');
        const docRef = await addDoc(collectionRef, { ...dataToSync, timestampSync: serverTimestamp() });
        
        await db.checkin_giornalieri.update(payload.id, { id: docRef.id, isSync: true });
        console.log(`Check-in locale ${payload.id} sincronizzato e aggiornato a ${docRef.id}.`);

        return { id: docRef.id };

    } else if (payload.id) {
        const checkinRef = doc(firestore, 'checkin_giornalieri', payload.id);
        await setDoc(checkinRef, dataToSync, { merge: true });
        console.log(`Check-in ${payload.id} aggiornato.`);
        return { id: payload.id };
    } 
    throw new Error("Tentativo di sincro checkin senza ID.");
};

export const processSyncQueue = async () => {
    const itemsToSync = await db.syncQueue.where('syncStatus').equals('pending').toArray();
    if (itemsToSync.length === 0) return;
  
    for (const item of itemsToSync) {
      try {
        let syncResult: any;

        switch (item.type) {
          case 'rapportino':
            if (item.action === 'create') {
                syncResult = await createRapportino(item.payload);
                const newRapportino = syncResult.data as Rapportino;

                if (!newRapportino || !newRapportino.id) {
                    console.warn(`createRapportino non ha restituito un ID valido. Tentativo di fallback.`);
                    const tecnicoId = item.payload?.tecnicoId;
                    if (!tecnicoId) throw new Error("ID tecnico mancante per il fallback.");
                    await db.rapportini.delete(item.entityId);
                    await syncUserRapportini(tecnicoId);
                } else {
                    await db.transaction('rw', db.rapportini, async () => {
                        await db.rapportini.delete(item.entityId);
                        await db.rapportini.put(newRapportino);
                        console.log(`Rapportino locale ${item.entityId} riconciliato con l'ID remoto ${newRapportino.id}`);
                    });
                }

            } else if (item.action === 'update' && item.entityId) {
                 if (item.entityId.startsWith('local-')) {
                    console.log(`Ignoro task di update per ${item.entityId} perché già consolidato.`);
                } else {
                    await updateRapportino(item.entityId, item.payload);
                }
            } else {
                throw new Error(`Azione non valida per rapportino: ${item.action}`);
            }
            break;
          
          case 'checkin':
            await syncCheckin(item.payload);
            break;

          default:
            throw new Error(`Tipo non supportato: ${item.type}`);
        }
        
        await db.syncQueue.delete(item.id!);

      } catch (error) {
        console.error(`Errore durante la sincr. dell'elemento ${item.id}. L'elemento rimane in coda.`, error);
        await db.syncQueue.update(item.id!, { syncStatus: 'failed' });
      }
    }
  };

export const listenForRapportiniUpdates = (tecnicoId: string, onUpdate: (rapportini: Rapportino[]) => void) => {
  const rapportiniRef = collection(firestore, 'rapportini');
  const q = query(rapportiniRef, where('tecnicoId', '==', tecnicoId));

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