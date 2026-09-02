import { useEffect, useCallback, useReducer, useContext } from 'react';
import { apiSyncAllAnagrafiche } from '@/api/service';
import { AuthContext } from '@/contexts/AuthContextDefinition'; // Importa il Contesto e non un hook custom

// --- Tipi ---

interface AllAnagrafiche {
  clienti: any[];
  navi: any[];
  luoghi: any[];
  veicoli: any[];
  tipiGiornata: any[];
  qualifiche: any[];
  ditte: any[];
  tecnici: any[];
}

// --- Stato e Reducer (semplificato) ---

interface State {
  data: AllAnagrafiche | null;
  loading: boolean;
  error: Error | null;
}

type Action = 
  | { type: 'SYNC_START' }
  | { type: 'SYNC_SUCCESS', payload: AllAnagrafiche }
  | { type: 'SYNC_ERROR', payload: Error };

const initialState: State = {
  data: null,
  loading: true,
  error: null,
};

function anagraficheReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SYNC_START':
      return { ...state, loading: true, error: null };
    case 'SYNC_SUCCESS':
      return { ...state, loading: false, data: action.payload };
    case 'SYNC_ERROR':
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
}

/**
 * Hook per sincronizzare e leggere tutte le anagrafiche (dati master) 
 * dell'applicazione tramite l'endpoint del backend v2.
 */
export const useAnagrafiche = () => {
  const [state, dispatch] = useReducer(anagraficheReducer, initialState);
  // Usa l'hook standard di React `useContext` con il contesto importato
  const authContext = useContext(AuthContext);

  const syncData = useCallback(async () => {
    // Recupera il tecnicoId dal profilo utente, non dall'utente Firebase
    const tecnicoId = authContext?.userProfile?.tecnicoId;

    if (!tecnicoId) {
        dispatch({ type: 'SYNC_ERROR', payload: new Error('ID tecnico non trovato nel profilo utente.') });
        return;
    }

    dispatch({ type: 'SYNC_START' });
    try {
      const anagraficheData = await apiSyncAllAnagrafiche({}, tecnicoId);
      dispatch({ type: 'SYNC_SUCCESS', payload: anagraficheData });
    } catch (err) {
      dispatch({ type: 'SYNC_ERROR', payload: err as Error });
    }
  }, [authContext?.userProfile?.tecnicoId]); // La dipendenza ora è il tecnicoId dal profilo

  useEffect(() => {
    // Esegui la sincronizzazione solo se il profilo utente è stato caricato
    if (authContext?.userProfile?.tecnicoId) {
      syncData();
    } else if (!authContext?.loading) {
      // Se il caricamento è finito ma non abbiamo un profilo, segnala un errore
      dispatch({ type: 'SYNC_ERROR', payload: new Error('Profilo utente non disponibile.') });
    }
  }, [syncData, authContext?.userProfile?.tecnicoId, authContext?.loading]);

  return { ...state, refresh: syncData };
};
