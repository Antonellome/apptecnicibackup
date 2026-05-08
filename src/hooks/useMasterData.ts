import { useContext } from 'react';
import { MasterDataContext } from '@/contexts/MasterDataProvider';
import { MasterDataContextType } from '@/contexts/MasterDataProvider'; // Assumendo che il tipo sia esportato

export const useMasterData = (): MasterDataContextType => {
    const context = useContext(MasterDataContext);
    if (context === undefined) {
        throw new Error('useMasterData must be used within a MasterDataProvider');
    }
    return context;
};
