/**
 * @file useRapportini.ts
 * @description Hook specializzato per recuperare l'elenco dei rapportini per il tecnico autenticato.
 */

import { useEffect, useReducer } from 'react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import { useAuth } from '@/hooks/useAuth';
import { Rapportino } from '@/models/definitions';

// --- State and Reducer Definition ---

interface RapportiniState {
  rapportini: Rapportino[];
  loading: boolean;
  error: Error | null;
}

type Action = 
  | { type: 'RESET' }
  | { type: 'INIT' }
  | { type: 'SUCCESS', payload: Rapportino[] }
  | { type: 'ERROR', payload: Error };

function rapportiniReducer(state: RapportiniState, action: Action): RapportiniState {
    switch (action.type) {
        case 'RESET':
            return { rapportini: [], loading: false, error: null };
        case 'INIT':
            return { ...state, loading: true, error: null };
        case 'SUCCESS':
            return { ...state, loading: false, rapportini: action.payload };
        case 'ERROR':
            return { ...state, loading: false, error: action.payload, rapportini: [] };
        default:
            return state;
    }
}

export const useRapportini = () => {
  const { user } = useAuth();
  const initialState: RapportiniState = {
    rapportini: [],
    loading: true,
    error: null,
  };

  const [state, dispatch] = useReducer(rapportiniReducer, initialState);

  useEffect(() => {
    const fetchRapportini = async () => {
      if (!user) {
        dispatch({ type: 'RESET' });
        return;
      }

      console.log(`useRapportini: Avvio fetch per i rapportini dell'utente ${user.uid}`);
      dispatch({ type: 'INIT' });

      try {
        const q = query(
          collection(db, 'rapportini'),
          where('partecipanti', 'array-contains', user.uid),
          orderBy('header.dataIntervento', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Rapportino[];
        
        dispatch({ type: 'SUCCESS', payload: data });
        console.log(`useRapportini: ${data.length} rapportini caricati con successo.`);

      } catch (err: any) {
        console.error('useRapportini: Errore durante il fetch dei rapportini:', err);
        dispatch({ type: 'ERROR', payload: err });
      } 
    };

    fetchRapportini();

  }, [user]);

  return state;
};
