import React, { ReactNode, useMemo, useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/local-db';
import { useAuth } from '../hooks/useAuth';
import { useSyncManager } from '../hooks/useSyncManager';
import { GlobalDataContext, GlobalData } from '../contexts/GlobalDataContext';
import FullScreenLoader from '@/components/FullScreenLoader';
import { MasterData } from '@/models/definitions';

const defaultMasterData: MasterData = {
    tecnici: [],
    ditte: [],
    categorie: [],
    lavorazioni: [],
    qualifiche: [],
    sistemi: [],
    navi: [],
    luoghi: [],
    veicoli: [],
    tipiGiornata: [],
    clienti: [],
    impostazioni: { id: 'main', tariffe: [] },
};

export const GlobalDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user, loading: authLoading } = useAuth();
    const { isSyncing, error: syncError } = useSyncManager();
    const [isDbReady, setIsDbReady] = useState(false);

    useEffect(() => {
        db.open().then(() => {
            console.log("[DB] Database aperto e pronto.");
            setIsDbReady(true);
        }).catch(err => {
            console.error("[DB] Errore critico: impossibile aprire il database", err);
            setIsDbReady(false);
        });
    }, []);

    const loading = authLoading || isSyncing || !isDbReady;

    const userProfile = useLiveQuery(() => 
        isDbReady && user ? db.webAppUsers.get(user.uid) : undefined,
    [isDbReady, user]);

    const rapportini = useLiveQuery(() => 
        isDbReady ? db.rapportini.toArray() : [], 
    [isDbReady], []);

    const checkins = useLiveQuery(() => 
        isDbReady ? db.checkin_giornalieri.toArray() : [],
    [isDbReady], []);

    const masterData = useLiveQuery(async () => {
        if (!isDbReady) return defaultMasterData;

        const [tecnici, ditte, categorie, lavorazioni, navi, luoghi, veicoli, tipiGiornata, impostazioni] = await Promise.all([
            db.tecnici.toArray(),
            db.ditte.toArray(),
            db.categorie.toArray(),
            db.lavorazioni.toArray(),
            db.navi.toArray(),
            db.luoghi.toArray(),
            db.veicoli.toArray(),
            db.tipiGiornata.toArray(),
            db.impostazioni.get('main')
        ]);

        return {
            ...defaultMasterData, // Inizia con i default (che includono array vuoti per la spazzatura)
            tecnici,
            ditte,
            categorie,
            lavorazioni,
            navi,
            luoghi,
            veicoli,
            tipiGiornata,
            impostazioni: impostazioni || defaultMasterData.impostazioni,
        };

    }, [isDbReady], defaultMasterData);

    const contextValue: GlobalData = useMemo(() => ({
        masterData: masterData || defaultMasterData,
        rapportini: rapportini || [],
        checkins: checkins || [],
        userProfile: userProfile || null,
        loading,
        error: syncError,
    }), [masterData, rapportini, checkins, userProfile, loading, syncError]);

    if (loading) {
        return <FullScreenLoader />;
    }

    return (
        <GlobalDataContext.Provider value={contextValue}>
            {children}
        </GlobalDataContext.Provider>
    );
};