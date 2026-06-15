import React, { useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db as firestoreDb } from '@/firebase';
import type { MasterData, Impostazioni, TipoGiornata, TariffaLocale } from '@/models/definitions';
import { db } from '@/db/local-db';
import FullScreenLoader from '@/components/FullScreenLoader';
import { Alert, Box, Typography, Button } from '@mui/material';
import { MasterDataContext } from './MasterDataContext';
import { useAuth } from '../hooks/useAuth';

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
        const querySnapshot = await getDocs(collection(firestoreDb, key));
        const items = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        loadedAnagrafiche[key] = items;
    }
    return loadedAnagrafiche as Omit<MasterData, 'impostazioni'>;
}

async function populateLocalDB(anagrafiche: Omit<MasterData, 'impostazioni'>): Promise<MasterData> {
    await db.anagrafiche.clear();
    for (const key of ANAGRAFICA_COLLECTIONS) {
        await db.anagrafiche.put({ id: key, data: (anagrafiche as any)[key] || [], timestamp: new Date() });
    }

    const tipiGiornataDaDB = (anagrafiche.tipiGiornata || []) as TipoGiornata[];
    const blueprintMapByName = new Map(TARIFFS_BLUEPRINT.map(t => [t.nome.toLowerCase(), t]));
    
    const existingImpostazioni = await db.tariffe_locali.get('main');
    const existingTariffeMap = new Map(existingImpostazioni?.data.tariffe.map(t => [t.tipoGiornataId, t]));

    const finalTariffe: TariffaLocale[] = tipiGiornataDaDB.map((tipoGiornata) => {
        const existingTariff = existingTariffeMap.get(tipoGiornata.id);
        if (existingTariff) {
            return existingTariff;
        }

        const lookupName = tipoGiornata.nome?.toLowerCase() || '';
        const blueprintDefault = blueprintMapByName.get(lookupName) || blueprintMapByName.get(lookupName === '104' ? 'legge 104' : '');
        const costo = blueprintDefault?.costo ?? 0;
        const unita = blueprintDefault?.unita ?? 'h';

        return {
            id: tipoGiornata.id,
            tipoGiornataId: tipoGiornata.id,
            nome: tipoGiornata.nome,
            costo: costo,
            tariffa: costo, 
            unita: unita,
        };
    });

    const finalImpostazioni: Impostazioni = { id: 'main', tariffe: finalTariffe };
    await db.tariffe_locali.put({ id: 'main', data: finalImpostazioni, timestamp: new Date() });
    
    return { ...anagrafiche, impostazioni: finalImpostazioni };
}

async function loadDataFromCache(): Promise<MasterData | null> {
    const localAnagrafiche = await db.anagrafiche.toArray();
    if (localAnagrafiche.length === 0) return null;
    
    const data: { [key: string]: any[] } = {};
    localAnagrafiche.forEach(item => { data[item.id] = item.data; });
    const impostazioni = await db.tariffe_locali.get('main');

    return { ...data, impostazioni: impostazioni?.data } as MasterData;
}

export const MasterDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [masterData, setMasterData] = useState<MasterData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<any | null>(null);
    const { user, loading: authLoading } = useAuth();

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const fetchedData = await fetchMasterDataFromFirebase();
            const finalData = await populateLocalDB(fetchedData);
            setMasterData(finalData);
        } catch (onlineError: any) {            
            try {
                const cachedData = await loadDataFromCache();
                if (cachedData) setMasterData(cachedData);
                else throw onlineError;
            } catch {
                setError(onlineError);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    // ========= LA NUOVA FUNZIONE PER LA REATTIVITÀ ISTANTANEA =========
    const updateTariffe = useCallback(async (nuoveTariffe: TariffaLocale[]) => {
        if (!masterData) throw new Error("MasterData non è ancora stato caricato.");

        await db.tariffe_locali.update('main', {
            'data.tariffe': nuoveTariffe,
            'timestamp': new Date()
        });

        setMasterData(prevData => {
            if (!prevData) return null; // Non dovrebbe succedere
            const nuoveImpostazioni = { ...prevData.impostazioni, tariffe: nuoveTariffe };
            return { ...prevData, impostazioni: nuoveImpostazioni as Impostazioni };
        });
    }, [masterData]);
    // ==================================================================

    const forceClearAndReload = useCallback(async () => {
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
        if (!authLoading && user) {
            loadData();
        } else if (!authLoading && !user) {
            setLoading(false);
        }
    }, [authLoading, user, loadData]);

    const contextValue = useMemo(() => ({
        masterData, 
        loading, 
        error, 
        refetchData: loadData, 
        updateTariffe // <-- ESPORTIAMO LA NUOVA FUNZIONE
    }), [masterData, loading, error, loadData, updateTariffe]);

    if (authLoading || (loading && !masterData && !error)) return <FullScreenLoader />;
    
    if (error) {
        return (
            <Box sx={{ p: { xs: 2, sm: 4 }, m: { xs: 1, sm: 2 }, border: '1px solid red', borderRadius: 2, backgroundColor: '#ffebee' }}>
                <Alert severity="error" sx={{ mb: 2 }}>
                    <Typography variant="h6">Errore Critico di Sincronizzazione</Typography>
                </Alert>
                <Typography>Impossibile avviare l&apos;app. Controlla la connessione e riprova.</Typography>
                <Button variant="contained" color="error" onClick={forceClearAndReload} sx={{ mt: 2, mb: 2 }}>
                    Tenta di nuovo (Svuota la cache e ricarica)
                </Button>
                <Box component="pre" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', p: 2, mt: 2 }}>
                    {`Dettagli: ${error.message}`}
                </Box>
            </Box>
        );
    }

    if (!user) {
        return <>{children}</>; 
    }

    if (!masterData) return <FullScreenLoader />;

    return (
        <MasterDataContext.Provider value={contextValue}>
            {children}
        </MasterDataContext.Provider>
    );
};
