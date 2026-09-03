import { useContext } from 'react';
import { GlobalDataContext, GlobalData } from '@/contexts/GlobalDataContext';

// Definiamo un tipo per l'output dell'hook, che sia compatibile con il passato.
// Le funzioni non più disponibili verranno simulate.
export interface LegacyMasterDataType {
    masterData: GlobalData['masterData'];
    loading: boolean;
    error: any;
    refetchData: () => Promise<void>; // Funzione non più necessaria, simulata.
    updateTariffe: (tariffe: any[]) => Promise<void>; // Funzione non più necessaria, simulata.
}

/**
 * Questo è un hook ADATTATORE.
 * Serve a mantenere la compatibilità con i componenti esistenti che usavano il vecchio `useMasterData`.
 * Ora attinge i dati dal nuovo `GlobalDataContext` e simula le funzioni che non esistono più.
 */
export const useMasterData = (): LegacyMasterDataType => {
    const context = useContext(GlobalDataContext);

    if (context === undefined) {
        // Questo errore non dovrebbe più accadere se il componente è dentro GlobalDataProvider
        throw new Error('useMasterData must be used within a GlobalDataProvider');
    }

    return {
        masterData: context.masterData,
        loading: context.loading,
        error: context.error,
        // Forniamo implementazioni vuote per le funzioni legacy per evitare crash.
        refetchData: async () => {
            console.warn('refetchData is deprecated and no longer works.');
        },
        updateTariffe: async (tariffe: any[]) => {
            console.warn('updateTariffe is deprecated. Tariff management should be handled differently.');
        },
    };
};
