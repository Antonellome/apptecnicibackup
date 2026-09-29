
import React, { ReactNode, useMemo, useState, useEffect, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/local-db';
import { useAuth } from '@/hooks/useAuth';
import { GlobalDataContext } from '@/contexts/GlobalDataContext';
import { Impostazioni, MasterData, TariffaLocale, GlobalData, Tecnico } from '@/models/definitions';
import { useSyncManager } from '@/hooks/useSyncManager';

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
    if (typeof nomeTipo !== 'string' || nomeTipo.trim() === '') {
        return { costo: 0, unita: 'g' };
    }
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
    const [isDbReady, setIsDbReady] = useState(false);

    useSyncManager();

    useEffect(() => {
        db.open().then(() => {
            console.log("Database aperto con successo.");
            setIsDbReady(true);
        }).catch(err => {
            console.error("Errore critico durante l'apertura del DB:", err);
        });
    }, []);

    const tecnici = useLiveQuery(() => isDbReady ? db.tecnici.toArray() : [], [isDbReady], []);
    const ditte = useLiveQuery(() => isDbReady ? db.ditte.toArray() : [], [isDbReady], []);
    const categorie = useLiveQuery(() => isDbReady ? db.categorie.toArray() : [], [isDbReady], []);
    const navi = useLiveQuery(() => isDbReady ? db.navi.toArray() : [], [isDbReady], []);
    const luoghi = useLiveQuery(() => isDbReady ? db.luoghi.toArray() : [], [isDbReady], []);
    const veicoli = useLiveQuery(() => isDbReady ? db.veicoli.toArray() : [], [isDbReady], []);
    const clienti = useLiveQuery(() => isDbReady ? db.clienti.toArray() : [], [isDbReady], []);
    const tipiGiornata = useLiveQuery(() => isDbReady ? db.tipiGiornata.toArray() : [], [isDbReady], []);
    const impostazioni = useLiveQuery(() => isDbReady ? db.impostazioni.get('main') : undefined, [isDbReady]);
    const rapportini = useLiveQuery(() => isDbReady ? db.rapportini.toArray() : [], [isDbReady], []);
    const checkins = useLiveQuery(() => isDbReady ? db.checkin_giornalieri.toArray() : [], [isDbReady], []);
    const userProfile = useLiveQuery(() => isDbReady && user ? db.tecnici.get(user.uid) : undefined, [isDbReady, user]) as Tecnico | undefined;

    useEffect(() => {
        if (!isDbReady || !tipiGiornata) return;

        const checkAndSetDefaults = async () => {
          try {
            const currentImpostazioni = await db.impostazioni.get('main');
            if (!currentImpostazioni || currentImpostazioni.version !== IMPOSTAZIONI_VERSION) {
                console.warn(`[FORZATURA V${IMPOSTAZIONI_VERSION}] Impostazioni nel DB assenti o obsolete. Genero i default.`);
                
                if (tipiGiornata.length === 0) {
                    console.warn("Tipi di giornata non ancora disponibili, rimando la creazione dei default.");
                    return;
                }

                const nuoveTariffeDefault = tipiGiornata
                  .filter(tipo => tipo && typeof tipo.nome === 'string')
                  .map((tipo): TariffaLocale => {
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
          } catch (error) {
            console.error("Fallimento durante la creazione delle impostazioni di default.", error);
          }
        };
        
        checkAndSetDefaults();
    }, [isDbReady, tipiGiornata]);
    
    const masterData = useMemo((): MasterData | undefined => {
        if (authLoading || !isDbReady || tipiGiornata === undefined) {
            return undefined;
        }
        
        return {
            tecnici: tecnici || [],
            ditte: ditte || [],
            categorie: categorie || [],
            navi: navi || [],
            luoghi: luoghi || [],
            veicoli: veicoli || [],
            clienti: clienti || [],
            tipiGiornata: tipiGiornata || [],
            impostazioni: impostazioni || { id: 'main', version: IMPOSTAZIONI_VERSION, tariffe: [] },
        };
    }, [authLoading, isDbReady, tecnici, ditte, categorie, navi, luoghi, veicoli, clienti, tipiGiornata, impostazioni]);

    const updateImpostazioni = useCallback(async (newImpostazioni: Impostazioni) => {
        try {
            const impostazioniConVersione: Impostazioni = { ...newImpostazioni, version: IMPOSTAZIONI_VERSION };
            await db.impostazioni.put(impostazioniConVersione);
            console.log("Impostazioni aggiornate");
        } catch (error) {
            console.error("Errore durante l'aggiornamento delle impostazioni:", error);
            throw error;
        }
    }, []);

    const contextValue: GlobalData = useMemo(() => ({
        masterData: masterData,
        rapportini: rapportini || [],
        checkins: checkins || [],
        userProfile: userProfile,
        loading: authLoading || !isDbReady,
        error: undefined,
        updateImpostazioni,
    }), [masterData, rapportini, checkins, userProfile, authLoading, isDbReady, updateImpostazioni]);

    return (
        <GlobalDataContext.Provider value={contextValue}>
            {children}
        </GlobalDataContext.Provider>
    );
};