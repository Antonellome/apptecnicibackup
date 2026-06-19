import { db } from '@/db/local-db';
import { collection, doc, addDoc, runTransaction, writeBatch } from 'firebase/firestore';
import { db as firestoreDb } from '@/firebase';
import { Rapportino, SyncEvent } from '@/models/definitions';

let isSyncing = false;

export const aggiungiAllaCoda = async (rapportino: Omit<Rapportino, 'id'>, reportId?: string): Promise<string> => {
  const idEntita = reportId || `local-${Date.now()}`;

  // Costruisci l'oggetto rapportino completo, inclusivo di ID e stato offline
  const rapportinoCompleto: Rapportino = {
    ...(rapportino as Rapportino), // Il cast è sicuro qui, stiamo costruendo l'oggetto finale
    id: idEntita,
    isOffline: true, // Aggiungi il flag per identificarlo come "locale"
    updatedAt: new Date(), // Assicurati che l'ultimo aggiornamento sia fresco
  };

  // Costruisci l'evento di sincronizzazione
  const evento: Omit<SyncEvent, 'id'> = {
    entityId: idEntita,
    type: 'rapportino',
    payload: rapportino, // Il payload non necessita del flag isOffline o dell'ID temporaneo
    timestamp: new Date(),
    syncStatus: 'pending',
  };

  try {
    // Esegui entrambe le operazioni in una transazione Dexie per garantire l'atomicità
    await db.transaction('rw', db.rapportini, db.syncQueue, async () => {
      await db.rapportini.put(rapportinoCompleto);
      await db.syncQueue.put(evento);
    });

    console.log(`Rapportino ${idEntita} salvato localmente e accodato per la sincronizzazione.`);
    return idEntita;

  } catch (error) {
    console.error(`Errore durante il salvataggio atomico del rapportino ${idEntita}:`, error);
    throw error; // Rilancia l'errore per notificare il chiamante
  }
};

export const sincronizzaConFirebase = async () => {
  if (isSyncing) {
    console.log("SYNC_LOCK: Sincronizzazione già in corso.");
    return;
  }
  if (!navigator.onLine) {
    console.log("SYNC: Offline, sincronizzazione saltata.");
    return;
  }

  isSyncing = true;
  console.log("SYNC_LOCK: Inizio sincronizzazione.");

  const rapportiniDaSincronizzare = await db.syncQueue.where('type').equals('rapportino').and(item => item.syncStatus === 'pending').toArray();

  if (rapportiniDaSincronizzare.length === 0) {
    console.log("SYNC: Coda vuota.");
    isSyncing = false;
    return;
  }

  console.log(`Trovati ${rapportiniDaSincronizzare.length} rapportini da sincronizzare.`);

  // Usa un batch di Firestore per efficienza
  const batch = writeBatch(firestoreDb);
  const syncEventIdsToDelete: number[] = [];

  for (const syncEvent of rapportiniDaSincronizzare) {
    if (!syncEvent.id) continue;

    const { entityId, payload } = syncEvent;
    const rapportinoDaInviare: Omit<Rapportino, 'id' | 'isOffline'> = {
      ...(payload as Omit<Rapportino, 'id'>),
      veicoloId: (payload as Rapportino).veicoloId || 'Nessuno',
      naveId: (payload as Rapportino).naveId || 'Nessuna',
      luogoId: (payload as Rapportino).luogoId || 'Nessuno',
      updatedAt: new Date(),
    };

    if (entityId.startsWith('local-')) {
      // Crea un nuovo documento e prepara l'aggiornamento locale post-sync
      const newDocRef = doc(collection(firestoreDb, 'rapportini'));
      batch.set(newDocRef, { ...rapportinoDaInviare, id: newDocRef.id, createdAt: payload.createdAt || new Date() });
    } else {
      // Aggiorna un documento esistente
      const reportRef = doc(firestoreDb, 'rapportini', entityId);
      batch.update(reportRef, rapportinoDaInviare as any);
    }
    
    syncEventIdsToDelete.push(syncEvent.id);
  }

  try {
    await batch.commit();
    console.log("Firestore batch commit completato con successo.");

    // Pulisci la coda di sincronizzazione solo per gli eventi processati
    await db.syncQueue.bulkDelete(syncEventIdsToDelete);
    console.log(`${syncEventIdsToDelete.length} eventi rimossi dalla coda di sincronizzazione.`);

    // Aggiorna i rapportini locali per rimuovere il flag `isOffline`
    const idsAggiornati = rapportiniDaSincronizzare.map(e => e.entityId);
    const rapportiniLocaliDaAggiornare = await db.rapportini.where('id').anyOf(idsAggiornati).toArray();
    const updates = rapportiniLocaliDaAggiornare.map(r => ({ ...r, isOffline: false }));
    if (updates.length > 0) {
      await db.rapportini.bulkPut(updates);
      console.log(`${updates.length} rapportini locali aggiornati con flag isOffline=false.`);
    }

  } catch (error) {
    console.error("Errore durante la sincronizzazione batch con Firestore:", error);
    // In caso di errore, gli eventi rimangono in 'pending' e verranno riprovati al prossimo tentativo.
  } finally {
    isSyncing = false;
    console.log("SYNC_LOCK: Sincronizzazione completata.");
  }
};
