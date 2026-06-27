import React, { useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { collection, getDocs, doc, onSnapshot, Timestamp, query, where } from 'firebase/firestore';
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

    const refetchData = useCallback(async () => {
        if (!isOnline) {
            console.warn("Impossibile forzare l'aggiornamento, sei offline.");
            return;
        }
        setLoading(true);
        setError(null);
        try {
            console.log("PROVIDER: Forzo ricostruzione totale anagrafiche da Firestore.");
            const fetchedDataArray = await Promise.all(ANAGRAFICA_COLLECTIONS.map(fetchAndCacheCollection));
            const newData = {} as Partial<MasterData>;
            ANAGRAFICA_COLLECTIONS.forEach((key, index) => { (newData as any)[key] = fetchedDataArray[index]; });
            const tipiGiornata = newData.tipiGiornata as TipoGiornata[];
            if(tipiGiornata) {
                newData.impostazioni = await createDefaultImpostazioni(tipiGiornata);
            }
            setMasterData(newData as MasterData);
        } catch (e) {
            setError(e);
        } finally {
            setLoading(false);
        }
    }, [isOnline]);

    // useEffect #1: Gestisce il caricamento iniziale dei dati.
    useEffect(() => {
        if (authLoading) return; // Attendi la fine del caricamento dell'autenticazione

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
                } else {
                    // Utente non loggato, resetta lo stato
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
    }, [authLoading, user, isOnline]); // Dipendenze stabili e controllate

    // useEffect #2: Gestisce la sincronizzazione continua e INCREMENTALE delle anagrafiche (solo online)
    useEffect(() => {
        if (!isOnline || !user) return;

        console.log("SYNC_ANAGRAFICHE: Inizializzazione listener per sync incrementale...");
        const manifestRef = doc(firestoreDb, 'versioning', 'sync_manifest');
        
        const unsubscribe = onSnapshot(manifestRef, async (snapshot) => {
            if (!snapshot.exists()) {
                console.warn("SYNC_ANAGRAFICHE: Documento manifest non trovato.");
                return;
            }
            
            const remoteManifest = snapshot.data() as SyncManifest;
            const localManifestSync = await db.sync_manifest.get('main');
            const localManifest = localManifestSync?.data || {};

            const collectionsToUpdate = ANAGRAFICA_COLLECTIONS.filter(key => {
                const remoteTimestamp = rehydrateTimestamp(remoteManifest[key]);
                const localTimestamp = rehydrateTimestamp(localManifest[key]);
                return remoteTimestamp && (!localTimestamp || remoteTimestamp.toMillis() > localTimestamp.toMillis());
            });

            if (collectionsToUpdate.length > 0) {
                console.log(`SYNC_ANAGRAFICHE (INCREMENTALE): Rilevate modifiche per: ${collectionsToUpdate.join(', ')}. Avvio aggiornamento...`);
                try {
                    setLoading(true);
                    let somethingChangedInCache = false;

                    for (const collectionName of collectionsToUpdate) {
                        const localTimestamp = rehydrateTimestamp(localManifest[collectionName]);
                        
                        // Se non c'è un timestamp locale, è più sicuro fare un fetch completo per questa collezione.
                        if (!localTimestamp) {
                            console.log(`-> ${collectionName}: Nessun timestamp locale, eseguo fetch completo.`);
                            await fetchAndCacheCollection(collectionName as any);
                            somethingChangedInCache = true;
                            continue;
                        }

                        // Altrimenti, procedi con la query incrementale
                        console.log(`-> ${collectionName}: Cerco modifiche dopo ${localTimestamp.toDate().toISOString()}`);
                        const q = query(collection(firestoreDb, collectionName), where("updatedAt", ">", localTimestamp));
                        const deltaSnapshot = await getDocs(q);

                        if (deltaSnapshot.empty) {
                            console.log(`-> ${collectionName}: Nessuna modifica remota trovata.`);
                            continue;
                        }

                        console.log(`-> ${collectionName}: Trovati ${deltaSnapshot.size} aggiornamenti.`);
                        somethingChangedInCache = true;
                        
                        const deltaDocs = deltaSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                        const existingCollection = await db.anagrafiche.get(collectionName);
                        const dataMap = new Map(existingCollection?.data.map((item: any) => [item.id, item]) || []);
                        deltaDocs.forEach((item: any) => dataMap.set(item.id, item));
                        
                        await db.anagrafiche.put({ 
                            id: collectionName, 
                            data: Array.from(dataMap.values()),
                            timestamp: new Date()
                        });
                    }

                    // Se qualcosa è cambiato, aggiorna il manifest locale e ricarica i dati nello stato.
                    if (somethingChangedInCache) {
                        const newLocalManifest = { ...localManifest };
                        collectionsToUpdate.forEach(key => {
                            newLocalManifest[key] = remoteManifest[key];
                        });
                        await db.sync_manifest.put({ id: 'main', data: newLocalManifest });

                        const updatedData = await loadDataFromCache();
                        if (updatedData) setMasterData(updatedData);
                        console.log("SYNC_ANAGRAFICHE (INCREMENTALE): Cache e stato aggiornati con successo.");
                    } else {
                        // Anche se non ci sono documenti delta, aggiorniamo il manifest
                        // per evitare di ri-controllare inutilmente al prossimo snapshot.
                        const newLocalManifest = { ...localManifest };
                        collectionsToUpdate.forEach(key => {
                            newLocalManifest[key] = remoteManifest[key];
                        });
                        await db.sync_manifest.put({ id: 'main', data: newLocalManifest });
                        console.log("SYNC_ANAGRAFICHE (INCREMENTALE): Manifesto aggiornato, nessuna modifica ai dati.");
                    }

                } catch (syncError) {
                    console.error("SYNC_ANAGRAFICHE (INCREMENTALE): Errore durante l'aggiornamento.", syncError);
                    setError(syncError);
                } finally {
                    setLoading(false);
                }
            }
        }, (error) => {
            console.error("SYNC_ANAGRAFICHE: Errore critico nel listener del manifest.", error);
            setError(error);
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
        refetchData: refetchData,
    }), [masterData, authLoading, loading, error, refetchData]);

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
