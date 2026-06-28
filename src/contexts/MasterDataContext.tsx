
import { createContext } from 'react';
import type { MasterData, TariffaLocale } from '@/models/definitions';

export interface MasterDataContextType {
    masterData: MasterData | null;
    loading: boolean;
    error: any | null;
    refetchData: () => Promise<void>;
    updateTariffe: (nuoveTariffe: TariffaLocale[]) => Promise<void>;
}

export const MasterDataContext = createContext<MasterDataContextType | undefined>(undefined);
