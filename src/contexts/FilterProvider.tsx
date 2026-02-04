import React, { useState, ReactNode, createContext, useContext, Dispatch, SetStateAction } from 'react';

// =========================================================================
// INIZIO SEZIONE UNITA DA FilterContext.ts
// =========================================================================

// --- 1. DEFINIZIONE DEI TIPI ---

export type ScadenzeFilter = 'all' | 'personali' | 'veicoli' | 'documenti';

export interface IFilterContext {
    scadenzeFilter: ScadenzeFilter;
    setScadenzeFilter: Dispatch<SetStateAction<ScadenzeFilter>>;
    silencedScadenze: string[];
    toggleSilenceScadenza: (id: string) => void;
}

// --- 2. CREAZIONE DEL CONTESTO ---

// Il contesto viene creato con 'undefined' e sarà il Provider a fornirgli un valore.
export const FilterContext = createContext<IFilterContext | undefined>(undefined);

// --- 3. CREAZIONE DELL'HOOK PERSONALIZZATO ---

export const useFilter = () => {
    const context = useContext(FilterContext);
    if (context === undefined) {
        // Lancia un errore se l'hook viene usato fuori dal suo provider.
        throw new Error('useFilter must be used within a FilterProvider');
    }
    return context;
};

// =========================================================================
// FINE SEZIONE UNITA
// =========================================================================


// --- PROVIDER COMPONENT ---

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
