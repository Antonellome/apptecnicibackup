import React, { useState, ReactNode, createContext, Dispatch, SetStateAction } from 'react';

// --- 1. DEFINIZIONE DEI TIPI ---

export type ScadenzeFilter = 'all' | 'personali' | 'veicoli' | 'documenti';

export interface IFilterContext {
    scadenzeFilter: ScadenzeFilter;
    setScadenzeFilter: Dispatch<SetStateAction<ScadenzeFilter>>;
    silencedScadenze: string[];
    toggleSilenceScadenza: (id: string) => void;
}

// --- 2. CREAZIONE DEL CONTESTO ---

export const FilterContext = createContext<IFilterContext | undefined>(undefined);

// --- 3. PROVIDER COMPONENT ---

interface FilterProviderProps {
    children: ReactNode;
}

export const FilterProvider = ({ children }: FilterProviderProps) => {
    const [scadenzeFilter, setScadenzeFilter] = useState<ScadenzeFilter>('all');
    const [silencedScadenze, setSilencedScadenze] = useState<string[]>([]);

    const toggleSilenceScadenza = (id: string) => {
        setSilencedScadenze(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const value: IFilterContext = {
        scadenzeFilter,
        setScadenzeFilter,
        silencedScadenze,
        toggleSilenceScadenza
    };

    return (
        <FilterContext.Provider value={value}>
            {children}
        </FilterContext.Provider>
    );
};
