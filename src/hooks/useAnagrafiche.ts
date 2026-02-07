import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc } from "firebase/firestore";
import { db } from '@/firebase';
import type { Anagrafica } from '@/models/definitions';

export const useAnagrafiche = () => {
    const [anagrafiche, setAnagrafiche] = useState<Anagrafica[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchAnagrafiche = useCallback(async () => {
        try {
            setLoading(true);
            const anagraficheCollectionRef = collection(db, "anagrafiche");
            const data = await getDocs(anagraficheCollectionRef);
            const anagraficheData = data.docs.map((doc) => ({
                ...doc.data(),
                id: doc.id,
            })) as Anagrafica[];
            setAnagrafiche(anagraficheData);
        } catch (err) {
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    }, []);

    const addAnagrafica = useCallback(async (anagrafica: Omit<Anagrafica, 'id'>) => {
        try {
            const anagraficheCollectionRef = collection(db, "anagrafiche");
            await addDoc(anagraficheCollectionRef, anagrafica);
            fetchAnagrafiche(); // Ricarica i dati per visualizzare il nuovo elemento
        } catch (err) {
            setError(err as Error);
        }
    }, [fetchAnagrafiche]);

    const updateAnagrafica = useCallback(async (id: string, anagrafica: Partial<Anagrafica>) => {
        try {
            const anagraficaDoc = doc(db, "anagrafiche", id);
            await updateDoc(anagraficaDoc, anagrafica);
            fetchAnagrafiche(); // Ricarica i dati per visualizzare le modifiche
        } catch (err) {
            setError(err as Error);
        }
    }, [fetchAnagrafiche]);

    useEffect(() => {
        fetchAnagrafiche();
    }, [fetchAnagrafiche]);

    return { anagrafiche, loading, error, addAnagrafica, updateAnagrafica };
};
