import React, { ReactNode, useMemo, useState, useEffect, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/local-db';
import { useAuth } from '../hooks/useAuth';
import { useSyncManager } from '../hooks/useSyncManager';
import { GlobalDataContext, GlobalData } from '../contexts/GlobalDataContext';
import FullScreenLoader from '@/components/FullScreenLoader';
import { Impostazioni, MasterData, TariffaLocale, TipoGiornata } from '@/models/definitions';

// =====================================================================================
// --- V8 - AGGIORNAMENTO FORZATO TRAMITE VERSIONING ---
// =====================================================================================
const IMPOSTAZIONI_VERSION = 8;

const COSTI_DEFAULT_MAP: Record<string, { costo: number; unita: 'h' | 'g' }> = {
    'Ordinaria': { costo: 10.00, unita: 'h' },
    'Straordinario': { costo: 15.00, unita: 'h' },
    'Trasferta Italia': { costo: 20.00, unita: 'g' },
    'Trasferta Europa': { costo: 40.00, unita: 'g' },
    'Trasferta ExtraEuropea': { costo: 80.00, unita: 'g' },
    'Festivo': { costo: 80.00, unita: 'g' },
    'Ferie': { costo: 80.00, unita: 'g' },
    'Malattia': { costo: 80.00, unita: 'g' },
    '104': { costo: 10.00, unita: 'h' },
    'Permesso': { costo: 10.00, unita: 'h' },
};

const getCostoDefault = (nomeTipo: string) => {
    const normalizedNome = nomeTipo.toLowerCase().replace(/\s/g, '');
    for (const key in COSTI_DEFAULT_MAP) {
        const normalizedKey = key.toLowerCase().replace(/\s/g, '');
        if (normalizedKey === normalizedNome) {
            return COSTI_DEFAULT_MAP[key];
        }
    }
    return { costo: 0, unita: 'g' };
};

export const GlobalDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user, loading: authLoading } = useAuth();
    const { isSyncing, error: syncError } = useSyncManager();
    
    const [isDbReady, setIsDbReady] = useState(false);
    const [masterData, setMasterData] = useState<MasterData | null>(null);

    useEffect(() => {
        db.open().then(() => {
            console.log("[DB] Database aperto e pronto.");
            setIsDbReady(true);
        }).catch(err => {
            console.error("[DB] Errore critico: impossibile aprire il database", err);
        });
    }, []);

    useEffect(() => {
        const loadInitialData = async () => {
            if (!isDbReady) return;
            console.log("[GlobalDataProvider] Il database è pronto. Inizio caricamento dati.");

            try {
                const tipiGiornata = await db.tipiGiornata.toArray();
                let finalImpostazioni: Impostazioni;
                const dbImpostazioni = await db.impostazioni.get('main');

                // CONTROLLO BRUTALE DELLA VERSIONE
                if (!dbImpostazioni || dbImpostazioni.version !== IMPOSTAZIONI_VERSION) {
                    console.warn(`[FORZATURA V${IMPOSTAZIONI_VERSION}] Impostazioni nel DB assenti o obsolete (versione: ${dbImpostazioni?.version}). Genero i default.`);
                    
                    const nuoveTariffeDefault = tipiGiornata.map((tipo): TariffaLocale => {
                        const defaultCosto = getCostoDefault(tipo.nome);
                        return {
                            id: tipo.id,
                            tipoGiornataId: tipo.id,
                            nome: tipo.nome,
                            costo: defaultCosto.costo,
                            unita: defaultCosto.unita,
                            tariffa: defaultCosto.costo,
                        };
                    });

                    const nuoveImpostazioni: Impostazioni = {
                        id: 'main',
                        version: IMPOSTAZIONI_VERSION,
                        tariffe: nuoveTariffeDefault
                    };
                    await db.impostazioni.put(nuoveImpostazioni);
                    finalImpostazioni = nuoveImpostazioni;
                } else {
                    finalImpostazioni = dbImpostazioni;
                }

                const [tecnici, ditte, categorie, lavorazioni, navi, luoghi, veicoli, clienti] = await Promise.all([
                    db.tecnici.toArray(),
                    db.ditte.toArray(),
                    db.categorie.toArray(),
                    db.lavorazioni.toArray(),
                    db.navi.toArray(),
                    db.luoghi.toArray(),
                    db.veicoli.toArray(),
                    db.clienti.toArray(),
                ]);

                const loadedMasterData: MasterData = {
                    tecnici, ditte, categorie, lavorazioni, navi, luoghi, veicoli, clienti,
                    tipiGiornata,
                    impostazioni: finalImpostazioni,
                    qualifiche: [], 
                    sistemi: [],
                };

                setMasterData(loadedMasterData);
                console.log("[GlobalDataProvider] Dati anagrafici caricati nello stato globale.");

            } catch (error) {
                console.error("[GlobalDataProvider] Errore critico durante il caricamento dei master data:", error);
            }
        };

        loadInitialData();
    }, [isDbReady]);

    const rapportini = useLiveQuery(() => isDbReady ? db.rapportini.toArray() : [], [isDbReady], []);
    const checkins = useLiveQuery(() => isDbReady ? db.checkin_giornalieri.toArray() : [], [isDbReady], []);
    const userProfile = useLiveQuery(() => isDbReady && user ? db.webAppUsers.get(user.uid) : undefined, [isDbReady, user]);

    const updateImpostazioni = useCallback(async (newImpostazioni: Impostazioni) => {
        try {
            // Assicuriamoci che la versione sia sempre aggiornata quando salviamo
            const impostazioniConVersione: Impostazioni = { ...newImpostazioni, version: IMPOSTAZIONI_VERSION };
            await db.impostazioni.put(impostazioniConVersione);
            setMasterData(prevData => prevData ? { ...prevData, impostazioni: impostazioniConVersione } : null);
            console.log("[GlobalDataProvider] Impostazioni aggiornate.");
        } catch (error) {
            console.error("[DB] Errore durante l'aggiornamento delle impostazioni:", error);
            throw error;
        } 
    }, []);

    const loading = authLoading || !isDbReady || !masterData || isSyncing;

    const contextValue: GlobalData = useMemo(() => ({
        masterData: masterData!,
        rapportini: rapportini || [],
        checkins: checkins || [],
        userProfile: userProfile || null,
        loading,
        error: syncError,
        updateImpostazioni,
    }), [masterData, rapportini, checkins, userProfile, loading, syncError, updateImpostazioni]);

    if (loading) {
        return <FullScreenLoader />;
    }

    return (
        <GlobalDataContext.Provider value={contextValue}>
            {children}
        </GlobalDataContext.Provider>
    );
};
