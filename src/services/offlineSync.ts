import { db, RapportinoInSospeso } from '@/db/db';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db as firestoreDb } from '@/firebase';

/**
 * Aggiunge un rapportino alla coda di sincronizzazione offline.
 * I dati vengono salvati localmente in IndexedDB.
 * @param rapportino L'oggetto rapportino da salvare. È importante che non abbia un ID,
 *                   perché l'ID finale verrà assegnato da Firebase al momento della sincronizzazione.
 */
export const aggiungiAllaCoda = async (rapportino: Omit<RapportinoInSospeso, 'localId'>) => {
  try {
    // Convertiamo le date in Timestamp di Firebase PRIMA di salvare in locale.
    // In questo modo, il dato è già pronto per essere inviato a Firebase.
    const rapportinoConTimestamp = {
      ...rapportino,
      data: Timestamp.fromDate(rapportino.data as Date),
      oraInizio: rapportino.oraInizio ? Timestamp.fromDate(rapportino.oraInizio as Date) : null,
      oraFine: rapportino.oraFine ? Timestamp.fromDate(rapportino.oraFine as Date) : null,
    };

    await db.rapportiniInSospeso.add(rapportinoConTimestamp as unknown as RapportinoInSospeso);
    console.log('Rapportino aggiunto alla coda offline.');
  } catch (error) {
    console.error("Errore nell'aggiungere il rapportino alla coda offline:", error);
  }
};

/**
 * Tenta di sincronizzare i rapportini in sospeso con Firebase.
 * Legge tutti i rapportini dalla coda locale, prova a inviarli a Firebase
 * e, in caso di successo, li rimuove dalla coda locale.
 */
export const sincronizzaConFirebase = async () => {
  const rapportiniDaSincronizzare = await db.rapportiniInSospeso.toArray();

  if (rapportiniDaSincronizzare.length === 0) {
    console.log('Nessun rapportino da sincronizzare.');
    return;
  }

  console.log(`Trovati ${rapportiniDaSincronizzare.length} rapportini da sincronizzare.`);

  for (const rapportino of rapportiniDaSincronizzare) {
    try {
      // Rimuoviamo l'ID locale che è usato solo da Dexie
      const { localId, ...rapportinoDaInviare } = rapportino;

      // Aggiungiamo il documento a Firebase
      await addDoc(collection(firestoreDb, 'rapportini'), rapportinoDaInviare);

      // Se l'invio a Firebase ha successo, rimuoviamo il rapportino dalla coda locale usando il suo ID locale
      await db.rapportiniInSospeso.delete(rapportino.localId!);

      console.log(`Rapportino con localId ${rapportino.localId} sincronizzato e rimosso dalla coda.`);

    } catch (error) {
      console.error(`Errore durante la sincronizzazione del rapportino con localId ${rapportino.localId}:`, error);
      // Se l'invio fallisce (es. regole di sicurezza, dato malformato), 
      // il rapportino rimane nella coda e verrà ritentato al prossimo avvio della sincronizzazione.
    }
  }
};
