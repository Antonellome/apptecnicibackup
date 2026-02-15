
import { useState, useEffect } from 'react';
import { collection, onSnapshot, QuerySnapshot } from 'firebase/firestore';
import { db } from '../utils/firebase';

interface UseCollectionReturn<T> {
  data: T[] | null;
  loading: boolean;
  error: Error | null;
}

export const useCollection = <T extends { id: string }>(collectionName: string): UseCollectionReturn<T> => {
    const [data, setData] = useState<T[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const collectionRef = collection(db, collectionName);

        const unsubscribe = onSnapshot(collectionRef, 
            (snapshot: QuerySnapshot) => {
                try {
                    const items = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as T));
                    setData(items);
                    setError(null);
                } catch (e: any) {
                    console.error(`Errore nella mappatura della collezione ${collectionName}:`, e);
                    setError(e);
                } finally {
                    setLoading(false);
                }
            }, 
            (err: Error) => {
                console.error(`Errore nel caricamento della collezione ${collectionName}:`, err);
                setError(err);
                setLoading(false);
            }
        );

        return () => unsubscribe();

    }, [collectionName]);

    return { data, loading, error };
};
