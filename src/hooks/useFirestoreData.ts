import { useState, useEffect } from 'react';
import { onSnapshot } from 'firebase/firestore';
import type { Query, DocumentData, FirebaseError } from 'firebase/firestore';

/**
 * Stato restituito dall'hook useFirestoreData.
 * @template T Il tipo di dati dei documenti.
 */
interface FirestoreDataState<T> {
  data: T[] | null;
  loading: boolean;
  error: FirebaseError | null;
}

/**
 * Hook custom per recuperare dati da una collection Firestore in modo controllato e sicuro.
 * Gestisce in modo esplicito gli stati di caricamento e gli errori.
 *
 * @template T Il tipo di dati atteso per i documenti.
 * @param {Query | null} query L'oggetto query di Firestore. Se null, l'hook non esegue il fetch.
 * @returns {FirestoreDataState<T>} Un oggetto contenente i dati, lo stato di caricamento e l'eventuale errore.
 */
export const useFirestoreData = <T extends { id: string }>(query: Query | null): FirestoreDataState<T> => {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<FirebaseError | null>(null);

  useEffect(() => {
    // Se la query non è valida, resettiamo lo stato e interrompiamo.
    if (!query) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    // All'avvio di un nuovo fetch, impostiamo lo stato di caricamento.
    setLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(query, (querySnapshot) => {
      const docs = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
      } as T));
      setData(docs);
      setLoading(false);
    }, (err) => {
      const firebaseError = err as FirebaseError;
      console.error(`[useFirestoreData] Errore durante il fetch dei dati:`, firebaseError);
      setError(firebaseError);
      setLoading(false);
    });

    // Pulizia dell'iscrizione quando il componente viene smontato o la query cambia.
    return () => unsubscribe();

  }, [query]); // L'hook si ri-esegue solo se l'oggetto query cambia.

  return { data, loading, error };
};
