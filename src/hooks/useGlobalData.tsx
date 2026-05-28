import { useEffect, useReducer } from 'react';
import { collection, onSnapshot, DocumentData, FirestoreDataConverter } from 'firebase/firestore';
import { db } from '@/firebase';
import { Rapportino, Tecnico, Ditta, Categoria, Nave, Luogo, Veicolo, TipoGiornata } from '@/models/definitions';
import { rapportinoConverter, tecnicoConverter, dittaConverter, categoriaConverter, veicoloConverter } from '@/utils/converters';
import { useAuth } from '@/hooks/useAuth';

// --- HELPERS ---
function sortByName<T extends { nome?: string }>(data: T[]): T[] {
  return [...data].sort((a, b) => {
    const nameA = a.nome || '';
    const nameB = b.nome || '';
    return nameA.localeCompare(nameB, 'it', { sensitivity: 'base' });
  });
}

// --- STATE, ACTIONS, REDUCER ---
interface GlobalDataState { /* ... same as before ... */
  rapportini: Rapportino[];
  tecnici: Tecnico[];
  ditte: Ditta[];
  categorie: Categoria[];
  navi: Nave[];
  luoghi: Luogo[];
  veicoli: Veicolo[];
  tipiGiornata: TipoGiornata[];
  loading: boolean;
  error: Error | null;
  _loadedCollections: Set<string>;
}
type CollectionName = keyof Omit<GlobalDataState, 'loading' | 'error' | '_loadedCollections'>;
type Action = | { type: 'RESET_STATE' } | { type: 'FETCH_INIT' } | { type: 'SET_DATA'; payload: { name: CollectionName; data: any[] } } | { type: 'SET_ERROR'; payload: Error };
const TOTAL_COLLECTIONS = 8;
const initialState: GlobalDataState = { /* ... same as before ... */
  rapportini: [],
  tecnici: [],
  ditte: [],
  categorie: [],
  navi: [],
  luoghi: [],
  veicoli: [],
  tipiGiornata: [],
  loading: true,
  error: null,
  _loadedCollections: new Set(),
};
function globalDataReducer(state: GlobalDataState, action: Action): GlobalDataState { /* ... same as before ... */ 
    switch (action.type) {
    case 'RESET_STATE':
      return { ...initialState, loading: false }; // Not loading if no user
    case 'FETCH_INIT':
      return { ...initialState, loading: true }; // Reset and start loading
    case 'SET_DATA': {
      const newLoaded = new Set(state._loadedCollections).add(action.payload.name);
      const allLoaded = newLoaded.size >= TOTAL_COLLECTIONS;
      return {
        ...state,
        [action.payload.name]: action.payload.data,
        _loadedCollections: newLoaded,
        loading: !allLoaded,
      };
    }
    case 'SET_ERROR':
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
}

// --- SUBSCRIBER FUNCTIONS (CLASSIC FUNCTION SYNTAX) ---
function subscribeToCollectionWithConverter<T>(
  dispatch: React.Dispatch<Action>,
  collectionName: CollectionName,
  sortData: boolean,
  converter: FirestoreDataConverter<T, DocumentData>
) {
  const collRef = collection(db, collectionName).withConverter(converter);
  return onSnapshot(collRef, snapshot => {
    let data = snapshot.docs.map(doc => (({
      ...doc.data(),
      id: doc.id
    }) as T));
    if (sortData) data = sortByName(data as any);
    dispatch({ type: 'SET_DATA', payload: { name: collectionName, data } });
  }, error => {
    console.error(`Errore in ${collectionName}:`, error);
    dispatch({ type: 'SET_ERROR', payload: error });
  });
}

function subscribeToCollection<T>(
  dispatch: React.Dispatch<Action>,
  collectionName: CollectionName,
  sortData: boolean
) {
  const collRef = collection(db, collectionName);
  return onSnapshot(collRef, snapshot => {
    let data = snapshot.docs.map(doc => (({
      ...doc.data(),
      id: doc.id
    }) as T));
    if (sortData) data = sortByName(data as any);
    dispatch({ type: 'SET_DATA', payload: { name: collectionName, data } });
  }, error => {
    console.error(`Errore in ${collectionName}:`, error);
    dispatch({ type: 'SET_ERROR', payload: error });
  });
}

// --- HOOK ---
export const useGlobalData = () => {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(globalDataReducer, initialState);

  useEffect(() => {
    if (!user) {
      dispatch({ type: 'RESET_STATE' });
      return;
    }
    dispatch({ type: 'FETCH_INIT' });
    try {
      const unsubscribers = [
        subscribeToCollectionWithConverter<Rapportino>(dispatch, 'rapportini', false, rapportinoConverter),
        subscribeToCollectionWithConverter<Tecnico>(dispatch, 'tecnici', false, tecnicoConverter),
        subscribeToCollectionWithConverter<Ditta>(dispatch, 'ditte', true, dittaConverter),
        subscribeToCollectionWithConverter<Categoria>(dispatch, 'categorie', true, categoriaConverter),
        subscribeToCollection<Nave>(dispatch, 'navi', true),
        subscribeToCollection<Luogo>(dispatch, 'luoghi', true),
        subscribeToCollectionWithConverter<Veicolo>(dispatch, 'veicoli', true, veicoloConverter),
        subscribeToCollection<TipoGiornata>(dispatch, 'tipiGiornata', true),
      ];
      return () => unsubscribers.forEach(unsub => unsub());
    } catch (e: any) {
      dispatch({ type: 'SET_ERROR', payload: e });
    }
  }, [user]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _loadedCollections, ...publicState } = state;
  return publicState;
};