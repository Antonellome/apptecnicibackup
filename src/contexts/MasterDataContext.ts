import { createContext } from 'react';
import type { MasterData } from '@/models/definitions';

export interface MasterDataContextType {
    masterData: MasterData | null;
    loading: boolean;
    error: any;
    refetchData: () => Promise<any>; // Corretto per accettare qualsiasi tipo di ritorno dalla promise
}

export const MasterDataContext = createContext<MasterDataContextType | undefined>(undefined);
