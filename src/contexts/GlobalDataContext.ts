
import { createContext, useContext } from 'react';
import type { MasterData } from '@/models/definitions';

// --- CONTEXT INTERFACE ---
// Questa interfaccia è stata aggiornata per rispecchiare l'utilizzo nell'applicazione,
// centralizzando i dati anagrafici sotto `masterData` e includendo stati per caricamento ed errori.
export interface IGlobalDataContext {
  masterData?: MasterData;
  loading: boolean;
  error: Error | null;
  // Funzione placeholder per risolvere gli errori di compilazione.
  updateImpostazioni: (impostazioni: any) => Promise<void>; 
}

export const GlobalDataContext = createContext<IGlobalDataContext | undefined>(undefined);

export const useGlobalData = () => {
  const context = useContext(GlobalDataContext);
  if (!context) {
    throw new Error('useGlobalData must be used within a GlobalDataProvider');
  }
  return context;
};
