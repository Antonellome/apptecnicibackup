import React, { createContext, useState, useEffect, ReactNode, useCallback, useContext } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import type { TipoGiornata, Impostazioni, TariffaLocale, MasterData, Tecnico, Cliente, Veicolo, Luogo, Nave, Sede, Ditta, Categoria } from '@/models/definitions';
import { localDB } from '@/db/local-db';
import FullScreenLoader from '@/components/FullScreenLoader';
import { Alert, Box } from '@mui/material';

export interface MasterDataContextType {
    masterData: MasterData | null;
    loading: boolean;
    error: string | null;
    refetchData: () => Promise<void>;
}

export const MasterDataContext = createContext<MasterDataContextType | undefined>(undefined);

export const useMasterData = () => {
    const context = useContext(MasterDataContext);
    if (context === undefined) {
        throw new Error('useMasterData must be used within a MasterDataProvider');
    }
    return context;
};

const ANAGRAFICA_COLLECTIONS: (keyof Omit<MasterData, 'impostazioni'>)[] = [
    'tecnici', 'tipiGiornata', 'veicoli', 'navi', 'luoghi', 'clienti', 'sedi', 'ditte', 'categorie'
];

type BlueprintTariff = { nome: string; costo: number; unita: 'g' | 'h'; };

const TARIFFS_BLUEPRINT: BlueprintTariff[] = [
    { nome: 'Ferie', costo: 80, unita: 'g' },
    { nome: 'Festivo', costo: 80, unita: 'g' },
    { nome: 'Legge 104', costo: 10, unita: 'h' },
    { nome: 'Malattia', costo: 10, unita: 'h' },
    { nome: 'Ordinaria', costo: 10, unita: 'h' },
    { nome: 'Permesso', costo: 10, unita: 'h' },
    { nome: 'Straordinario', costo: 15, unita: 'h' },
    { nome: 'Trasferta Europa', costo: 40, unita: 'g' },
    { nome: 'Trasferta Extraeuropea', costo: 80, unita: 'g' },
    { nome: 'Trasferta Italia', costo: 20, unita: 'g' },
];

const blueprintMapByName = new Map(TARIFFS_BLUEPRINT.map(t => [t.nome.toLowerCase(), t]));

export const MasterDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [masterData, setMasterData] = useState<MasterData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAndCacheData = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            await localDB.tariffe_locali.clear();

            const loadedAnagrafiche: { [key: string]: any[] } = {};
            for (const key of ANAGRAFICA_COLLECTIONS) {
                const querySnapshot = await getDocs(collection(db, key));
                const items = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                loadedAnagrafiche[key] = items;
                await localDB.anagrafiche.put({ id: key, data: items, timestamp: new Date() });
            }
            
            const tipiGiornataDaDB = loadedAnagrafiche.tipiGiornata as TipoGiornata[];
            const cachedImpostazioni = await localDB.tariffe_locali.get('main');
            const cachedTariffeMap = new Map(cachedImpostazioni?.data?.tariffe?.map((t: TariffaLocale) => [t.id, t]) || []);

            const finalTariffe: TariffaLocale[] = tipiGiornataDaDB.map((tipoGiornata) => {
                const lookupName = tipoGiornata.nome?.toLowerCase() || '';
                let blueprintDefault = blueprintMapByName.get(lookupName);

                if (!blueprintDefault) {
                    if (lookupName === '104') {
                        blueprintDefault = blueprintMapByName.get('legge 104');
                    }
                }

                const cachedTariff = cachedTariffeMap.get(tipoGiornata.id);
                const id = tipoGiornata.id;
                const costo = cachedTariff?.costo ?? blueprintDefault?.costo ?? 0;
                const unita = blueprintDefault?.unita ?? 'h';

                return {
                    id: id,
                    tipoGiornataId: id,
                    nome: tipoGiornata.nome,
                    costo: costo,
                    unita: unita,
                };
            });

            const finalImpostazioni: Impostazioni = {
                ...(cachedImpostazioni?.data || {}),
                tariffe: finalTariffe
            };
            await localDB.tariffe_locali.put({ id: 'main', data: finalImpostazioni, timestamp: new Date() });

            // COSTRUZIONE ESPLICITA E SICURA DELL'OGGETTO MASTERDATA
            const finalMasterData: MasterData = {
                tecnici: (loadedAnagrafiche.tecnici || []) as Tecnico[],
                clienti: (loadedAnagrafiche.clienti || []) as Cliente[],
                tipiGiornata: tipiGiornataDaDB || [],
                veicoli: (loadedAnagrafiche.veicoli || []) as Veicolo[],
                luoghi: (loadedAnagrafiche.luoghi || []) as Luogo[],
                navi: (loadedAnagrafiche.navi || []) as Nave[],
                sedi: (loadedAnagrafiche.sedi || []) as Sede[],
                ditte: (loadedAnagrafiche.ditte || []) as Ditta[],
                categorie: (loadedAnagrafiche.categorie || []) as Categoria[],
                impostazioni: finalImpostazioni,
            };

            setMasterData(finalMasterData);

        } catch (err: any) {
            console.error("Errore critico durante il caricamento dei dati master:", err);
            setError(`Errore critico durante il caricamento dei dati master: ${err.message}`);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAndCacheData();
    }, [fetchAndCacheData]);

    const contextValue: MasterDataContextType = { masterData, loading, error, refetchData: fetchAndCacheData };

    if (loading && !masterData && !error) return <FullScreenLoader />;
    if (error) return <Box sx={{ p: 4 }}><Alert severity="error">{error}</Alert></Box>;

    return (
        <MasterDataContext.Provider value={contextValue}>
            {children}
        </MasterDataContext.Provider>
    );
};
