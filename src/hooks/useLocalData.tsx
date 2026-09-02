
import { useState, useEffect } from 'react';
import { db } from '@/db/local-db';
import { MasterData } from '@/models/definitions';
import { useLiveQuery } from 'dexie-react-hooks';

const ANAGRAFICA_IDS = [
    'tecnici', 'clienti', 'sedi', 'tipiGiornata', 'veicoli',
    'luoghi', 'navi', 'ditte', 'categorie'
];

export const useLocalData = () => {
    // Usiamo useLiveQuery per ottenere dati reattivi da Dexie.
    // Questo hook si aggiornerà automaticamente se i dati in IndexedDB cambiano.
    const anagraficheData = useLiveQuery(() => db.anagrafiche.bulkGet(ANAGRAFICA_IDS), [], []);

    const [data, setData] = useState<MasterData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const processData = () => {
            if (anagraficheData.length > 0) {
                setLoading(true);
                try {
                    const masterDataResult: any = {};
                    anagraficheData.forEach((record, index) => {
                        const key = ANAGRAFICA_IDS[index];
                        masterDataResult[key] = record ? record.data : [];
                    });

                    // Le impostazioni sono gestite separatamente, quindi le omettiamo qui
                    // o le carichiamo se necessario per questo hook specifico.
                    setData(masterDataResult as MasterData);
                    setError(null);
                } catch (err) {
                    console.error("Failed to process local data:", err);
                    setError(err as Error);
                }
                finally {
                    setLoading(false);
                }
            } else if (!loading) {
                // Se non ci sono dati dopo il caricamento iniziale, potrebbe essere un errore
                // o semplicemente il DB è vuoto. Per ora, impostiamo lo stato di caricamento su false.
                setLoading(false);
            }
        }
        processData()
    }, [anagraficheData, loading]); // L'effetto dipende dai dati live da Dexie

    return { data, loading, error };
};
