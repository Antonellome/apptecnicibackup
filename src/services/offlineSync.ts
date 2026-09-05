import { db as firestore } from '@/utils/firebase';
import { collection, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/db/local-db';
import { Rapportino } from '@/models/definitions';

const ANAGRAFICHE_COLLECTIONS = [
  'navi',
  'luoghi',
  'categorie',
  'tipiGiornata',
  'veicoli',
  'tecnici'
];

// Funzione per sincronizzare una singola collezione anagrafica
const syncAnagrafica = async (collectionName: string) => {
  try {
    const collectionRef = collection(firestore, collectionName);
    const snapshot = await getDocs(collectionRef);
    const items = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));

    // Utilizzo di una transazione per l'aggiornamento
    await db.transaction('rw', (db as any)[collectionName], async () => {
      await (db as any)[collectionName].clear();
      await (db as any)[collectionName].bulkAdd(items);
    });

    console.log(`Sincronizzazione completata per ${collectionName}. ${items.length} record scaricati.`);
  } catch (error) {
    console.error(`Errore durante la sincronizzazione di ${collectionName}:`, error);
    throw new Error(`Impossibile sincronizzare la collezione ${collectionName}.`);
  }
};

// Funzione principale per sincronizzare tutte le anagrafiche
export const syncAllAnagrafiche = async () => {
  console.log("Avvio della sincronizzazione completa delle anagrafiche...");
  try {
    // Eseguo tutte le sincronizzazioni in parallelo
    await Promise.all(ANAGRAFICHE_COLLECTIONS.map(collectionName => syncAnagrafica(collectionName)));
    console.log("Tutte le anagrafiche sono state sincronizzate con successo.");
  } catch (error) {
    console.error("Errore critico durante la sincronizzazione delle anagrafiche:", error);
    // In caso di errore, è importante che l'app possa continuare a funzionare in modalità offline
    // o notificare l'utente in modo appropriato.
    throw new Error("La sincronizzazione di base non è riuscita. L'app potrebbe non funzionare correttamente.");
  }
};

// Funzione per l'ascolto in tempo reale dei rapportini
export const listenForRapportiniUpdates = (tecnicoId: string, onUpdate: (rapportini: Rapportino[]) => void) => {
  const rapportiniRef = collection(firestore, 'rapportini');
  const q = query(
    rapportiniRef,
    where('tecniciId', 'array-contains', tecnicoId),
    where('isDeleted', '==', false) 
  );

  return onSnapshot(q, async (snapshot) => {
    if (snapshot.empty) {
      console.log("Nessun rapportino trovato per il tecnico.");
      return;
    }

    const rapportini: Rapportino[] = [];
    snapshot.forEach(doc => {
      rapportini.push({ id: doc.id, ...doc.data() } as Rapportino);
    });
    
    try {
      await db.rapportini.bulkPut(rapportini);
      console.log(`${rapportini.length} rapportini aggiornati nel database locale.`);
      onUpdate(rapportini);
    } catch (error) {
      console.error("Errore durante l'aggiornamento dei rapportini in Dexie:", error);
    }
  }, (error) => {
    console.error("Errore nell'ascolto dei rapportini:", error);
  });
};
