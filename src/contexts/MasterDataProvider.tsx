
/**
 * @file MasterDataProvider.tsx
 * @description Provider per i dati master con caching automatico basato su versione (Sync Manifest).
 *
 * ARCHITETTURA SYNC MANIFEST:
 * 1. CONTROLLO VERSIONE: All'avvio, il provider legge un documento 'config/app_state' in Firestore
 *    per ottenere la versione corrente delle anagrafiche (`anagrafiche_version`).
 * 2. CONFRONTO CON CACHE LOCALE: Confronta la versione remota con quella salvata nel localStorage.
 * 3. EFFICIENZA MASSIMA: Se le versioni coincidono, i dati locali sono validi e l'app si avvia
 *    istantaneamente senza scaricare nulla. Questo riduce le letture al minimo indispensabile (1 sola).
 * 4. AGGIORNAMENTO AUTOMATICO: Se le versioni differiscono, il provider scarica tutte le anagrafiche,
 *    le salva nel localStorage con la nuova versione e poi si avvia.
 * 5. ROBUSTEZZA: Se il manifest non esiste, viene creato automaticamente con una versione di default.
 * 6. REFETCH: La funzione `refetch` forza una nuova verifica della versione.
 */
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { collection, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/utils/firebase';
import { useAuth } from '@/hooks/useAuth';
import { Tecnico, Cliente, Sede, TipoGiornata, Veicolo, Luogo, Nave, MasterData, Ditta, Categoria } from '@/models/definitions';

const CACHE_KEY = 'masterDataCache';
const SYNC_MANIFEST_PATH = 'config/app_state';

interface CachedData {
    version: number;
    data: MasterData;
}

interface MasterDataContextValue {
    masterData: MasterData | null;
    loading: boolean;
    error: Error | null;
    refetch: () => void;
}

const MasterDataContext = createContext<MasterDataContextValue | undefined>(undefined);

export const useMasterData = () => {
    const context = useContext(MasterDataContext);
    if (!context) {
        throw new Error("useMasterData deve essere utilizzato all'interno di un MasterDataProvider");
    }
    return context;
};

interface MasterDataProviderProps {
    children: ReactNode;
}

export const MasterDataProvider: React.FC<MasterDataProviderProps> = ({ children }) => {
    const { user } = useAuth();
    const [masterData, setMasterData] = useState<MasterData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);
    const [fetchTrigger, setFetchTrigger] = useState<number>(0);

    const fetchMasterDataFromFirestore = useCallback(async (): Promise<MasterData> => {
        const fetchCollection = async <T,>(collectionName: string): Promise<T[]> => {
            const querySnapshot = await getDocs(collection(db, collectionName));
            return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
        };

        const [
            tecnici,
            clienti,
            sedi,
            tipiGiornata,
            veicoli,
            luoghi,
            navi,
            ditte,
            categorie
        ] = await Promise.all([
            fetchCollection<Tecnico>('tecnici'),
            fetchCollection<Cliente>('clienti'),
            fetchCollection<Sede>('sedi'),
            fetchCollection<TipoGiornata>('tipiGiornata'),
            fetchCollection<Veicolo>('veicoli'),
            fetchCollection<Luogo>('luoghi'),
            fetchCollection<Nave>('navi'),
            fetchCollection<Ditta>('ditte'),
            fetchCollection<Categoria>('categorie'),
        ]);

        return {
            tecnici,
            clienti,
            sedi,
            tipiGiornata,
            veicoli,
            luoghi,
            navi,
            ditte,
            categorie,
        };
    }, []);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            setMasterData(null);
            localStorage.removeItem(CACHE_KEY);
            return;
        }

        const syncAndLoadData = async () => {
            setLoading(true);
            setError(null);

            try {
                // 1. Leggi o crea il Sync Manifest
                const manifestDocRef = doc(db, SYNC_MANIFEST_PATH);
                const manifestSnap = await getDoc(manifestDocRef);
                let remoteVersion: number;

                if (!manifestSnap.exists() || !manifestSnap.data()?.anagrafiche_version) {
                    console.warn(`[Sync] Manifest non trovato o corrotto in '${SYNC_MANIFEST_PATH}'. Verrà creato con v1.`);
                    remoteVersion = 1; // Versione di fallback
                    try {
                        await setDoc(manifestDocRef, { anagrafiche_version: remoteVersion, createdAt: new Date() });
                        console.log(`[Sync] Nuovo manifest creato con successo in '${SYNC_MANIFEST_PATH}'.`);
                    } catch (creationError) {
                         console.error(`[Sync] Errore critico durante la creazione del manifest in '${SYNC_MANIFEST_PATH}'.`, creationError);
                         throw new Error(`Impossibile creare il Sync Manifest. Causa: ${creationError.message}`);
                    }
                } else {
                    remoteVersion = manifestSnap.data().anagrafiche_version as number;
                }

                // 2. Leggi la versione locale dal cache
                let localVersion: number | null = null;
                let cachedData: MasterData | null = null;
                const cachedItem = localStorage.getItem(CACHE_KEY);
                if (cachedItem) {
                    try {
                        const parsedCache = JSON.parse(cachedItem) as CachedData;
                        localVersion = parsedCache.version;
                        cachedData = parsedCache.data;
                    } catch (e) {
                        console.warn("[Cache] Cache locale corrotto. Verrà forzato l'aggiornamento.");
                        localStorage.removeItem(CACHE_KEY); // Rimuovi cache corrotta
                    }
                }

                // 3. Confronta le versioni e decidi se aggiornare
                if (localVersion === remoteVersion && cachedData) {
                    console.log(`[Sync] Anagrafiche v${localVersion} valide. Caricamento da cache.`);
                    setMasterData(cachedData);
                } else {
                    console.log(`[Sync] Versione cache non valida (locale: v${localVersion}, remota: v${remoteVersion}). Scarico da Firestore.`);
                    const freshData = await fetchMasterDataFromFirestore();
                    setMasterData(freshData);

                    // 4. Aggiorna la cache locale con i nuovi dati e la nuova versione
                    const newCachePayload: CachedData = { version: remoteVersion, data: freshData };
                    localStorage.setItem(CACHE_KEY, JSON.stringify(newCachePayload));
                    console.log(`[Sync] Cache aggiornata alla v${remoteVersion}.`);
                }

            } catch (err) {
                console.error("MasterDataProvider: Errore durante il processo di sincronizzazione.", err);
                setError(err instanceof Error ? err : new Error('Errore sconosciuto nel recupero dati'));
            } finally {
                setLoading(false);
            }
        };

        syncAndLoadData();

    }, [user, fetchTrigger, fetchMasterDataFromFirestore]);

    const refetch = useCallback(() => {
        console.log("[Sync] Richiesta di riverifica della versione anagrafiche.");
        setFetchTrigger(prev => prev + 1);
    }, []);

    const value = { masterData, loading, error, refetch };

    return (
        <MasterDataContext.Provider value={value}>
            {children}
        </MasterDataContext.Provider>
    );
};
