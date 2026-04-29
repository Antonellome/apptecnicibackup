
/**
 * @file MasterDataProvider.tsx
 * @description Questo file definisce il provider per i "dati master", allineato all'architettura R.I.S.O.
 *
 * ARCHITETTURA RETTIFICATA:
 * Come da analisi e correzione di rotta, questo provider abbandona l'uso di Cloud Functions
 * per il recupero dati. Ora legge i dati anagrafici DIRETTAMENTE dalle collezioni Firestore.
 *
 * PRINCIPIO CHIAVE:
 * 1. EFFICIENZA: Utilizza Promise.all per eseguire query parallele e recuperare tutte le anagrafiche
 *    necessarie in un unico "giro" asincrono all'avvio dell'app.
 * 2. CENTRALIZZAZIONE: Rimane il Single Source of Truth per i dati master.
 * 3. DIPENDENZA DALL'AUTH: Il recupero si attiva solo dopo il login dell'utente.
 */
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase'; // Accesso diretto al DB
import { useAuth } from '@/contexts/AuthContext';
import { Tecnico, Cliente, Sede, TipoGiornata, Veicolo, Luogo, Nave } from '@/models/definitions';

// Interfaccia che definisce la struttura dei dati master
export interface MasterData {
    tecnici: Tecnico[];
    clienti: Cliente[];
    sedi: Sede[];
    tipiGiornata: TipoGiornata[];
    veicoli: Veicolo[];
    luoghi: Luogo[];
    navi: Nave[];
}

// Interfaccia per il valore del contesto
interface MasterDataContextValue {
    masterData: MasterData | null;
    loading: boolean;
    error: Error | null;
    refetch: () => void;
}

// Creazione del contesto
const MasterDataContext = createContext<MasterDataContextValue | undefined>(undefined);

// Hook per l'utilizzo del contesto
export const useMasterData = () => {
    const context = useContext(MasterDataContext);
    if (!context) {
        throw new Error("useMasterData deve essere utilizzato all'interno di un MasterDataProvider");
    }
    return context;
};

// Props del provider
interface MasterDataProviderProps {
    children: ReactNode;
}

export const MasterDataProvider: React.FC<MasterDataProviderProps> = ({ children }) => {
    const { user } = useAuth();
    const [masterData, setMasterData] = useState<MasterData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);
    const [fetchTrigger, setFetchTrigger] = useState<number>(0);

    const fetchMasterData = async () => {
        if (!user) {
            setLoading(false);
            return;
        };

        setLoading(true);
        setError(null);

        try {
            // Funzione helper per recuperare una collezione
            const fetchCollection = async <T,>(collectionName: string): Promise<T[]> => {
                const querySnapshot = await getDocs(collection(db, collectionName));
                return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
            };

            // Esecuzione delle query in parallelo
            const [
                tecnici,
                clienti,
                sedi,
                tipiGiornata,
                veicoli,
                luoghi,
                navi
            ] = await Promise.all([
                fetchCollection<Tecnico>('tecnici'),
                fetchCollection<Cliente>('clienti'),
                fetchCollection<Sede>('sedi'),
                fetchCollection<TipoGiornata>('tipiGiornata'),
                fetchCollection<Veicolo>('veicoli'),
                fetchCollection<Luogo>('luoghi'),
                fetchCollection<Nave>('navi'),
            ]);

            setMasterData({
                tecnici,
                clienti,
                sedi,
                tipiGiornata,
                veicoli,
                luoghi,
                navi,
            });

        } catch (err) {
            console.error("MasterDataProvider: Errore nel recupero dei dati master.", err);
            setError(err instanceof Error ? err : new Error('Errore sconosciuto nel recupero dei dati master'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMasterData();
    }, [user, fetchTrigger]);

    const refetch = () => setFetchTrigger(prev => prev + 1);

    const value = { masterData, loading, error, refetch };

    return (
        <MasterDataContext.Provider value={value}>
            {children}
        </MasterDataContext.Provider>
    );
};
