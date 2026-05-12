import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import type { TipoGiornata, Impostazioni, TariffaLocale, MasterData } from '@/models/definitions';
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

const ANAGRAFICA_COLLECTIONS: (keyof Omit<MasterData, 'impostazioni' | 'rapportini'>)[] = [
    'tecnici', 'tipiGiornata', 'veicoli', 'navi', 'luoghi', 'clienti'
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

// MAPPA BASATA SUL NOME: l'unica fonte di verità per i calcoli.
const blueprintMapByName = new Map(TARIFFS_BLUEPRINT.map(t => [t.nome.toLowerCase(), t]));

export const MasterDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [masterData, setMasterData] = useState<MasterData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAndCacheData = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            // AZIONE DEFINITIVA: Pulisce i dati corrotti dalle mie esecuzioni precedenti.
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

            // LOGICA DI CREAZIONE TARIFFA - ROBUSTA E BASATA SUL NOME
            const finalTariffe: TariffaLocale[] = tipiGiornataDaDB.map((tipoGiornata) => {
                const lookupName = tipoGiornata.nome?.toLowerCase() || '';
                
                // 1. Cerca il blueprint tramite il nome.
                let blueprintDefault = blueprintMapByName.get(lookupName);

                // 2. Se non lo trova, prova con le varianti conosciute (dati sporchi).
                if (!blueprintDefault) {
                    if (lookupName === '104') {
                        blueprintDefault = blueprintMapByName.get('legge 104');
                    }
                    // Aggiungere altri alias qui se necessario
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

            setMasterData({
                ...loadedAnagrafiche,
                impostazioni: finalImpostazioni,
            } as MasterData);

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
