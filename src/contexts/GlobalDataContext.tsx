import { createContext } from 'react';
import type { GlobalData } from '@/models/definitions';

// Crea il contesto React con valori di default
export const GlobalDataContext = createContext<GlobalData>({
    masterData: undefined,       // Dati anagrafici (clienti, navi, etc.)
    rapportini: [],         // Tutti i rapportini dell'utente
    checkins: [],           // Tutti i check-in dell'utente
    userProfile: undefined,      // Profilo dell'utente loggato
    loading: true,          // Stato di caricamento globale
    error: undefined,            // Eventuali errori critici
    // Forniamo un'implementazione di default che non fa nulla ma evita errori
    updateImpostazioni: async () => { console.error('updateImpostazioni non implementato'); },
});
