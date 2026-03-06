import { db, RapportinoInSospeso } from '@/db/db';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db as firestoreDb } from '@/firebase';

// Esporto il tipo per renderlo disponibile ad altri moduli che lo importano.
export type { RapportinoInSospeso };

/**
 * Aggiunge un rapportino alla coda di sincronizzazione offline.
 * I dati vengono salvati localmente in IndexedDB.
 */
export const aggiungiAllaCoda = async (rapportino: Omit<RapportinoInSospeso, 'localId'>) => {
  try {
    // L'errore di compilazione indicava una conversione illecita. 
    // Il tipo 'RapportinoInSospeso' si aspetta delle stringhe per le date, ma riceve oggetti Date.
    // Per risolvere, facciamo un cast a 'unknown' e poi a 'Date' per soddisfare la funzione fromDate.
    const rapportinoConTimestamp = {
      ...rapportino,
      data: Timestamp.fromDate(rapportino.data as unknown as Date),
      oraInizio: rapportino.oraInizio ? Timestamp.fromDate(rapportino.oraInizio as unknown as Date) : null,
      oraFine: rapportino.oraFine ? Timestamp.fromDate(rapportino.oraFine as unknown as Date) : null,
    };

    await db.rapportiniInSospeso.add(rapportinoConTimestamp as unknown as RapportinoInSospeso);
    console.log('Rapportino aggiunto alla coda offline.');
  } catch (error) {
    console.error("Errore nell'aggiungere il rapportino alla coda offline:", error);
  }
};

/**
 * Tenta di sincronizzare i rapportini in sospeso con Firebase.
 */
export const sincronizzaConFirebase = async () => {
  const rapportiniDaSincronizzare = await db.rapportiniInSospeso.toArray();

  if (rapportiniDaSincronizzare.length === 0) {
    return;
  }

  console.log(`Trovati ${rapportiniDaSincronizzare.length} rapportini da sincronizzare.`);

  for (const rapportino of rapportiniDaSincronizzare) {
    try {
      const { localId, ...rapportinoDaInviare } = rapportino;
      await addDoc(collection(firestoreDb, 'rapportini'), rapportinoDaInviare);
      await db.rapportiniInSospeso.delete(rapportino.localId!);
      console.log(`Rapportino con localId ${rapportino.localId} sincronizzato.`);
    } catch (error) {
      console.error(`Errore durante la sincronizzazione del rapportino con localId ${rapportino.localId}:`, error);
    }
  }
};
