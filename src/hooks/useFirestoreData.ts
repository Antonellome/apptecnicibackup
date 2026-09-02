import { useEffect, useReducer } from 'react';
import { onSnapshot } from 'firebase/firestore';
import type { Query, FirestoreError } from 'firebase/firestore';

// --- State and Reducer Definition ---

interface FirestoreDataState<T> {
  data: T[] | null;
  loading: boolean;
  error: FirestoreError | null;
}

type Action<T> = 
  | { type: 'RESET' }
  | { type: 'INIT' }
  | { type: 'SUCCESS', payload: T[] }
  | { type: 'ERROR', payload: FirestoreError };

function firestoreDataReducer<T>(state: FirestoreDataState<T>, action: Action<T>): FirestoreDataState<T> {
    switch (action.type) {
        case 'RESET':
            return { data: null, loading: false, error: null };
        case 'INIT':
            return { ...state, loading: true, error: null };
        case 'SUCCESS':
            return { ...state, loading: false, data: action.payload };
        case 'ERROR':
            return { ...state, loading: false, error: action.payload, data: null };
        default:
            // Questo dovrebbe essere irraggiungibile con TypeScript
            return state;
    }
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
    const initialState: FirestoreDataState<T> = {
        data: null,
        loading: true,
        error: null,
    };

    const [state, dispatch] = useReducer(firestoreDataReducer<T>, initialState);

    useEffect(() => {
        if (!query) {
            dispatch({ type: 'RESET' });
            return;
        }

        dispatch({ type: 'INIT' });

        const unsubscribe = onSnapshot(query, (querySnapshot) => {
            const docs = querySnapshot.docs.map(doc => ({
                ...doc.data(),
                id: doc.id,
            } as T));
            dispatch({ type: 'SUCCESS', payload: docs });
        }, (err) => {
            const firestoreError = err as FirestoreError;
            console.error(`[useFirestoreData] Errore durante il fetch dei dati:`, firestoreError);
            dispatch({ type: 'ERROR', payload: firestoreError });
        });

        return () => unsubscribe();
    }, [query]);

    return state;
};
