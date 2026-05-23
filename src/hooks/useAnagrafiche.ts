import { useEffect, useCallback, useReducer } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, DocumentData } from "firebase/firestore";
import { db } from '@/firebase';
import type { Anagrafica } from '@/models/definitions';

// --- useReducer Implementation ---

interface State {
    anagrafiche: Anagrafica[];
    loading: boolean;
    error: Error | null;
}

type Action = 
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS', payload: Anagrafica[] }
  | { type: 'FETCH_ERROR', payload: Error }
  | { type: 'ADD_SUCCESS', payload: Anagrafica }
  | { type: 'UPDATE_SUCCESS', payload: { id: string, data: Partial<Anagrafica> } };

const initialState: State = {
    anagrafiche: [],
    loading: true,
    error: null,
};

function anagraficheReducer(state: State, action: Action): State {
    switch (action.type) {
        case 'FETCH_START':
            return { ...state, loading: true, error: null };
        case 'FETCH_SUCCESS':
            return { ...state, loading: false, anagrafiche: action.payload };
        case 'FETCH_ERROR':
            return { ...state, loading: false, error: action.payload };
        case 'ADD_SUCCESS':
            return { ...state, anagrafiche: [...state.anagrafiche, action.payload] };
        case 'UPDATE_SUCCESS':
            return {
                ...state,
                anagrafiche: state.anagrafiche.map(a => 
                    a.id === action.payload.id ? { ...a, ...action.payload.data } : a
                ),
            };
        default:
            return state;
    }
}

export const useAnagrafiche = () => {
    const [state, dispatch] = useReducer(anagraficheReducer, initialState);

    const fetchAnagrafiche = useCallback(async () => {
        dispatch({ type: 'FETCH_START' });
        try {
            const anagraficheCollectionRef = collection(db, "anagrafiche");
            const data = await getDocs(anagraficheCollectionRef);
            const anagraficheData = data.docs.map((doc) => ({
                ...doc.data(),
                id: doc.id,
            })) as Anagrafica[];
            dispatch({ type: 'FETCH_SUCCESS', payload: anagraficheData });
        } catch (err) {
            console.error("Errore durante il caricamento delle anagrafiche:", err);
            dispatch({ type: 'FETCH_ERROR', payload: err as Error });
        }
    }, []);

    const addAnagrafica = useCallback(async (anagrafica: Omit<Anagrafica, 'id'>) => {
        try {
            const anagraficheCollectionRef = collection(db, "anagrafiche");
            const docRef = await addDoc(anagraficheCollectionRef, anagrafica);
            const newAnagrafica = { ...anagrafica, id: docRef.id } as Anagrafica;
            dispatch({ type: 'ADD_SUCCESS', payload: newAnagrafica });
        } catch (err) {
            console.error("Errore durante l'aggiunta dell'anagrafica:", err);
            dispatch({ type: 'FETCH_ERROR', payload: err as Error }); // Riutilizziamo l'azione di errore
        }
    }, []);

    const updateAnagrafica = useCallback(async (id: string, dataToUpdate: Partial<DocumentData>) => {
        try {
            const anagraficaDoc = doc(db, "anagrafiche", id);
            await updateDoc(anagraficaDoc, dataToUpdate);
            dispatch({ type: 'UPDATE_SUCCESS', payload: { id, data: dataToUpdate } });
        } catch (err) {
            console.error("Errore durante l'aggiornamento dell'anagrafica:", err);
            dispatch({ type: 'FETCH_ERROR', payload: err as Error }); // Riutilizziamo l'azione di errore
        }
    }, []);

    useEffect(() => {
        fetchAnagrafiche();
    }, [fetchAnagrafiche]);

    return { ...state, addAnagrafica, updateAnagrafica };
};
