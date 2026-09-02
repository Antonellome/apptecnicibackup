
import { createContext, useContext } from 'react';
import { Rapportino } from '@/models/definitions';

export interface RapportiniContextType {
    rapportini: Rapportino[];
    addRapportino: (rapportino: Rapportino) => Promise<void>;
    updateRapportino: (rapportino: Rapportino) => Promise<void>;
    getRapportinoById: (id: string) => Rapportino | undefined;
    loading: boolean;
}

export const RapportiniContext = createContext<RapportiniContextType | undefined>(undefined);

export const useRapportini = () => {
    const context = useContext(RapportiniContext);
    if (!context) {
        throw new Error('useRapportini must be used within a RapportiniProvider');
    }
    return context;
};
