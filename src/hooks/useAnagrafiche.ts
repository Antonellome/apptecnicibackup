import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, DocumentData } from "firebase/firestore";
import { db } from '@/firebase';
import type { Anagrafica } from '@/models/definitions';

export const useAnagrafiche = () => {
    const [anagrafiche, setAnagrafiche] = useState<Anagrafica[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchAnagrafiche = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const anagraficheCollectionRef = collection(db, "anagrafiche");
            const data = await getDocs(anagraficheCollectionRef);
            const anagraficheData = data.docs.map((doc) => ({
                ...doc.data(),
                id: doc.id,
            })) as Anagrafica[];
            setAnagrafiche(anagraficheData);
        } catch (err) {
            console.error("Errore durante il caricamento delle anagrafiche:", err);
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    }, []); // Dipendenza vuota, la funzione viene creata una sola volta.

    const addAnagrafica = useCallback(async (anagrafica: Omit<Anagrafica, 'id'>) => {
        try {
            const anagraficheCollectionRef = collection(db, "anagrafiche");
            const docRef = await addDoc(anagraficheCollectionRef, anagrafica);
            // Aggiorna lo stato localmente per una UI reattiva, senza ricaricare tutto.
            setAnagrafiche(prev => [...prev, { ...anagrafica, id: docRef.id } as Anagrafica]);
        } catch (err) {
            console.error("Errore durante l'aggiunta dell'anagrafica:", err);
            setError(err as Error);
        }
    }, []);

    const updateAnagrafica = useCallback(async (id: string, dataToUpdate: Partial<DocumentData>) => {
        try {
            const anagraficaDoc = doc(db, "anagrafiche", id);
            await updateDoc(anagraficaDoc, dataToUpdate);
            // Aggiorna lo stato localmente per una UI reattiva.
            setAnagrafiche(prev => prev.map(a => a.id === id ? { ...a, ...dataToUpdate } : a));
        } catch (err) {
            console.error("Errore durante l'aggiornamento dell'anagrafica:", err);
            setError(err as Error);
        }
    }, []);

    // Questo useEffect viene eseguito UNA SOLA VOLTA quando l'hook viene utilizzato per la prima volta.
    useEffect(() => {
        fetchAnagrafiche();
    }, [fetchAnagrafiche]); // `fetchAnagrafiche` è stabile grazie a useCallback.

    return { anagrafiche, loading, error, addAnagrafica, updateAnagrafica };
};
