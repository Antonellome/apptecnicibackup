import React, { useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { collection, getDocs, doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { db as firestoreDb } from '@/firebase';
import type { MasterData, Impostazioni, TipoGiornata, TariffaLocale, SyncManifest } from '@/models/definitions';
import { db } from '@/db/local-db';
import FullScreenLoader from '@/components/FullScreenLoader';
import { Alert, Box, Typography, Button } from '@mui/material';
import { MasterDataContext } from '../contexts/MasterDataContext';
import { useAuth } from '../hooks/useAuth';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { sincronizzaTutto } from '@/services/offlineSync';

const ANAGRAFICA_COLLECTIONS: (keyof Omit<MasterData, 'impostazioni'>)[] = [
    'tecnici', 'tipiGiornata', 'veicoli', 'navi', 'luoghi', 'clienti', 'sedi', 'ditte', 'categorie'
];

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
    
    const impostazioni = await db.tariffe_locali.get('main');
    if (!impostazioni) {
        const newImpostazioni = await createDefaultImpostazioni(data.tipiGiornata || []);
        return { ...data, impostazioni: newImpostazioni } as MasterData;
    }
    return { ...data, impostazioni: impostazioni.data } as MasterData;
}

async function createDefaultImpostazioni(tipiGiornataDaDB: TipoGiornata[]): Promise<Impostazioni> {
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

function rehydrateTimestamp(ts: any): Timestamp | undefined {
    if (!ts) return undefined;
    if (ts instanceof Timestamp) return ts;
    if (typeof ts === 'object' && typeof ts.seconds === 'number' && typeof ts.nanoseconds === 'number') {
        return new Timestamp(ts.seconds, ts.nanoseconds);
    }
    return undefined;
}

export const MasterDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [masterData, setMasterData] = useState<MasterData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<any | null>(null);
    const { user, userProfile, loading: authLoading } = useAuth();
    const isOnline = useOnlineStatus();

    const loadInitialData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const cachedData = await loadDataFromCache();
            if (cachedData) {
                setMasterData(cachedData);
                console.log("PROVIDER: Dati anagrafici caricati dalla cache locale.");
            } else if (isOnline) {
                console.log("PROVIDER: Cache anagrafiche vuota. Avvio ricostruzione totale da Firestore.");
                const fetchedDataArray = await Promise.all(ANAGRAFICA_COLLECTIONS.map(fetchAndCacheCollection));
                const newData = {} as Partial<MasterData>;
                ANAGRAFICA_COLLECTIONS.forEach((key, index) => { (newData as any)[key] = fetchedDataArray[index]; });
                const tipiGiornata = newData.tipiGiornata as TipoGiornata[];
                if(tipiGiornata) {
                    newData.impostazioni = await createDefaultImpostazioni(tipiGiornata);
                }
                setMasterData(newData as MasterData);
                console.log("PROVIDER: Ricostruzione anagrafiche completata.");
            } else {
                console.warn("MODALITÀ DEGRADATA: Cache vuota e offline. Avvio con dati minimi.");
                const emptyData: Partial<MasterData> = {};
                ANAGRAFICA_COLLECTIONS.forEach(key => { (emptyData as any)[key] = []; });
                emptyData.impostazioni = await createDefaultImpostazioni([]);
                setMasterData(emptyData as MasterData);
            }
        } catch (e) {
            console.error("PROVIDER: Errore critico durante l'inizializzazione.", e);
            setError(e);
        } finally {
            setLoading(false);
        }
    }, [isOnline]); // Dipendenza solo da isOnline per decidere se fare il fetch

    // useEffect #1: Gestisce il caricamento iniziale dei dati
    useEffect(() => {
        if (!authLoading && user) {
            loadInitialData();
        } else if (!authLoading && !user) {
            setMasterData(null);
            setLoading(true); // Resetta lo stato di caricamento per il prossimo login
        }
    }, [authLoading, user, loadInitialData]);

    // useEffect #2: Gestisce la sincronizzazione continua delle anagrafiche (solo online)
    useEffect(() => {
        if (!isOnline || !user) return;

        console.log("SYNC_ANAGRAFICHE: Inizializzazione listener...");
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
                console.log(`SYNC_ANAGRAFICHE: Rilevate modifiche per: ${collectionsToUpdate.join(', ')}. Aggiorno...`);
                try {
                    await Promise.all(collectionsToUpdate.map(fetchAndCacheCollection));
                    const updatedData = await loadDataFromCache(); // Ricarica tutto dalla cache per consistenza
                    if (updatedData) setMasterData(updatedData);
                    console.log("SYNC_ANAGRAFICHE: Aggiornamento completato.");
                } catch (syncError) {
                    console.error("SYNC_ANAGRAFICHE: Errore durante l'aggiornamento.", syncError);
                }
            }
        }, (error) => {
            console.error("SYNC_ANAGRAFICHE: Errore nel listener del manifest.", error);
        });

        return () => {
            console.log("SYNC_ANAGRAFICHE: Pulizia listener.");
            unsubscribe();
        };
    }, [isOnline, user]); // Si attiva/disattiva con lo stato online e utente

    // useEffect #3: Gestisce la sincronizzazione bidirezionale dei rapportini (solo online)
     useEffect(() => {
        if (isOnline && user?.uid && userProfile?.tecnicoId) {
            console.log("SYNC_RAPPORTINI: Avvio sincronizzazione bidirezionale...");
            sincronizzaTutto(userProfile.tecnicoId).catch(err => {
                console.error("SYNC_RAPPORTINI: Errore critico durante la sincronizzazione.", err);
            });
        }
    }, [isOnline, user?.uid, userProfile?.tecnicoId]);

    const contextValue = useMemo(() => ({
        masterData, 
        loading: authLoading || loading,
        error,
        refetchData: loadInitialData,
    }), [masterData, authLoading, loading, error, loadInitialData]);

    if (authLoading || (loading && !masterData)) {
        return <FullScreenLoader />;
    }
    
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
