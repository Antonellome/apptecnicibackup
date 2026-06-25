/**
 * @file useRapportini.ts
 * @description Hook specializzato per recuperare in tempo reale i rapportini dal database locale (Dexie).
 */

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/local-db';
import { useAuth } from '@/hooks/useAuth';
import { useMemo } from 'react';

export const useRapportini = () => {
  const { user, userProfile } = useAuth();

  const rapportini = useLiveQuery(() => {
    if (!user || !userProfile) return [];

    console.log(`useRapportini (LiveQuery): Avvio query locale per tecnico ${userProfile.tecnicoId}`);

    // Esegue la query su Dexie per trovare i rapportini in cui l'utente
    // è il creatore (tecnicoId) o è incluso nelle presenze.
    return db.rapportini
      .where('tecnicoId').equals(userProfile.tecnicoId)
      .or('presenze').equals(userProfile.tecnicoId) // Nota: 'equals' su un array multientry si comporta come 'includes'.
      .sortBy('data'); // Ordina per data, ma potrebbe essere necessario un reverse in UI

  }, [user, userProfile]);

  // Dexie non ordina di default in modo decrescente, quindi lo facciamo in memoria.
  const sortedRapportini = useMemo(() => {
    if (!rapportini) return undefined; // Mantiene lo stato di caricamento
    return rapportini.reverse(); // .reverse() modifica l'array originale, ma sortBy ne crea uno nuovo
  }, [rapportini]);

  return {
    rapportini: sortedRapportini,
    loading: sortedRapportini === undefined,
    error: null, // useLiveQuery non espone direttamente un errore in questo modo, ma lo logga.
  };
};
