import { useState, useEffect } from 'react';
import { onSnapshot } from 'firebase/firestore';
import type { Query, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';

export const useCollectionData = <T extends DocumentData>(q: Query<DocumentData> | null) => {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!q) {
      // Aggiorna lo stato solo se necessario per evitare rendering a cascata.
      if (data.length > 0) setData([]);
      if (loading) setLoading(false);
      if (error) setError(null);
      return;
    }

    // Imposta lo stato di caricamento prima di iniziare l'iscrizione ai dati.
    setLoading(true);

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const result: T[] = [];
        snapshot.forEach((doc: QueryDocumentSnapshot) => {
          result.push({ id: doc.id, ...doc.data() } as T);
        });
        setData(result);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    // La funzione di pulizia annulla l'iscrizione quando il componente viene smontato o la query cambia.
    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]); // La dipendenza è solo sulla query.

  return { data, loading, error };
};
