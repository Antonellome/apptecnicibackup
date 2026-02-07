import { useContext } from 'react';
import { DataContext, type IDataContext } from '@/contexts/DataProvider';

/**
 * Hook personalizzato per accedere al contesto dei dati globali dell'applicazione.
 * Fornisce un accesso sicuro e tipizzato al `DataContext`,
 * garantendo che venga utilizzato solo all'interno di un `DataProvider`.
 *
 * @returns {IDataContext} L'oggetto del contesto contenente tutte le collezioni di dati (es. tecnici, veicoli), 
 * le mappe per un accesso rapido, lo stato di caricamento e le funzioni per la manipolazione dei dati (add, update, delete).
 * @throws {Error} Se l'hook viene utilizzato al di fuori di un `DataProvider`.
 */
export const useData = (): IDataContext => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData deve essere utilizzato all\'interno di un DataProvider');
    }
    return context;
};
