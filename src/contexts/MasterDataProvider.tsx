import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import type { TipoGiornata, Impostazioni, Tariffa, MasterData } from '@/models/definitions';
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

const TARIFFS_BLUEPRINT: Omit<Tariffa, 'tipoGiornataId' | 'nome'> & { nome: string }[] = [
    { nome: 'Ferie', costo: 80, unita: 'g' },
    { nome: 'Festivo', costo: 80, unita: 'g' },
    { nome: 'Legge 104', costo: 10, unita: 'h' },
    { nome: 'Malattia', costo: 10, unita: 'h' },
    { nome: 'Ordinaria', costo: 10, unita: 'h' },
    { nome: 'Permesso', costo: 10, unita: 'h' },
    { nome: 'Straordinario', costo: 15, unita: 'h' },
    { nome: 'Trasferta Europa', costo: 50, unita: 'g' },
    { nome: 'Trasferta Extraeuropea', costo: 80, unita: 'g' },
    { nome: 'Trasferta Italia', costo: 20, unita: 'g' },
];

export const MasterDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [masterData, setMasterData] = useState<MasterData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAndCacheData = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const loadedAnagrafiche: { [key: string]: any[] } = {};
            for (const key of ANAGRAFICA_COLLECTIONS) {
                const querySnapshot = await getDocs(collection(db, key));
                const items = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                loadedAnagrafiche[key] = items;
                await localDB.anagrafiche.put({ id: key, data: items, timestamp: new Date() });
            }
            const tipiGiornata = loadedAnagrafiche.tipiGiornata as TipoGiornata[];

            const cachedImpostazioni = await localDB.tariffe_locali.get('main');

            const reconciledTariffe: Tariffa[] = TARIFFS_BLUEPRINT.map(blueprintTariff => {
                const tipoGiornataCorrispondente = tipiGiornata.find(tg => tg.nome.toLowerCase() === blueprintTariff.nome.toLowerCase());
                const cachedTariff = cachedImpostazioni?.data?.tariffe?.find(t => t.nome === blueprintTariff.nome);

                let finalCost = blueprintTariff.costo; // Inizia con il valore corretto dal blueprint

                if (cachedTariff?.costo !== undefined) {
                    // Se esiste un costo salvato, decidiamo se tenerlo o forzare la correzione.
                    const isWrongFerie = blueprintTariff.nome === 'Ferie' && cachedTariff.costo === 18;
                    const isWrongFestivo = blueprintTariff.nome === 'Festivo' && cachedTariff.costo === 0;
                    const isWrongPermesso = blueprintTariff.nome === 'Permesso' && cachedTariff.costo === 0;

                    if (isWrongFerie || isWrongFestivo || isWrongPermesso) {
                        // Questo è uno dei miei errori passati. Lo distruggo e uso il valore del blueprint.
                        finalCost = blueprintTariff.costo;
                    } else {
                        // Non è un errore noto, quindi è una personalizzazione dell'utente. La mantengo.
                        finalCost = cachedTariff.costo;
                    }
                }

                return {
                    tipoGiornataId: tipoGiornataCorrispondente?.id || blueprintTariff.nome.toLowerCase().replace(/\s+/g, '-'),
                    nome: blueprintTariff.nome,
                    costo: finalCost,
                    unita: blueprintTariff.unita, // L'unità è sempre dettata dal blueprint.
                };
            });

            const finalImpostazioni: Impostazioni = {
                ...(cachedImpostazioni?.data || {}),
                tariffe: reconciledTariffe
            };

            await localDB.tariffe_locali.put({ id: 'main', data: finalImpostazioni, timestamp: new Date() });

            setMasterData({
                ...loadedAnagrafiche,
                impostazioni: finalImpostazioni,
            } as MasterData);

        } catch (err) {
            console.error("Errore critico durante il caricamento dei dati master:", err);
            setError("Impossibile caricare dati essenziali. L'app potrebbe non funzionare correttamente.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAndCacheData();
    }, [fetchAndCacheData]);

    const contextValue: MasterDataContextType = { masterData, loading, error, refetchData: fetchAndCacheData };

    if (loading && !masterData) return <FullScreenLoader />;
    if (error) return <Box sx={{ p: 4 }}><Alert severity="error">{error}</Alert></Box>;

    return (
        <MasterDataContext.Provider value={contextValue}>
            {children}
        </MasterDataContext.Provider>
    );
};
