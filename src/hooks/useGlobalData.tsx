
import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { Rapportino, Tecnico, Ditta, Categoria, Nave, Luogo, Veicolo, TipoGiornata } from '../models/definitions';
import { rapportoConverter, tecnicoConverter, veicoloConverter } from '../utils/converters';
import { useAuth } from '../hooks/useAuth';

const sortByName = <T extends { nome?: string }>(data: T[]): T[] => {
  return data.sort((a, b) => {
    const nameA = a.nome || '';
    const nameB = b.nome || '';
    return nameA.localeCompare(nameB, 'it', { sensitivity: 'base' });
  });
};

const subscribeToCollection = <T,>(
  collectionName: string,
  setData: (data: T[]) => void,
  onLoad: () => void,
  converter?: any,
  sortData: boolean = false
) => {
  const collRef = converter
    ? collection(db, collectionName).withConverter(converter)
    : collection(db, collectionName);

  let initialLoad = true;

  return onSnapshot(collRef, snapshot => {
    let data = snapshot.docs.map(doc => (({
      ...doc.data(),
      id: doc.id
    }) as T));

    if (sortData) {
      data = sortByName(data as any) as T[];
    }

    setData(data);
    if (initialLoad) {
      onLoad();
      initialLoad = false;
    }
  }, error => {
    console.error(`Errore nel caricamento della collezione ${collectionName}:`, error);
    if (initialLoad) {
      onLoad();
      initialLoad = false;
    }
  });
};

export const useGlobalData = () => {
  const { user } = useAuth();
  const [rapportini, setRapportini] = useState<Rapportino[]>([]);
  const [tecnici, setTecnici] = useState<Tecnico[]>([]);
  const [ditte, setDitte] = useState<Ditta[]>([]);
  const [categorie, setCategorie] = useState<Categoria[]>([]);
  const [navi, setNavi] = useState<Nave[]>([]);
  const [luoghi, setLuoghi] = useState<Luogo[]>([]);
  const [veicoli, setVeicoli] = useState<Veicolo[]>([]);
  const [tipiGiornata, setTipiGiornata] = useState<TipoGiornata[]>([]);

  const [error, setError] = useState<Error | null>(null);
  const [loadedCount, setLoadedCount] = useState(0);

  const TOTAL_COLLECTIONS = 8;

  const loading = user ? loadedCount < TOTAL_COLLECTIONS : false;

  useEffect(() => {
    if (!user) {
        setRapportini([]);
        setTecnici([]);
        setDitte([]);
        setCategorie([]);
        setNavi([]);
        setLuoghi([]);
        setVeicoli([]);
        setTipiGiornata([]);
        setLoadedCount(0);
        return;
    }

    setLoadedCount(0);

    const onCollectionLoad = () => {
      setLoadedCount(prev => prev + 1);
    };

    try {
      const unsubscribers = [
        subscribeToCollection<Rapportino>('rapportini', setRapportini, onCollectionLoad, rapportoConverter),
        subscribeToCollection<Tecnico>('tecnici', setTecnici, onCollectionLoad, tecnicoConverter),
        subscribeToCollection<Ditta>('ditte', setDitte, onCollectionLoad, undefined, true),
        subscribeToCollection<Categoria>('categorie', setCategorie, onCollectionLoad, undefined, true),
        subscribeToCollection<Nave>('navi', setNavi, onCollectionLoad, undefined, true),
        subscribeToCollection<Luogo>('luoghi', setLuoghi, onCollectionLoad, undefined, true),
        subscribeToCollection<Veicolo>('veicoli', setVeicoli, onCollectionLoad, veicoloConverter, true),
        subscribeToCollection<TipoGiornata>('tipiGiornata', setTipiGiornata, onCollectionLoad, undefined, true),
      ];

      return () => unsubscribers.forEach(unsub => unsub());
    } catch (e: any) {
      setError(e);
    }
  }, [user]);

  return {
    rapportini,
    tecnici,
    ditte,
    categorie,
    navi,
    luoghi,
    veicoli,
    tipiGiornata,
    loading,
    error,
  };
};
