import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { collection, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { Anagrafica, Categoria, Veicolo, Contratto, Notifica } from '@/models/definitions';
// *** IMPORT CORRETTO ***
import FullScreenLoader from '@/components/FullScreenLoader';

interface MasterDataContextType {
    anagrafiche: Anagrafica[];
    veicoli: Veicolo[];
    categorie: Categoria[];
    contratti: Contratto[];
    notificheRichieste: Notifica[];
}

interface MasterData extends MasterDataContextType {}

export const MasterDataContext = createContext<MasterDataContextType | undefined>(undefined);

const collectionPaths = {
    anagrafiche: 'anagrafiche',
    veicoli: 'veicoli',
    categorie: 'categorie',
    contratti: 'contratti',
    notificheRichieste: 'notificheRichieste',
};

export const MasterDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [data, setData] = useState<MasterData>({ anagrafiche: [], veicoli: [], categorie: [], contratti: [], notificheRichieste: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        let unsubscribes: (() => void)[] = [];

        const setupListeners = () => {
            unsubscribes.forEach(unsub => unsub());
            unsubscribes = [];

            setLoading(true);

            const collectionsToFetch = Object.keys(collectionPaths) as Array<keyof MasterData>;

            Promise.all(collectionsToFetch.map(key => 
                new Promise<void>((resolve, reject) => {
                    const path = collectionPaths[key];
                    const q = collection(db, path);
                    const unsub = onSnapshot(q, 
                        (querySnapshot) => {
                            const items = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                            setData(prevData => ({ ...prevData, [key]: items }));
                            resolve(); 
                        },
                        (err) => {
                            console.error(`Errore nel caricamento della collezione ${key}:`, err);
                            setError(err);
                            reject(err);
                        }
                    );
                    unsubscribes.push(unsub);
                })
            )).then(() => {
                setLoading(false);
            }).catch(() => {
                setLoading(false);
            });
        };

        const handleVisibilityChange = () => {
            if (document.hidden) {
                unsubscribes.forEach(unsub => unsub());
                unsubscribes = [];
                console.log("MasterData listeners disconnected due to app backgrounding.");
            } else {
                console.log("App foregrounded, re-attaching MasterData listeners.");
                setupListeners();
            }
        };
        
        setupListeners();
        
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            unsubscribes.forEach(unsub => unsub());
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };

    }, []);

    if (loading) return <FullScreenLoader />;
    if (error) return <div>Errore nel caricamento dei dati: {error.message}</div>;

    return (
        <MasterDataContext.Provider value={{ ...data }}>
            {children}
        </MasterDataContext.Provider>
    );
};
