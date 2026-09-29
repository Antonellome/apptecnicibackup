import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/local-db';
import { Cliente, Nave, TipoGiornata, Veicolo, Tecnico, Luogo, Categoria, Ditta } from '@/models/definitions';

interface MasterData {
  clienti: Cliente[];
  navi: Nave[];
  tipiGiornata: TipoGiornata[];
  veicoli: Veicolo[];
  tecnici: Tecnico[];
  luoghi: Luogo[];
  categorie: Categoria[];
  ditte: Ditta[];
}

export const useLocalData = () => {
  const [data, setData] = useState<MasterData | null>(null);
  const [loading, setLoading] = useState(true);

  const clienti = useLiveQuery(() => db.clienti.toArray(), []);
  const navi = useLiveQuery(() => db.navi.toArray(), []);
  const tipiGiornata = useLiveQuery(() => db.tipiGiornata.toArray(), []);
  const veicoli = useLiveQuery(() => db.veicoli.toArray(), []);
  const tecnici = useLiveQuery(() => db.tecnici.toArray(), []);
  const luoghi = useLiveQuery(() => db.luoghi.toArray(), []);
  const categorie = useLiveQuery(() => db.categorie.toArray(), []);
  const ditte = useLiveQuery(() => db.ditte.toArray(), []);

  useEffect(() => {
    const allDataLoaded = [
      clienti,
      navi,
      tipiGiornata,
      veicoli,
      tecnici,
      luoghi,
      categorie,
      ditte
    ].every(d => d !== undefined);

    if (allDataLoaded) {
      setData({
        clienti: clienti!,
        navi: navi!,
        tipiGiornata: tipiGiornata!,
        veicoli: veicoli!,
        tecnici: tecnici!,
        luoghi: luoghi!,
        categorie: categorie!,
        ditte: ditte!,
      });
      setLoading(false);
    }
  }, [clienti, navi, tipiGiornata, veicoli, tecnici, luoghi, categorie, ditte]);

  return { data, loading };
};
