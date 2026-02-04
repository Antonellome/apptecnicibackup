
import { useState, useEffect } from 'react';
import { collection, onSnapshot, QuerySnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export const useCollection = <T extends { id: string }>(collectionName: string): { data: T[] | null; loading: boolean; } => {
    const [data, setData] = useState<T[] | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const collectionRef = collection(db, collectionName);

        // Usa onSnapshot per l'aggiornamento in tempo reale
        const unsubscribe = onSnapshot(collectionRef, (snapshot: QuerySnapshot) => {
            const items = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as T));
            setData(items);
            setLoading(false);
        }, (error) => {
            console.error(`Errore nel caricamento della collezione ${collectionName}:`, error);
            setLoading(false);
        });

        // Funzione di pulizia per annullare l'iscrizione quando il componente viene smontato
        return () => unsubscribe();

    }, [collectionName]);

    return { data, loading };
};
