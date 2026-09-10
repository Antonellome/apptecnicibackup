
import { createContext, useContext } from 'react';
import type { 
    MasterData
} from '@/models/definitions';

// --- CONTEXT INTERFACE ---
export interface IGlobalDataContext {
  masterData: MasterData | null;
  loading: boolean;
  error: any;
  updateImpostazioni: (impostazioni: any) => Promise<void>;
}

export const GlobalDataContext = createContext<IGlobalDataContext | undefined>(undefined);

export const useGlobalData = (): IGlobalDataContext => {
  const context = useContext(GlobalDataContext);
  if (!context) {
    throw new Error('useGlobalData must be used within a GlobalDataProvider');
  }
  return context;
};
