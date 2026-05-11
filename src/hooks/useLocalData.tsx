
import { useState, useEffect } from 'react';
import { db as localDb } from '@/services/localDatabase'; // Assuming a local DB service
import { MasterData } from '@/models/definitions';

// Questo è un hook simulato. In una vera implementazione, 
// questo hook si interfaccerà con IndexedDB (tramite Dexie.js o simile)
// per caricare le anagrafiche e fornire dati reattivi.

export const useLocalData = () => {
    const [data, setData] = useState<MasterData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Simuliamo il fetch di tutte le anagrafiche in parallelo dal DB locale
                const [tecnici, clienti, sedi, tipiGiornata, veicoli, luoghi, navi, ditte, categorie] = await Promise.all([
                    localDb.table('tecnici').toArray(),
                    localDb.table('clienti').toArray(),
                    localDb.table('sedi').toArray(),
                    localDb.table('tipiGiornata').toArray(),
                    localDb.table('veicoli').toArray(),
                    localDb.table('luoghi').toArray(),
                    localDb.table('navi').toArray(),
                    localDb.table('ditte').toArray(),
                    localDb.table('categorie').toArray(),
                ]);

                setData({
                    tecnici,
                    clienti,
                    sedi,
                    tipiGiornata,
                    veicoli,
                    luoghi,
                    navi,
                    ditte,
                    categorie,
                });

            } catch (err) {
                console.error("Failed to fetch local data:", err);
                setError(err as Error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();

        // TODO: Implementare un listener per gli aggiornamenti del database locale
        // e aggiornare lo stato di conseguenza.

    }, []);

    return { data, loading, error };
};
