import { createContext, useState, useEffect, ReactNode } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/utils/firebase';
import { Cliente, Nave, Luogo, Veicolo, Tecnico, TipoGiornata } from '@/models/definitions';

// Definiamo la "forma" del nostro contesto dati
export interface IDataContext {
  clienti: Cliente[];
  navi: Nave[];
  luoghi: Luogo[];
  veicoli: Veicolo[];
  tecnici: Tecnico[];
  tipiGiornata: TipoGiornata[];
  loading: boolean;
}

// Creiamo il contesto con un valore di default
export const DataContext = createContext<IDataContext | undefined>(undefined);

interface DataProviderProps {
  children: ReactNode;
}

// Questo è il componente che fornirà i dati
export const DataProvider = ({ children }: DataProviderProps) => {
  const [data, setData] = useState<Omit<IDataContext, 'loading'>>({
    clienti: [],
    navi: [],
    luoghi: [],
    veicoli: [],
    tecnici: [],
    tipiGiornata: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        // Definiamo tutte le collection che vogliamo caricare
        const collectionsToFetch = {
          clienti: collection(db, 'clienti'),
          navi: collection(db, 'navi'),
          luoghi: collection(db, 'luoghi'),
          veicoli: collection(db, 'veicoli'),
          tecnici: collection(db, 'tecnici'),
          tipiGiornata: collection(db, 'tipiGiornata'),
        };

        // Usiamo Promise.all per caricarle in parallelo
        const results = await Promise.all(
          Object.values(collectionsToFetch).map(coll => getDocs(coll))
        );

        const keys = Object.keys(collectionsToFetch) as (keyof typeof collectionsToFetch)[];

        // Mappiamo i risultati nello stato
        const fetchedData = results.reduce((acc, snapshot, index) => {
          const key = keys[index];
          acc[key] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any;
          return acc;
        }, {} as Omit<IDataContext, 'loading'>);
        
        setData(fetchedData);

      } catch (error) {
        console.error("Errore durante il caricamento dei dati globali:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  const value = { ...data, loading };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};
