
import { useState, useEffect } from 'react';
import { db } from '@/db/local-db';
import { MasterData } from '@/models/definitions';
import { useLiveQuery } from 'dexie-react-hooks';

export const useLocalData = () => {
    const [data, setData] = useState<MasterData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const tecnici = useLiveQuery(() => db.tecnici.toArray(), []);
    const clienti = useLiveQuery(() => db.clienti.toArray(), []);
    const sedi = useLiveQuery(() => db.sedi.toArray(), []);
    const tipiGiornata = useLiveQuery(() => db.tipiGiornata.toArray(), []);
    const veicoli = useLiveQuery(() => db.veicoli.toArray(), []);
    const luoghi = useLiveQuery(() => db.luoghi.toArray(), []);
    const navi = useLiveQuery(() => db.navi.toArray(), []);
    const ditte = useLiveQuery(() => db.ditte.toArray(), []);
    const categorie = useLiveQuery(() => db.categorie.toArray(), []);
    const lavorazioni = useLiveQuery(() => db.lavorazioni.toArray(), []);
    const qualifiche = useLiveQuery(() => db.qualifiche.toArray(), []);
    const sistemi = useLiveQuery(() => db.sistemi.toArray(), []);
    const impostazioni = useLiveQuery(() => db.impostazioni.get('main'), []);

    useEffect(() => {
        const allDataLoaded = [
            tecnici, clienti, sedi, tipiGiornata, veicoli, luoghi, navi, ditte, categorie, lavorazioni, qualifiche, sistemi, impostazioni
        ].every(d => d !== undefined);

        if (allDataLoaded) {
            setLoading(true);
            try {
                setData({
                    tecnici: tecnici || [],
                    clienti: clienti || [],
                    sedi: sedi || [],
                    tipiGiornata: tipiGiornata || [],
                    veicoli: veicoli || [],
                    luoghi: luoghi || [],
                    navi: navi || [],
                    ditte: ditte || [],
                    categorie: categorie || [],
                    lavorazioni: lavorazioni || [],
                    qualifiche: qualifiche || [],
                    sistemi: sistemi || [],
                    impostazioni: impostazioni || { id: 'main', tariffe: [] },
                });
                setError(null);
            } catch (err) {
                console.error("Failed to process local data:", err);
                setError(err as Error);
            } finally {
                setLoading(false);
            }
        }
    }, [tecnici, clienti, sedi, tipiGiornata, veicoli, luoghi, navi, ditte, categorie, lavorazioni, qualifiche, sistemi, impostazioni]);

    return { data, loading, error };
};
