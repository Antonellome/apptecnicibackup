
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { Rapportino, Tecnico, Ditta, Categoria, Nave, Luogo, Veicolo, TipoGiornata } from '../models/definitions';
import { rapportoConverter, tecnicoConverter, veicoloConverter } from '../utils/converters';
import { useAuth } from '../hooks/useAuth';

// --- CORREZIONE: Funzione di ordinamento resa più robusta ---
const sortByName = <T extends { nome?: string }>(data: T[]): T[] => {
  return data.sort((a, b) => {
    // Gestisce i casi in cui 'nome' sia undefined o null
    const nameA = a.nome || ''; 
    const nameB = b.nome || '';
    return nameA.localeCompare(nameB, 'it', { sensitivity: 'base' });
  });
};
// -----------------------------------------------------------

interface GlobalDataContextType {
  rapportini: Rapportino[];
  tecnici: Tecnico[];
  ditte: Ditta[];
  categorie: Categoria[];
  navi: Nave[];
  luoghi: Luogo[];
  veicoli: Veicolo[];
  tipiGiornata: TipoGiornata[];
  loading: boolean;
  error: Error | null;
}

const GlobalDataContext = createContext<GlobalDataContextType | undefined>(undefined);

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
      // Ora questa chiamata è sicura
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

export const GlobalDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [rapportini, setRapportini] = useState<Rapportino[]>([]);
  const [tecnici, setTecnici] = useState<Tecnico[]>([]);
  const [ditte, setDitte] = useState<Ditta[]>([]);
  const [categorie, setCategorie] = useState<Categoria[]>([]);
  const [navi, setNavi] = useState<Nave[]>([]);
  const [luoghi, setLuoghi] = useState<Luogo[]>([]);
  const [veicoli, setVeicoli] = useState<Veicolo[]>([]);
  const [tipiGiornata, setTipiGiornata] = useState<TipoGiornata[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [loadedCount, setLoadedCount] = useState(0);

  const TOTAL_COLLECTIONS = 8;

  useEffect(() => {
    if (!user) {
        setLoading(false);
        return;
    }

    setLoading(true);
    
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
      setLoading(false);
    }
  }, [user]); 
  
  useEffect(() => {
    if (loadedCount >= TOTAL_COLLECTIONS) {
      setLoading(false);
    }
  }, [loadedCount]);

  const value = {
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

  return (
    <GlobalDataContext.Provider value={value}>
      {children}
    </GlobalDataContext.Provider>
  );
};

export const useGlobalData = () => {
  const context = useContext(GlobalDataContext);
  if (context === undefined) {
    throw new Error('useGlobalData deve essere usato all\'interno di un GlobalDataProvider');
  }
  return context;
};
