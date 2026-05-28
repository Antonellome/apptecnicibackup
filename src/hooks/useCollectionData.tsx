import { useEffect, useReducer } from 'react';
import { onSnapshot } from 'firebase/firestore';
import type { Query, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';

// --- useReducer Implementation ---

interface State<T> {
    data: T[];
    loading: boolean;
    error: Error | null;
}

type Action<T> = 
  | { type: 'RESET' }
  | { type: 'INIT' }
  | { type: 'SUCCESS', payload: T[] }
  | { type: 'ERROR', payload: Error };

function collectionDataReducer<T>(state: State<T>, action: Action<T>): State<T> {
    switch (action.type) {
        case 'RESET':
            return { data: [], loading: false, error: null };
        case 'INIT':
            return { ...state, loading: true, error: null };
        case 'SUCCESS':
            return { ...state, loading: false, data: action.payload };
        case 'ERROR':
            return { ...state, loading: false, error: action.payload };
        default:
            throw new Error(`Unhandled action type`);
    }
}

export const useCollectionData = <T extends DocumentData>(q: Query<DocumentData> | null) => {
  const [state, dispatch] = useReducer(collectionDataReducer<T>, {
    data: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!q) {
      dispatch({ type: 'RESET' });
      return;
    }

    dispatch({ type: 'INIT' });

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const result: T[] = [];
        snapshot.forEach((doc: QueryDocumentSnapshot) => {
          result.push({ id: doc.id, ...doc.data() } as unknown as T);
        });
        dispatch({ type: 'SUCCESS', payload: result });
      },
      (err) => {
        dispatch({ type: 'ERROR', payload: err });
      }
    );

    return () => unsubscribe();
  }, [q]);

  return state;
};
