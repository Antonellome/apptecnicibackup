import { useContext } from 'react';
import { GlobalDataContext, IGlobalDataContext } from '@/contexts/GlobalDataContext';

/**
 * Questo è l'UNICO hook autorizzato per accedere ai dati globali dell'applicazione.
 * Si connette al GlobalDataContext e fornisce i dati e gli stati a qualsiasi componente che lo utilizza.
 */
export const useGlobalData = (): IGlobalDataContext => {
    const context = useContext(GlobalDataContext);
    if (context === undefined) {
        throw new Error('useGlobalData must be used within a GlobalDataProvider');
    }
    return context;
};
