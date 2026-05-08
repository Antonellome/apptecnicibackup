import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { Tecnico, TipoGiornata, Veicolo, Nave, Luogo, Cliente, Impostazioni, Tariffa } from '@/models/definitions';
import { localDB } from '@/db/local-db';
import FullScreenLoader from '@/components/FullScreenLoader';
import { Alert, Box } from '@mui/material';

// --- STRUTTURE DATI ---
interface MasterData {
    tecnici: Tecnico[];
    tipiGiornata: TipoGiornata[];
    veicoli: Veicolo[];
    navi: Nave[];
    luoghi: Luogo[];
    clienti: Cliente[];
    impostazioni: Impostazioni; // Non può più essere null, avrà sempre un valore
}

interface MasterDataContextType {
    masterData: MasterData | null;
    loading: boolean;
    error: string | null;
    refetchData: (forceRemote: boolean) => Promise<void>;
}

export const MasterDataContext = createContext<MasterDataContextType | undefined>(undefined);

const ANAGRAFICA_COLLECTIONS: (keyof Omit<MasterData, 'impostazioni'>)[] = [
    'tecnici', 'tipiGiornata', 'veicoli', 'navi', 'luoghi', 'clienti'
];
const CACHE_EXPIRATION_MS = 24 * 60 * 60 * 1000; // 24 ore

// --- LOGICA DI FALLBACK ---
/**
 * Crea una configurazione di emergenza se nient'altro è disponibile.
 * Si basa sui tipi di giornata caricati per creare una struttura di tariffe valida.
 */
const generateDefaultImpostazioni = (tipiGiornata: TipoGiornata[]): Impostazioni => {
    console.warn("ATTENZIONE: Creazione di impostazioni di default hard-coded. Questo dovrebbe accadere solo al primo avvio in assoluto.");
    
    const tariffe: Tariffa[] = tipiGiornata.map(tg => {
        const nomeLower = tg.nome.toLowerCase();
        const isGiornaliero = nomeLower.includes('ferie') || nomeLower.includes('malattia') || nomeLower.includes('trasferta');
        const isStraordinario = nomeLower.includes('straordinario');
        const isFestivo = nomeLower.includes('festivo');
        
        let costo = 10; // Default orario
        if (isStraordinario) costo = 15;
        if (isFestivo) costo = 20;
        if (isGiornaliero) costo = 0; // Ferie e Malattia hanno costo 0
        if (nomeLower.includes('trasferta italia')) costo = 20;
        if (nomeLower.includes('trasferta europa')) costo = 50;
        if (nomeLower.includes('trasferta extraeuropea')) costo = 80;


        return {
            tipoGiornataId: tg.id,
            nome: tg.nome,
            costo: costo,
            unita: isGiornaliero ? 'giorno' : 'ora'
        };
    });

    return {
        costoTrasferta: { costo: 20, unita: 'giorno' },
        tariffe: tariffe
    };
};


// --- COMPONENTE PROVIDER ---
export const MasterDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [masterData, setMasterData] = useState<MasterData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAndCacheData = useCallback(async (forceRemote: boolean = false) => {
        setLoading(true);
        setError(null);
        
        try {
            const loadedAnagrafiche: { [key: string]: any[] } = {};

            // 1. CARICAMENTO ANAGRAFICHE (CACHE-FIRST)
            for (const key of ANAGRAFICA_COLLECTIONS) {
                const cached = await localDB.anagrafiche.get(key);
                if (!forceRemote && cached && (new Date().getTime() - cached.timestamp.getTime() < CACHE_EXPIRATION_MS)) {
                    loadedAnagrafiche[key] = cached.data;
                } else {
                    const querySnapshot = await getDocs(collection(db, key));
                    const items = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    loadedAnagrafiche[key] = items;
                    await localDB.anagrafiche.put({ id: key, data: items, timestamp: new Date() });
                }
            }

            // 2. CARICAMENTO IMPOSTAZIONI (CON FALLBACK)
            let finalImpostazioni: Impostazioni | null = null;
            const cachedImpostazioni = await localDB.tariffe_locali.get('main');

            if (cachedImpostazioni) {
                finalImpostazioni = cachedImpostazioni.data;
            } else {
                const impostazioniDoc = await getDoc(doc(db, 'impostazioni', 'main'));
                if (impostazioniDoc.exists()) {
                    finalImpostazioni = impostazioniDoc.data() as Impostazioni;
                    await localDB.tariffe_locali.put({ id: 'main', data: finalImpostazioni, timestamp: new Date() });
                } else {
                    // FALLBACK DEFINITIVO: Genera le impostazioni di default
                    finalImpostazioni = generateDefaultImpostazioni(loadedAnagrafiche.tipiGiornata as TipoGiornata[]);
                    await localDB.tariffe_locali.put({ id: 'main', data: finalImpostazioni, timestamp: new Date() });
                }
            }

            setMasterData({
                ...loadedAnagrafiche,
                impostazioni: finalImpostazioni,
            } as MasterData);

        } catch (err) {
            console.error("Errore critico durante il caricamento dei dati master:", err);
            setError("Impossibile caricare i dati essenziali per l'applicazione.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAndCacheData(false);
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

export const useMasterData = (): MasterDataContextType => {
    const context = useContext(MasterDataContext);
    if (context === undefined) {
        throw new Error('useMasterData must be used within a MasterDataProvider');
    }
    return context;
};
