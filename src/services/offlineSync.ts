import { db } from '@/db/local-db';
import { collection, doc, addDoc, runTransaction } from 'firebase/firestore';
import { db as firestoreDb } from '@/firebase';
import { Rapportino, SyncEvent } from '@/models/definitions';

// --- MECCANISMO DI LOCK PER PREVENIRE RACE CONDITION ---
let isSyncing = false;

export const aggiungiAllaCoda = async (rapportino: Omit<Rapportino, 'id'>, reportId?: string) => {
  try {
    const idEntita = reportId || `local-${Date.now()}`;

    const evento: Omit<SyncEvent, 'id'> = {
        entityId: idEntita,
        type: 'rapportino',
        payload: rapportino,
        timestamp: new Date(),
        syncStatus: 'pending',
    };
    
    const id = await db.syncQueue.put(evento);

    console.log(`Rapportino con entityId ${idEntita} accodato con PK: ${id}.`);
    return idEntita;
  } catch (error) {
    console.error("Errore nell'aggiungere il rapportino alla coda offline:", error);
    throw error;
  }
};

/**
 * Tenta di sincronizzare i rapportini in sospeso con Firebase.
 * AGGIORNAMENTO: Aggiunto meccanismo di lock per prevenire race condition.
 */
export const sincronizzaConFirebase = async () => {
  if (isSyncing) {
    console.log("SYNC_LOCK: Sincronizzazione già in corso. Saltando questo trigger.");
    return;
  }

  isSyncing = true;
  console.log("SYNC_LOCK: Semaforo ROSSO. Inizio sincronizzazione.");

  try {
    const rapportiniDaSincronizzare = await db.syncQueue.where('type').equals('rapportino').and(item => item.syncStatus !== 'syncing').toArray();

    if (rapportiniDaSincronizzare.length === 0) {
        console.log("SYNC: Coda vuota. Nessuna azione richiesta.");
        return;
    }

    console.log(`Trovati ${rapportiniDaSincronizzare.length} rapportini da sincronizzare.`);

    for (const syncEvent of rapportiniDaSincronizzare) {
        if (!syncEvent.id) continue;

        await db.syncQueue.update(syncEvent.id, { syncStatus: 'syncing' });

        const { entityId, payload, id } = syncEvent;
        
        const rapportinoDaInviare: Omit<Rapportino, 'id'> = {
            ...(payload as Omit<Rapportino, 'id'>),
            veicoloId: (payload as Rapportino).veicoloId || 'Nessuno',
            naveId: (payload as Rapportino).naveId || 'Nessuna',
            luogoId: (payload as Rapportino).luogoId || 'Nessuno',
            updatedAt: new Date(),
        };

        try {
            if (entityId && !entityId.startsWith('local-')) {
                await runTransaction(firestoreDb, async (transaction) => {
                    const reportRef = doc(firestoreDb, 'rapportini', entityId);
                    transaction.update(reportRef, rapportinoDaInviare);
                });
                console.log(`Rapportino con ID ${entityId} aggiornato con successo.`);
            } else {
                const finalPayload = { ...rapportinoDaInviare, createdAt: new Date() };
                await addDoc(collection(firestoreDb, 'rapportini'), finalPayload);
                console.log(`Nuovo rapportino (da ${entityId}) creato con successo.`);
            }

            await db.syncQueue.delete(id);
            console.log(`Elemento ${id} rimosso dalla coda.`);

        } catch (error) {
            console.error(`Errore durante la sincronizzazione del rapportino ${entityId || 'nuovo'}. La modifica è conservata localmente. Errore:`, error);
            await db.syncQueue.update(id, { syncStatus: 'error' });
        }
    }
  } finally {
    isSyncing = false;
    console.log("SYNC_LOCK: Semaforo VERDE. Sincronizzazione completata.");
  }
};

export const sincronizzaCondivisioni = async () => {
  // Logica da implementare
};
