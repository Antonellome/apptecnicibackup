import React, { ReactNode, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/local-db';
import { useAuth } from '../hooks/useAuth';
import { useSyncManager } from '../hooks/useSyncManager';
import { GlobalDataContext, GlobalData } from '../contexts/GlobalDataContext';
import FullScreenLoader from '@/components/FullScreenLoader';
import { MasterData } from '@/models/definitions';

// Creiamo un oggetto MasterData di default, completamente vuoto ma strutturalmente valido.
// Questo oggetto verrà usato come fallback per prevenire crash durante il caricamento iniziale.
const defaultMasterData: MasterData = {
    tecnici: [],
    ditte: [],
    categorie: [],
    navi: [],
    luoghi: [],
    veicoli: [],
    tipiGiornata: [],
    clienti: [],
    impostazioni: { id: 'main', tariffe: [] },
};

/**
 * Questo provider è la fonte di verità per l'intera UI.
 * È stato blindato per non restituire MAI un contesto non valido.
 */
export const GlobalDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user, loading: authLoading } = useAuth();
    const { isSyncing, error: syncError } = useSyncManager();

    const loading = authLoading || isSyncing;

    const userProfile = useLiveQuery(() => user ? db.webAppUsers.get(user.uid) : undefined, [user]);
    const rapportini = useLiveQuery(() => db.rapportini.toArray(), []);
    const checkins = useLiveQuery(() => db.checkins.toArray(), []);

    // La query per masterData ora usa il nostro oggetto di default come valore iniziale.
    // Questo garantisce che `masterData` non sia mai `undefined`.
    const masterData = useLiveQuery(async () => {
        const anagrafiche = await db.anagrafiche.toArray();
        if (anagrafiche.length === 0) return defaultMasterData;

        const data: { [key: string]: any[] } = {};
        anagrafiche.forEach(item => { data[item.id] = item.data; });

        const impostazioni = await db.tariffe_locali.get('main');
        return { ...defaultMasterData, ...data, impostazioni: impostazioni?.data || defaultMasterData.impostazioni } as MasterData;
    }, [], defaultMasterData);

    // Il valore del contesto è ora SEMPRE un oggetto valido.
    const contextValue: GlobalData = useMemo(() => ({
        masterData: masterData || defaultMasterData,
        rapportini: rapportini || [],
        checkins: checkins || [],
        userProfile: userProfile || null,
        loading,
        error: syncError,
    }), [masterData, rapportini, checkins, userProfile, loading, syncError]);

    // Mostra il loader solo se siamo in caricamento E i dati principali non sono ancora arrivati.
    // Questo previene sfarfallii se i dati sono già in cache.
    if (loading && !rapportini) {
        return <FullScreenLoader />;
    }

    return (
        <GlobalDataContext.Provider value={contextValue}>
            {children}
        </GlobalDataContext.Provider>
    );
};
