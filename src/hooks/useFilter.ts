import { useContext } from 'react';
import { FilterContext, type IFilterContext } from '@/contexts/FilterProvider';

/**
 * Hook personalizzato per accedere al contesto dei filtri.
 * Fornisce un accesso sicuro e tipizzato al `FilterContext`,
 * garantendo che venga utilizzato solo all'interno di un `FilterProvider`.
 *
 * @returns {IFilterContext} L'oggetto del contesto contenente lo stato dei filtri e le funzioni per modificarlo.
 * @throws {Error} Se l'hook viene utilizzato al di fuori di un `FilterProvider`.
 */
export const useFilter = (): IFilterContext => {
    const context = useContext(FilterContext);
    if (context === undefined) {
        throw new Error('useFilter must be used within a FilterProvider');
    }
    return context;
};
