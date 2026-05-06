
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase';
import { Tecnico, TipoGiornata, Veicolo, Nave, Luogo } from '@/models/definitions';
import FullScreenLoader from '@/components/FullScreenLoader';

// Definisce la forma dei dati anagrafici
interface MasterData {
    tecnici: Tecnico[];
    tipiGiornata: TipoGiornata[];
    veicoli: Veicolo[];
    navi: Nave[];
    luoghi: Luogo[];
}

// Definisce la forma del valore del contesto, come atteso dai componenti
interface MasterDataContextType {
    masterData: MasterData | null;
    loading: boolean;
}

export const MasterDataContext = createContext<MasterDataContextType | undefined>(undefined);

const collectionPaths: { [key in keyof MasterData]: string } = {
    tecnici: 'tecnici',
    tipiGiornata: 'tipiGiornata',
    veicoli: 'veicoli',
    navi: 'navi',
    luoghi: 'luoghi',
};

export const MasterDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [data, setData] = useState<MasterData>({ 
        tecnici: [], tipiGiornata: [], veicoli: [], navi: [], luoghi: [] 
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const collectionsToFetch = Object.keys(collectionPaths) as Array<keyof MasterData>;
        
        const unsubscribes = collectionsToFetch.map(key => {
            const path = collectionPaths[key];
            const q = collection(db, path);
            return onSnapshot(q, 
                (querySnapshot) => {
                    const items = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
                    setData(prevData => ({ ...prevData, [key]: items }));
                },
                (err) => {
                    console.error(`Errore nel caricamento della collezione ${key}:`, err);
                    setError(err); // Imposta l'errore
                }
            );
        });

        // Determina lo stato di caricamento iniziale
        // Questo approccio è semplice. Per la produzione, si potrebbe voler attendere il primo snapshot di tutte le collezioni
        const initialLoadTimeout = setTimeout(() => {
            setLoading(false);
        }, 3000); // Timeout per considerare terminato il caricamento iniziale

        return () => {
            unsubscribes.forEach(unsub => unsub());
            clearTimeout(initialLoadTimeout);
        };
    }, []);

    if (error) {
        return <Box sx={{ p: 4 }}><Alert severity="error">Errore critico: {error.message}</Alert></Box>;
    }

    // Impacchetta il valore del contesto nella struttura corretta
    const contextValue: MasterDataContextType = {
        masterData: data,
        loading: loading,
    };

    return (
        <MasterDataContext.Provider value={contextValue}>
            {loading ? <FullScreenLoader /> : children}
        </MasterDataContext.Provider>
    );
};

export const useMasterData = (): MasterDataContextType => {
    const context = useContext(MasterDataContext);
    if (context === undefined) {
        throw new Error('useMasterData deve essere usato dentro un MasterDataProvider');
    }
    return context;
};
