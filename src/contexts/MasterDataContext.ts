import { createContext } from 'react';
import type { MasterData } from '@/models/definitions';

export interface MasterDataContextType {
    masterData: MasterData | null;
    loading: boolean;
    error: string | null;
    refetchData: () => Promise<void>;
}

export const MasterDataContext = createContext<MasterDataContextType | undefined>(undefined);
