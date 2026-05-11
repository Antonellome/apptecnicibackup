import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase'; // CORREZIONE: Puntato all'istanza DB corretta
import { Report, Tecnico, Ditta, Categoria, Nave, Luogo, Veicolo, TipoGiornata } from '@/models/definitions';
import { rapportoConverter, tecnicoConverter, dittaConverter, categoriaConverter, veicoloConverter } from '@/utils/converters';
import { useAuth } from '@/hooks/useAuth';

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
  onDataLoaded: () => void, // Callback to signal data has been loaded
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
        onDataLoaded();
        initialLoad = false;
    }
  }, error => {
    console.error(`Errore nel caricamento della collezione ${collectionName}:`, error);
    onDataLoaded(); // Also signal load on error to not block loading forever
  });
};

export const useGlobalData = () => {
  const { user } = useAuth();
  const [rapportini, setRapportini] = useState<Report[]>([]);
  const [tecnici, setTecnici] = useState<Tecnico[]>([]);
  const [ditte, setDitte] = useState<Ditta[]>([]);
  const [categorie, setCategorie] = useState<Categoria[]>([]);
  const [navi, setNavi] = useState<Nave[]>([]);
  const [luoghi, setLuoghi] = useState<Luogo[]>([]);
  const [veicoli, setVeicoli] = useState<Veicolo[]>([]);
  const [tipiGiornata, setTipiGiornata] = useState<TipoGiornata[]>([]);

  const [error, setError] = useState<Error | null>(null);
  const [loadedCollectionsCount, setLoadedCollectionsCount] = useState(0);
  const TOTAL_COLLECTIONS = 8;

  // Loading is true if user is logged in but not all collections have been loaded yet.
  const loading = !!user && loadedCollectionsCount < TOTAL_COLLECTIONS;

  useEffect(() => {
    if (!user) {
        // Reset states when user logs out
        setRapportini([]);
        setTecnici([]);
        setDitte([]);
        setCategorie([]);
        setNavi([]);
        setLuoghi([]);
        setVeicoli([]);
        setTipiGiornata([]);
        setLoadedCollectionsCount(0);
        return;
    }

    // Reset count for new user session
    setLoadedCollectionsCount(0);

    const onDataLoaded = () => {
        setLoadedCollectionsCount(prev => prev + 1);
    };

    try {
      const unsubscribers = [
        subscribeToCollection<Report>('rapportini', setRapportini, onDataLoaded, rapportoConverter),
        subscribeToCollection<Tecnico>('tecnici', setTecnici, onDataLoaded, tecnicoConverter),
        subscribeToCollection<Ditta>('ditte', setDitte, onDataLoaded, dittaConverter, true),
        subscribeToCollection<Categoria>('categorie', setCategorie, onDataLoaded, categoriaConverter, true),
        subscribeToCollection<Nave>('navi', setNavi, onDataLoaded, undefined, true),
        subscribeToCollection<Luogo>('luoghi', setLuoghi, onDataLoaded, undefined, true),
        subscribeToCollection<Veicolo>('veicoli', setVeicoli, onDataLoaded, veicoloConverter, true),
        subscribeToCollection<TipoGiornata>('tipiGiornata', setTipiGiornata, onDataLoaded, undefined, true),
      ];

      return () => {
          unsubscribers.forEach(unsub => unsub());
      }
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
