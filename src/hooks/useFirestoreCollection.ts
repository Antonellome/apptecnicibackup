import { useEffect, useReducer } from 'react';
import { collection, onSnapshot, FirestoreError } from 'firebase/firestore';
import { db } from '../firebase';

interface Doc {
    id: string;
    [key: string]: any;
}

// --- State and Reducer Definition ---

interface FirestoreCollectionState {
    data: Doc[];
    loading: boolean;
    error: FirestoreError | null;
}

type Action =
    | { type: 'INIT' }
    | { type: 'SUCCESS', payload: Doc[] }
    | { type: 'ERROR', payload: FirestoreError };

function firestoreCollectionReducer(state: FirestoreCollectionState, action: Action): FirestoreCollectionState {
    switch (action.type) {
        case 'INIT':
            return { ...state, loading: true, error: null };
        case 'SUCCESS':
            return { ...state, loading: false, data: action.payload };
        case 'ERROR':
            return { ...state, loading: false, error: action.payload, data: [] };
        default:
            return state;
    }
}

/**
 * Hook personalizzato per leggere i documenti da una collezione Firestore in tempo reale.
 * @param collectionName Il nome della collezione da cui leggere i dati.
 * @returns Un oggetto con i dati, lo stato di caricamento e un eventuale errore.
 */
const useFirestoreCollection = (collectionName: string) => {
    const initialState: FirestoreCollectionState = {
        data: [],
        loading: true,
        error: null,
    };

    const [state, dispatch] = useReducer(firestoreCollectionReducer, initialState);

    useEffect(() => {
        dispatch({ type: 'INIT' });

        const collectionRef = collection(db, collectionName);

        const unsubscribe = onSnapshot(collectionRef,
            (snapshot) => {
                const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                dispatch({ type: 'SUCCESS', payload: docs });
            },
            (err) => {
                const firestoreError = err as FirestoreError;
                console.error(`Errore durante l'ascolto della collezione ${collectionName}:`, firestoreError);
                dispatch({ type: 'ERROR', payload: firestoreError });
            }
        );

        return () => unsubscribe();

    }, [collectionName]);

    return state;
};

export default useFirestoreCollection;
