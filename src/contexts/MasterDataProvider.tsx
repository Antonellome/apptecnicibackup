import React, { useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { collection, getDocs, doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { db as firestoreDb } from '@/firebase';
import type { MasterData, Impostazioni, TipoGiornata, TariffaLocale, SyncManifest } from '@/models/definitions';
import { db } from '@/db/local-db';
import FullScreenLoader from '@/components/FullScreenLoader';
import { Alert, Box, Typography, Button } from '@mui/material';
import { MasterDataContext } from './MasterDataContext';
import { useAuth } from '../hooks/useAuth';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { sincronizzaConFirebase } from '@/services/offlineSync';

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

function rehydrateTimestamp(ts: any): Timestamp | undefined {
    if (!ts) return undefined;
    if (ts instanceof Timestamp) return ts;
    if (typeof ts === 'object' && typeof ts.seconds === 'number' && typeof ts.nanoseconds === 'number') {
        return new Timestamp(ts.seconds, ts.nanoseconds);
    }
    return undefined;
}

async function fetchAndCacheCollection(collectionName: keyof Omit<MasterData, 'impostazioni'>) {
    const querySnapshot = await getDocs(collection(firestoreDb, collectionName));
    const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    await db.anagrafiche.put({ id: collectionName, data, timestamp: new Date() });
    return data;
}

async function loadDataFromCache(): Promise<MasterData | null> {
    const localAnagrafiche = await db.anagrafiche.toArray();
    if (localAnagrafiche.length < ANAGRAFICA_COLLECTIONS.length) return null;
    
    const data: { [key: string]: any[] } = {};
    localAnagrafiche.forEach(item => { data[item.id] = item.data; });
    
    let impostazioni = await db.tariffe_locali.get('main');
    if (!impostazioni) {
        const newImpostazioni = await createDefaultImpostazioni(data.tipiGiornata || []);
        return { ...data, impostazioni: newImpostazioni } as MasterData;
    }
    return { ...data, impostazioni: impostazioni.data } as MasterData;
}

async function createDefaultImpostazioni(tipiGiornataDaDB: TipoGiornata[]): Promise<Impostazioni> {
    const blueprintMapByName = new Map(TARIFFS_BLUEPRINT.map(t => [t.nome.toLowerCase(), t]));
    const finalTariffe: TariffaLocale[] = tipiGiornataDaDB.map((tipoGiornata) => {
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
    return finalImpostazioni;
}

export const MasterDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [masterData, setMasterData] = useState<MasterData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<any | null>(null);
    const { user, loading: authLoading } = useAuth();
    const isOnline = useOnlineStatus();

    useEffect(() => {
        if (isOnline && user) {
            sincronizzaConFirebase().catch(err => {
                console.error("SYNC_TRIGGER: Errore durante l'avvio della sincronizzazione offline.", err);
            });
        }
    }, [isOnline, user?.uid]);

    const initializeAndSync = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const cachedData = await loadDataFromCache();
            
            if (cachedData) {
                setMasterData(cachedData);
                setLoading(false);
                console.log("PROVIDER: Dati caricati dalla cache locale. Avvio normale.");
                
                if (isOnline) {
                    const manifestRef = doc(firestoreDb, 'versioning', 'sync_manifest');
                    const unsubscribe = onSnapshot(manifestRef, async (snapshot) => {
                        if (!snapshot.exists()) return;
                        const remoteManifest = snapshot.data() as SyncManifest;
                        const localManifest = (await db.sync_manifest.get('main'))?.data || {};
                        
                        const collectionsToUpdate = ANAGRAFICA_COLLECTIONS.filter(key => {
                            const remoteTimestamp = rehydrateTimestamp(remoteManifest[key]);
                            const localTimestamp = rehydrateTimestamp(localManifest[key]);
                            return remoteTimestamp && (!localTimestamp || remoteTimestamp.toMillis() > localTimestamp.toMillis());
                        });
                        
                        if (collectionsToUpdate.length > 0) {
                            console.log(`SYNC: Rilevate modifiche per: ${collectionsToUpdate.join(', ')}.`);
                            // ... (logica di aggiornamento delta)
                        }
                    }, (syncError) => {
                        console.error("SYNC_ERROR: Errore nell'ascolto del manifest.", syncError);
                    });
                    return () => unsubscribe();
                }
            } else {
                console.log("CACHE VUOTA RILEVATA: Avvio Ricostruzione Totale.");
                if (isOnline) {
                    const fetchedDataArray = await Promise.all(
                        ANAGRAFICA_COLLECTIONS.map(key => fetchAndCacheCollection(key))
                    );

                    const newData = {} as Partial<MasterData>;
                    ANAGRAFICA_COLLECTIONS.forEach((key, index) => {
                        (newData as any)[key] = fetchedDataArray[index];
                    });

                    const tipiGiornata = newData.tipiGiornata as TipoGiornata[];
                    if(tipiGiornata) {
                        newData.impostazioni = await createDefaultImpostazioni(tipiGiornata);
                    }

                    setMasterData(newData as MasterData);
                    console.log("RICOSTRUZIONE: Database locale ripopolato con successo.");
                } else {
                    setError(new Error("Database vuoto e connessione assente. Impossibile avviare."));
                }
                setLoading(false);
            }
        } catch (e) {
            console.error("PROVIDER: Errore critico durante l'inizializzazione.", e);
            setError(e);
            setLoading(false);
        }
    }, [isOnline]);
    
    useEffect(() => {
        let unsubscribe: (() => void) | undefined;
        if (!authLoading && user) {
            initializeAndSync().then(unsub => { if (unsub) unsubscribe = unsub; });
        } else if (!authLoading && !user) {
            setMasterData(null); 
            setLoading(false);
        }
        return () => { if (unsubscribe) unsubscribe(); };
    }, [authLoading, user, initializeAndSync]);

    const contextValue = useMemo(() => ({
        masterData, 
        loading: authLoading || loading,
        error,
        refetchData: initializeAndSync,
    }), [masterData, authLoading, loading, error, initializeAndSync]);

    if (authLoading || (loading && !masterData)) {
        return <FullScreenLoader />;
    }
    
    if (error) {
        return (
            <Box sx={{ p: 4, m: 2, border: '1px solid red', borderRadius: 2 }}>
                <Alert severity="error"><Typography variant="h6">Errore Critico</Typography></Alert>
                <Typography>{error.message || "Impossibile caricare i dati essenziali."}</Typography>
                <Button variant="contained" color="error" onClick={() => window.location.reload()} sx={{ mt: 2 }}>Ricarica l'app</Button>
            </Box>
        );
    }
    
    return (
        <MasterDataContext.Provider value={contextValue}>
            {children}
        </MasterDataContext.Provider>
    );
};
