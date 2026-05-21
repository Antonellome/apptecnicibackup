import { useContext } from 'react';
import { MasterDataContext, MasterDataContextType } from '@/contexts/MasterDataContext';

export const useMasterData = (): MasterDataContextType => {
    const context = useContext(MasterDataContext);
    if (context === undefined) {
        throw new Error('useMasterData must be used within a MasterDataProvider');
    }
    return context;
};
