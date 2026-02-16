
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { Rapportino, Tecnico, Ditta, Categoria, Nave, Luogo, Veicolo, TipoGiornata } from '../models/definitions';
import { rapportoConverter, tecnicoConverter, veicoloConverter } from '../utils/converters';
import { useAuth } from '../hooks/useAuth'; // CIAO. Importo il context di autenticazione.

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
  converter?: any
) => {
  const collRef = converter
    ? collection(db, collectionName).withConverter(converter)
    : collection(db, collectionName);
  
  let initialLoad = true;

  return onSnapshot(collRef, snapshot => {
    const data = snapshot.docs.map(doc => (({
      ...doc.data(),
      id: doc.id
    }) as T));
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
  const { user } = useAuth(); // CIAO. Accedo allo stato dell'utente.
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
    // CIAO. CONDIZIONE CRUCIALE: non fare nulla se l'utente non è loggato.
    if (!user) {
        setLoading(false); // Se non c'è utente, non c'è niente da caricare.
        return;
    }

    setLoading(true); // CIAO. Inizia a caricare solo se c'è un utente.
    
    const onCollectionLoad = () => {
      setLoadedCount(prev => prev + 1);
    };

    try {
      const unsubscribers = [
        subscribeToCollection<Rapportino>('rapportini', setRapportini, onCollectionLoad, rapportoConverter),
        subscribeToCollection<Tecnico>('tecnici', setTecnici, onCollectionLoad, tecnicoConverter),
        subscribeToCollection<Ditta>('ditte', setDitte, onCollectionLoad),
        subscribeToCollection<Categoria>('categorie', setCategorie, onCollectionLoad),
        subscribeToCollection<Nave>('navi', setNavi, onCollectionLoad),
        subscribeToCollection<Luogo>('luoghi', setLuoghi, onCollectionLoad),
        subscribeToCollection<Veicolo>('veicoli', setVeicoli, onCollectionLoad, veicoloConverter),
        subscribeToCollection<TipoGiornata>('tipiGiornata', setTipiGiornata, onCollectionLoad),
      ];

      return () => unsubscribers.forEach(unsub => unsub());
    } catch (e: any) {
      setError(e);
      setLoading(false);
    }
    // CIAO. Aggiungo 'user' come dipendenza dell'effetto.
    // Questo assicura che il caricamento parta quando l'utente viene autenticato
    // e si interrompa se l'utente fa logout.
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
