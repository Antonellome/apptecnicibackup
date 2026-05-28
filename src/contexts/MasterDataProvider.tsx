import React, { useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db as firestoreDb } from '@/firebase';
import type { MasterData, Impostazioni, TipoGiornata, TariffaLocale } from '@/models/definitions';
import { db } from '@/db/local-db';
import FullScreenLoader from '@/components/FullScreenLoader';
import { Alert, Box, Typography, Button } from '@mui/material';
import { MasterDataContext } from './MasterDataContext';

const ANAGRAFICA_COLLECTIONS: (keyof Omit<MasterData, 'impostazioni'>)[] = [
    'tecnici', 'tipiGiornata', 'veicoli', 'navi', 'luoghi', 'clienti', 'sedi', 'ditte', 'categorie'
];

const TARIFFS_BLUEPRINT: { nome: string; costo: number; unita: 'g' | 'h'; }[] = [
    { nome: 'Ferie', costo: 80, unita: 'g' },
    { nome: 'Festivo', costo: 80, unita: 'g' },
    { nome: 'Legge 104', costo: 10, unita: 'h' },
    { nome: 'Malattia', costo: 80, unita: 'g' },
    { nome: 'Ordinaria', costo: 10, unita: 'h' },
    { nome: 'Permesso', costo: 10, unita: 'h' },
    { nome: 'Straordinario', costo: 15, unita: 'h' },
    { nome: 'Trasferta Europa', costo: 40, unita: 'g' },
    { nome: 'Trasferta Extraeuropea', costo: 80, unita: 'g' },
    { nome: 'Trasferta Italia', costo: 20, unita: 'g' },
];

async function fetchMasterDataFromFirebase(): Promise<Omit<MasterData, 'impostazioni'>> {
    const loadedAnagrafiche: { [key: string]: any[] } = {};
    for (const key of ANAGRAFICA_COLLECTIONS) {
        console.log(`Fetching ${key} from Firebase...`);
        const querySnapshot = await getDocs(collection(firestoreDb, key));
        const items = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        loadedAnagrafiche[key] = items;
    }
    return loadedAnagrafiche as Omit<MasterData, 'impostazioni'>;
}

async function populateLocalDB(anagrafiche: Omit<MasterData, 'impostazioni'>): Promise<MasterData> {
    console.log("Populating local database with data correction logic...");
    await db.anagrafiche.clear();

    for (const key of ANAGRAFICA_COLLECTIONS) {
        await db.anagrafiche.put({ id: key, data: (anagrafiche as any)[key] || [], timestamp: new Date() });
    }

    const tipiGiornataDaDB = (anagrafiche.tipiGiornata || []) as TipoGiornata[];
    const blueprintMapByName = new Map(TARIFFS_BLUEPRINT.map(t => [t.nome.toLowerCase(), t]));
    
    const existingTariffe = await db.tariffe_locali.get('main');
    const existingTariffeMap = new Map(existingTariffe?.data.tariffe.map(t => [t.tipoGiornataId, t]));

    const finalTariffe: TariffaLocale[] = tipiGiornataDaDB.map((tipoGiornata) => {
        const existing = existingTariffeMap.get(tipoGiornata.id);
        const lookupName = tipoGiornata.nome?.toLowerCase() || '';
        const blueprintDefault = blueprintMapByName.get(lookupName) || blueprintMapByName.get(lookupName === '104' ? 'legge 104' : '');

        let costo = blueprintDefault?.costo ?? 0;
        let unita = blueprintDefault?.unita ?? 'h';

        if (existing) {
            costo = existing.costo;
            unita = existing.unita;
        }

        if (tipoGiornata.nome === 'Malattia' && costo === 10 && unita === 'h') {
            console.log('Found and correcting poisoned "Malattia" tariff.');
            costo = 80;
            unita = 'g';
        }

        return {
            id: tipoGiornata.id,
            tipoGiornataId: tipoGiornata.id,
            nome: tipoGiornata.nome,
            costo: costo,
            tariffa: costo, // CORREZIONE: Aggiunta la proprietà `tariffa` richiesta
            unita: unita,
        };
    });

    const finalImpostazioni: Impostazioni = { id: 'main', tariffe: finalTariffe };
    await db.tariffe_locali.put({ id: 'main', data: finalImpostazioni, timestamp: new Date() });
    console.log("Local database and tariffs populated correctly.");

    return { ...anagrafiche, impostazioni: finalImpostazioni };
}

async function loadDataFromCache(): Promise<MasterData | null> {
    console.log("Attempting to load data from cache...");
    const localAnagrafiche = await db.anagrafiche.toArray();
    if (localAnagrafiche.length === 0) {
        console.log("Cache is empty.");
        return null;
    }
    const data: { [key: string]: any[] } = {};
    localAnagrafiche.forEach(item => { data[item.id] = item.data; });
    const impostazioni = await db.tariffe_locali.get('main');
    console.log("Data loaded from cache successfully.");
    return { ...data, impostazioni: impostazioni?.data } as MasterData;
}

export const MasterDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [masterData, setMasterData] = useState<MasterData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<any | null>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            console.log("Starting data sync process...");
            const fetchedData = await fetchMasterDataFromFirebase();
            const finalData = await populateLocalDB(fetchedData);
            setMasterData(finalData);
        } catch (onlineError: any) {
            console.warn("Online fetch failed. Attempting to fallback to cache.", onlineError.message);
            try {
                const cachedData = await loadDataFromCache();
                if (cachedData) {
                    setMasterData(cachedData);
                } else {
                    throw onlineError; 
                }
            } catch {
                console.error("CRITICAL: Online and Cache data loading failed.", onlineError);
                setError(onlineError); 
            }
        } finally {
            setLoading(false);
            console.log("Data sync process finished.");
        }
    }, []);

    const forceClearAndReload = useCallback(async () => {
        console.log("Forcing cache clear and reload...");
        setLoading(true);
        setError(null);
        try {
            await db.delete();
            await db.open();
        } catch (e) {
            console.error("Failed to clear database", e);
        } finally {
            window.location.reload();
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const contextValue = useMemo(() => ({
        masterData, 
        loading, 
        error, 
        refetchData: loadData 
    }), [masterData, loading, error, loadData]);

    if (loading && !masterData) return <FullScreenLoader />;
    
    if (error) {
        return (
            <Box sx={{ p: { xs: 2, sm: 4 }, m: { xs: 1, sm: 2 }, border: '1px solid red', borderRadius: 2, backgroundColor: '#ffebee' }}>
                <Alert severity="error" sx={{ mb: 2 }}>
                    <Typography variant="h6">Errore Critico di Sincronizzazione</Typography>
                </Alert>
                <Typography variant="body1" color="text.secondary">Impossibile avviare l&apos;applicazione. Non è stato possibile scaricare i dati dal server e la cache locale è vuota o corrotta.</Typography>
                <Button variant="contained" color="error" onClick={forceClearAndReload} sx={{ mt: 2, mb: 2 }}>
                    Tenta di nuovo (Svuota la cache e ricarica)
                </Button>
                <Box component="pre" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', backgroundColor: '#f5f5f5', p: 2, mt: 2, borderRadius: 1, maxHeight: '40vh', overflow: 'auto' }}>
                    {
                        `Error Name: ${error.name}\n` +
                        `Message: ${error.message}\n\n` +
                        `Stack: ${error.stack}`
                    }
                </Box>
            </Box>
        );
    }

    if (!masterData) return <FullScreenLoader />;

    return (
        <MasterDataContext.Provider value={contextValue}>
            {children}
        </MasterDataContext.Provider>
    );
};