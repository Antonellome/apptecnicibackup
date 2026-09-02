
import React, { useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { collection, getDocs, doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { db as firestoreDb } from '@/utils/firebase';
import type { MasterData, Impostazioni, TipoGiornata, TariffaLocale, SyncManifest } from '@/models/definitions';
import { db } from '@/db/local-db';
import FullScreenLoader from '@/components/FullScreenLoader';
import { Alert, Box, Typography, Button } from '@mui/material';
import { MasterDataContext } from '../contexts/MasterDataContext';
import { useAuth } from '../hooks/useAuth';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

const ANAGRAFICA_COLLECTIONS: (keyof Omit<MasterData, 'impostazioni'>)[] = [
    'tecnici', 'tipiGiornata', 'veicoli', 'navi', 'luoghi', 'clienti', 'sedi', 'ditte', 'categorie', 'lavorazioni', 'sistemi'
];

async function fetchAndCacheCollection(collectionName: keyof Omit<MasterData, 'impostazioni'>) {
    console.log(`FETCH_AND_CACHE: Sostituzione completa per la collezione '${collectionName}'.`);
    const querySnapshot = await getDocs(collection(firestoreDb, collectionName));
    const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    await db.anagrafiche.put({ id: collectionName, data, timestamp: new Date() });
    return data;
}

async function loadDataFromCache(): Promise<MasterData | null> {
    const localAnagrafiche = await db.anagrafiche.toArray();
    if (localAnagrafiche.length === 0) return null;
    
    const data: { [key: string]: any[] } = {};
    localAnagrafiche.forEach(item => { data[item.id] = item.data; });
    
    const impostazioni = await db.tariffe_locali.get('main');
    if (!impostazioni) {
        const newImpostazioni = await createDefaultImpostazioni(data.tipiGiornata || []);
        return { ...data, impostazioni: newImpostazioni } as MasterData;
    }
    return { ...data, impostazioni: impostazioni.data } as MasterData;
}

async function createDefaultImpostazioni(tipiGiornataDaDB: TipoGiornata[]): Promise<Impostazioni> {
    const TARIFFS_BLUEPRINT: { nome: string; costo: number; unita: 'g' | 'h'; }[] = [
        { nome: 'Ferie', costo: 80, unita: 'g' }, { nome: 'Festivo', costo: 80, unita: 'g' },
        { nome: 'Legge 104', costo: 10, unita: 'h' }, { nome: 'Malattia', costo: 80, unita: 'g' },
        { nome: 'Ordinaria', costo: 10, unita: 'h' }, { nome: 'Permesso', costo: 10, unita: 'h' },
        { nome: 'Straordinario', costo: 15, unita: 'h' }, { nome: 'Trasferta Europa', costo: 40, unita: 'g' },
        { nome: 'Trasferta Extraeuropea', costo: 80, unita: 'g' }, { nome: 'Trasferta Italia', costo: 20, unita: 'g' },
    ];
    const blueprintMapByName = new Map(TARIFFS_BLUEPRINT.map(t => [t.nome.toLowerCase(), t]));
    const finalTariffe: TariffaLocale[] = tipiGiornataDaDB.map((tipoGiornata) => {
        const lookupName = tipoGiornata.nome?.toLowerCase() || '';
        const blueprintDefault = blueprintMapByName.get(lookupName) || blueprintMapByName.get(lookupName === '104' ? 'legge 104' : '');
        return {
            id: tipoGiornata.id,
            tipoGiornataId: tipoGiornata.id,
            nome: tipoGiornata.nome,
            costo: blueprintDefault?.costo ?? 0,
            tariffa: blueprintDefault?.costo ?? 0,
            unita: blueprintDefault?.unita ?? 'h',
        };
    });
    const finalImpostazioni: Impostazioni = { id: 'main', tariffe: finalTariffe };
    await db.tariffe_locali.put({ id: 'main', data: finalImpostazioni, timestamp: new Date() });
    return finalImpostazioni;
}

function rehydrateTimestamp(ts: any): Timestamp | undefined {
    if (!ts) return undefined;
    if (ts instanceof Timestamp) return ts;
    if (typeof ts === 'object' && typeof ts.seconds === 'number') {
        return new Timestamp(ts.seconds, ts.nanoseconds);
    }
    return undefined;
}

export const MasterDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [masterData, setMasterData] = useState<MasterData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<any | null>(null);
    const { user, loading: authLoading } = useAuth();
    const isOnline = useOnlineStatus();

    const updateTariffe = useCallback(async (nuoveTariffe: TariffaLocale[]) => {
        if (!masterData) return;
        const nuoveImpostazioni: Impostazioni = { ...masterData.impostazioni, tariffe: nuoveTariffe };
        await db.tariffe_locali.put({ id: 'main', data: nuoveImpostazioni, timestamp: new Date() });
        setMasterData(prev => prev ? { ...prev, impostazioni: nuoveImpostazioni } : null);
    }, [masterData]);

    useEffect(() => {
        db.syncState.put({ id: 'isOnline', value: isOnline ? 1 : 0 });
        console.log(`ONLINE_STATUS_PROVIDER: Stato connessione aggiornato a: ${isOnline ? 'Online' : 'Offline'}`)
    }, [isOnline]);

    const refetchData = useCallback(async () => {
        if (!isOnline) { console.warn("Impossibile forzare l'aggiornamento, sei offline."); return; }
        setLoading(true); setError(null);
        try {
            console.log("PROVIDER: Forzo ricostruzione totale anagrafiche da Firestore.");
            const collectionsToUpdate = ANAGRAFICA_COLLECTIONS.filter(name => name !== 'tecnici');
            await Promise.all(collectionsToUpdate.map(fetchAndCacheCollection));
            const reloadedData = await loadDataFromCache();
            if(reloadedData) setMasterData(reloadedData);
        } catch (e) { setError(e); } finally { setLoading(false); }
    }, [isOnline]);

    useEffect(() => {
        if (authLoading) return;

        const loadInitialData = async () => {
            setLoading(true);
            setError(null);

            try {
                if (user) {
                    const cachedData = await loadDataFromCache();
                    if (cachedData) {
                        setMasterData(cachedData);
                        console.log("PROVIDER: Dati anagrafici caricati dalla cache locale.");
                    } else if (isOnline) {
                        console.log("PROVIDER: Cache anagrafiche vuota o incompleta. Avvio ricostruzione totale da Firestore.");
                        await refetchData();
                    } else {
                        console.warn("MODALITÀ DEGRADATA: Cache vuota e offline. Impossibile avviare.");
                        setError(new Error("Sei offline e i dati iniziali non sono disponibili. Connettiti a internet per il primo avvio."));
                    }
                } else {
                    setMasterData(null);
                }
            } catch (e) {
                console.error("PROVIDER: Errore critico durante l'inizializzazione.", e);
                setError(e);
            } finally {
                setLoading(false);
            }
        };

        loadInitialData();
    }, [authLoading, user, isOnline, refetchData]);

    useEffect(() => {
        if (!isOnline || !user) return;

        console.log("SYNC_ANAGRAFICHE: Inizializzazione listener per sync basato su manifest...");
        const manifestRef = doc(firestoreDb, 'versioning', 'sync_manifest');
        
        const unsubscribe = onSnapshot(manifestRef, async (snapshot) => {
            if (!snapshot.exists()) { console.warn("SYNC_ANAGRAFICHE: Documento manifest non trovato."); return; }
            
            const remoteManifest = snapshot.data() as SyncManifest;
            const localManifestSync = await db.sync_manifest.get('main');
            const localManifest = localManifestSync?.data || {};

            const collectionsToUpdate = ANAGRAFICA_COLLECTIONS.filter(key => {
                const remoteTimestamp = rehydrateTimestamp(remoteManifest[key]);
                const localTimestamp = rehydrateTimestamp(localManifest[key]);
                return remoteTimestamp && (!localTimestamp || remoteTimestamp.toMillis() > localTimestamp.toMillis());
            });

            if (collectionsToUpdate.length > 0) {
                console.log(`SYNC_ANAGRAFICHE: Rilevate modifiche per: ${collectionsToUpdate.join(', ')}. Avvio sostituzione completa...`);
                try {
                    setLoading(true);

                    await Promise.all(collectionsToUpdate.map(collectionName => fetchAndCacheCollection(collectionName as any)));

                    const newLocalManifest = { ...localManifest };
                    collectionsToUpdate.forEach(key => { newLocalManifest[key] = remoteManifest[key]; });
                    await db.sync_manifest.put({ id: 'main', data: newLocalManifest });

                    const updatedData = await loadDataFromCache();
                    if (updatedData) setMasterData(updatedData);
                    
                    console.log("SYNC_ANAGRAFICHE: Cache e stato aggiornati con successo.");

                } catch (syncError) {
                    console.error("SYNC_ANAGRAFICHE: Errore durante l'aggiornamento.", syncError);
                    setError(syncError);
                } finally {
                    setLoading(false);
                }
            } else {
                 console.log("SYNC_ANAGRAFICHE: Nessuna modifica rilevata nel manifest.");
                 // *** CORREZIONE PER RACE CONDITION ***
                 setLoading(false);
            }
        }, (error) => {
            console.error("SYNC_ANAGRAFICHE: Errore critico nel listener del manifest.", error);
            setError(error);
        });

        return () => {
            console.log("SYNC_ANAGRAFICHE: Pulizia listener.");
            unsubscribe();
        };
    }, [isOnline, user]);

    const contextValue = useMemo(() => ({
        masterData, 
        loading: authLoading || loading,
        error,
        refetchData: refetchData,
        updateTariffe: updateTariffe,
    }), [masterData, authLoading, loading, error, refetchData, updateTariffe]);

    if (authLoading || loading) return <FullScreenLoader />;
    
    if (error) {
        return (
            <Box sx={{ p: 4, m: 2, border: '1px solid red', borderRadius: 2 }}>
                <Alert severity="error"><Typography variant="h6">Errore Critico</Typography></Alert>
                <Typography>{error.message || "Impossibile caricare i dati essenziali."}</Typography>
                <Button variant="contained" color="error" onClick={() => window.location.reload()} sx={{ mt: 2 }}>Ricarica l&apos;app</Button>
            </Box>
        );
    }
    
    return (
        <MasterDataContext.Provider value={contextValue}>
            {children}
        </MasterDataContext.Provider>
    );
};
