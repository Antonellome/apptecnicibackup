import { db, RapportinoInSospeso } from '@/db/db';
import { collection, doc, addDoc, updateDoc, Timestamp, runTransaction } from 'firebase/firestore';
import { db as firestoreDb } from '@/firebase';
import { shareOrDownload } from './shareService';

export type { RapportinoInSospeso };

/**
 * Aggiunge o aggiorna un rapportino nella coda di sincronizzazione offline.
 */
export const aggiungiAllaCoda = async (rapportino: Omit<RapportinoInSospeso, 'localId'>, reportId?: string) => {
  try {
    const idDaUsare = reportId || undefined;

    const dataToQueue: RapportinoInSospeso = {
        ...rapportino,
        id: idDaUsare,
    };
    
    if (idDaUsare) {
        const existing = await db.rapportiniInSospeso.where('id').equals(idDaUsare).first();
        if (existing?.localId) {
            await db.rapportiniInSospeso.delete(existing.localId);
        }
    }

    await db.rapportiniInSospeso.add(dataToQueue);
    console.log(`Rapportino ${idDaUsare ? 'aggiornato' : 'aggiunto'} alla coda offline.`);
    return idDaUsare || 'local-' + Date.now();
  } catch (error) {
    console.error("Errore nell'aggiungere il rapportino alla coda offline:", error);
    throw error;
  }
};

/**
 * Tenta di sincronizzare i rapportini in sospeso con Firebase usando transazioni.
 */
export const sincronizzaConFirebase = async () => {
  const rapportiniDaSincronizzare = await db.rapportiniInSospeso.toArray();

  if (rapportiniDaSincronizzare.length === 0) {
    return;
  }

  console.log(`Trovati ${rapportiniDaSincronizzare.length} rapportini da sincronizzare.`);

  for (const rapportino of rapportiniDaSincronizzare) {
    const { localId, id, ...rapportinoDaInviare } = rapportino;
    try {
      if (id) {
        // MODIFICA: Usa una transazione per l'aggiornamento sicuro
        await runTransaction(firestoreDb, async (transaction) => {
            const reportRef = doc(firestoreDb, 'rapportini', id);
            const sfDoc = await transaction.get(reportRef);
            if (!sfDoc.exists()) {
                throw `Documento con ID ${id} non trovato sul server. Potrebbe essere stato cancellato.`;
            }
            transaction.update(reportRef, { ...rapportinoDaInviare, updatedAt: Timestamp.now() });
        });
        console.log(`Rapportino con ID ${id} aggiornato con successo tramite transazione.`);

      } else {
        // L'aggiunta di un nuovo documento è già atomica, non serve una transazione.
        await addDoc(collection(firestoreDb, 'rapportini'), { ...rapportinoDaInviare, createdAt: Timestamp.now() });
        console.log('Nuovo rapportino creato con successo.');
      }

      // Se la transazione o l'aggiunta hanno successo, rimuovi dalla coda.
      await db.rapportiniInSospeso.delete(localId!);

    } catch (error) {
      // Se la transazione fallisce (conflitto o altro errore), non rimuoviamo il dato locale.
      console.error(`Errore durante la sincronizzazione del rapportino ${id || 'nuovo'}. La modifica è conservata localmente. Errore:`, error);
    }
  }
};

/**
 * Tenta di eseguire le condivisioni in sospeso.
 */
export const sincronizzaCondivisioni = async () => {
  const condivisioniDaSincronizzare = await db.condivisioniInSospeso.toArray();
  if (condivisioniDaSincronizzare.length === 0) { return; }
  console.log(`Trovate ${condivisioniDaSincronizzare.length} condivisioni da eseguire.`);

  for (const condivisione of condivisioniDaSincronizzare) {
    try {
      await shareOrDownload(condivisione.blob, condivisione.fileName);
      await db.condivisioniInSospeso.delete(condivisione.id!);
      console.log(`Condivisione con id ${condivisione.id} eseguita e rimossa dalla coda.`);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
          console.log(`L'utente ha annullato la condivisione (id: ${condivisione.id}). Rimuovo dalla coda.`);
          await db.condivisioniInSospeso.delete(condivisione.id!);
      } else {
          console.error(`Errore durante l'esecuzione della condivisione con id ${condivisione.id}:`, error);
      }
    }
  }
};
