import React, { ReactNode, useMemo, useState, useEffect, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/local-db';
import { useAuth } from '@/hooks/useAuth';
import { useSyncManager } from '@/hooks/useSyncManager';
import { GlobalDataContext } from '@/contexts/GlobalDataContext';
import FullScreenLoader from '@/components/FullScreenLoader';
import { Impostazioni, MasterData, TariffaLocale, GlobalData, Tecnico } from '@/models/definitions';

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

const getCostoDefault = (nomeTipo: string): { costo: number; unita: 'h' | 'g' } => {
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

    useEffect(() => {
        db.open().then(() => {
            console.log("[DB] Database aperto e pronto.");
            setIsDbReady(true);
        }).catch(err => {
            console.error("[DB] Errore critico: impossibile aprire il database", err);
        });
    }, []);

    const tecnici = useLiveQuery(() => isDbReady ? db.tecnici.toArray() : [], [isDbReady], []);
    const ditte = useLiveQuery(() => isDbReady ? db.ditte.toArray() : [], [isDbReady], []);
    const categorie = useLiveQuery(() => isDbReady ? db.categorie.toArray() : [], [isDbReady], []);
    const lavorazioni = useLiveQuery(() => isDbReady ? db.lavorazioni.toArray() : [], [isDbReady], []);
    const navi = useLiveQuery(() => isDbReady ? db.navi.toArray() : [], [isDbReady], []);
    const luoghi = useLiveQuery(() => isDbReady ? db.luoghi.toArray() : [], [isDbReady], []);
    const veicoli = useLiveQuery(() => isDbReady ? db.veicoli.toArray() : [], [isDbReady], []);
    const clienti = useLiveQuery(() => isDbReady ? db.clienti.toArray() : [], [isDbReady], []);
    const tipiGiornata = useLiveQuery(() => isDbReady ? db.tipiGiornata.toArray() : [], [isDbReady], []);
    const sedi = useLiveQuery(() => isDbReady ? db.sedi.toArray() : [], [isDbReady], []);
    const qualifiche = useLiveQuery(() => isDbReady ? db.qualifiche.toArray() : [], [isDbReady], []);
    const sistemi = useLiveQuery(() => isDbReady ? db.sistemi.toArray() : [], [isDbReady], []);
    const impostazioni = useLiveQuery(() => isDbReady ? db.impostazioni.get('main') : undefined, [isDbReady]);
    const rapportini = useLiveQuery(() => isDbReady ? db.rapportini.toArray() : [], [isDbReady], []);
    const checkins = useLiveQuery(() => isDbReady ? db.checkin_giornalieri.toArray() : [], [isDbReady], []);
    const userProfile = useLiveQuery(() => isDbReady && user ? db.tecnici.get(user.uid) : undefined, [isDbReady, user]) as Tecnico | undefined;

    useEffect(() => {
        if (!isDbReady || !tipiGiornata || tipiGiornata.length === 0) return;

        const checkAndSetDefaults = async () => {
            if (!impostazioni || impostazioni.version !== IMPOSTAZIONI_VERSION) {
                console.warn(`[FORZATURA V${IMPOSTAZIONI_VERSION}] Impostazioni nel DB assenti o obsolete. Genero i default.`);
                
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
            }
        };
        
        checkAndSetDefaults();
    }, [isDbReady, tipiGiornata, impostazioni]);
    
    const masterData = useMemo((): MasterData | undefined => {
        if (impostazioni === undefined) {
            return undefined; // Dati non ancora pronti
        }
        
        return {
            tecnici: tecnici || [],
            ditte: ditte || [],
            categorie: categorie || [],
            lavorazioni: lavorazioni || [],
            navi: navi || [],
            luoghi: luoghi || [],
            veicoli: veicoli || [],
            clienti: clienti || [],
            tipiGiornata: tipiGiornata || [],
            impostazioni: impostazioni || { id: 'main', version: IMPOSTAZIONI_VERSION, tariffe: [] },
            sedi: sedi || [],
            qualifiche: qualifiche || [], 
            sistemi: sistemi || [],
        };
    }, [tecnici, ditte, categorie, lavorazioni, navi, luoghi, veicoli, clienti, tipiGiornata, impostazioni, sedi, qualifiche, sistemi]);

    const updateImpostazioni = useCallback(async (newImpostazioni: Impostazioni) => {
        try {
            const impostazioniConVersione: Impostazioni = { ...newImpostazioni, version: IMPOSTAZIONI_VERSION };
            await db.impostazioni.put(impostazioniConVersione);
            console.log("[GlobalDataProvider] Impostazioni aggiornate.");
        } catch (error) {
            console.error("[DB] Errore durante l'aggiornamento delle impostazioni:", error);
            throw error;
        } 
    }, []);

    const loading = authLoading || !isDbReady || !masterData || isSyncing;

    const contextValue: GlobalData = useMemo(() => ({
        masterData: masterData,
        rapportini: rapportini || [],
        checkins: checkins || [],
        userProfile: userProfile,
        loading,
        error: syncError || undefined,
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
