import { useState, useEffect } from 'react';
import { onSnapshot } from 'firebase/firestore';
import type { Query, FirebaseError } from 'firebase/firestore';

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
    // Se la query non è valida, resettiamo lo stato solo se necessario per evitare render a cascata.
    if (!query) {
      if (data !== null) setData(null);
      if (loading) setLoading(false);
      if (error !== null) setError(null);
      return;
    }

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
      setData(null); // In caso di errore, i dati non sono più validi.
      setLoading(false);
    });

    return () => unsubscribe();

  // Aggiungiamo le dipendenze mancanti per conformarci alle regole di React Hooks.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return { data, loading, error };
};
