import { useEffect, useReducer, useMemo } from 'react';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import { createRapportinoSchema, RapportinoSchema } from '@/models/rapportino.schema';

// --- State and Reducer Definition ---

interface QueryState {
    data: RapportinoSchema[];
    loading: boolean;
    error: Error | null;
}

type Action =
    | { type: 'FETCH_INIT' }
    | { type: 'FETCH_SUCCESS', payload: RapportinoSchema[] }
    | { type: 'FETCH_ERROR', payload: Error };

function queryReducer(state: QueryState, action: Action): QueryState {
    switch (action.type) {
        case 'FETCH_INIT':
            return { data: [], loading: true, error: null };
        case 'FETCH_SUCCESS':
            return { data: action.payload, loading: false, error: null };
        case 'FETCH_ERROR':
            return { data: [], loading: false, error: action.payload };
        default:
            // Questo caso non dovrebbe mai essere raggiunto con TypeScript
            return state;
    }
}

function useFirestoreQuery() {
    const initialState: QueryState = {
        data: [],
        loading: true,
        error: null,
    };
    
    const [state, dispatch] = useReducer(queryReducer, initialState);

    const rapportinoCollectionRef = useMemo(() => collection(db, 'rapportini'), []);

    useEffect(() => {
        const fetchData = async () => {
            dispatch({ type: 'FETCH_INIT' });
            try {
                const q = query(rapportinoCollectionRef);
                const querySnapshot = await getDocs(q);
                const rapportini: RapportinoSchema[] = [];
                const rapportinoValidationSchema = createRapportinoSchema();

                querySnapshot.forEach((doc) => {
                    const docData = doc.data();
                    const rapportinoDataWithDate = {
                        ...docData,
                        id: doc.id,
                        data: docData.data.toDate(), // Converte il Timestamp in Date
                    };

                    const validationResult = rapportinoValidationSchema.safeParse(rapportinoDataWithDate);

                    if (validationResult.success) {
                        rapportini.push(validationResult.data as RapportinoSchema);
                    } else {
                        console.warn('Dati non validi per il documento:', doc.id, validationResult.error.issues);
                    }
                });
                dispatch({ type: 'FETCH_SUCCESS', payload: rapportini });
            } catch (err) {
                dispatch({ type: 'FETCH_ERROR', payload: err as Error });
            } 
        };

        fetchData();
    }, [rapportinoCollectionRef]);

    return state;
}

export default useFirestoreQuery;
