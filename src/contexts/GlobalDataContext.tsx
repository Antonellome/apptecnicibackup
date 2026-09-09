import { createContext } from 'react';
import type { Impostazioni, MasterData, Rapportino, Checkin, WebAppUser } from '@/models/definitions';

// Definisce la struttura completa dei dati globali dell'applicazione
export interface GlobalData {
    masterData: MasterData | null;
    rapportini: Rapportino[];
    checkins: Checkin[];
    userProfile: WebAppUser | null;
    loading: boolean;
    error: any | null;
    // Aggiungiamo la funzione per aggiornare le impostazioni (tariffe)
    updateImpostazioni: (newImpostazioni: Impostazioni) => Promise<void>;
}

// Crea il contesto React con valori di default
export const GlobalDataContext = createContext<GlobalData>({
    masterData: null,       // Dati anagrafici (clienti, navi, etc.)
    rapportini: [],         // Tutti i rapportini dell'utente
    checkins: [],           // Tutti i check-in dell'utente
    userProfile: null,      // Profilo dell'utente loggato
    loading: true,          // Stato di caricamento globale
    error: null,            // Eventuali errori critici
    // Forniamo un'implementazione di default che non fa nulla ma evita errori
    updateImpostazioni: async () => { console.error('updateImpostazioni non implementato'); },
});
