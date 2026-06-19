
import React, { createContext, useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '@/db/local-db';
import { collection, getDocs } from 'firebase/firestore';
import { db as firestoreDb } from '@/firebase';
import { MasterData, ANAGRAFICA_TABLES } from '@/models/definitions';
import { useAuth } from '@/hooks/useAuth';

// Definizione del tipo per lo stato del provider
type MasterDataContextState = {
  masterData: MasterData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

// Creazione del Context
export const MasterDataContext = createContext<MasterDataContextState>({
  masterData: null,
  loading: true,
  error: null,
  refetch: async () => {},
});

// Definizione del Provider
export const MasterDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [masterData, setMasterData] = useState<MasterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth(); // Usato per triggerare il refetch al login

  const createEmptyMasterData = (): MasterData => ({
    tipiGiornata: [],
    tecnici: [],
    veicoli: [],
    navi: [],
    luoghi: [],
    impostazioni: [],
    ditte: [],
    sedi: [],
    magazzini: [],
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    // 1. Tenta di caricare i dati dalla cache locale (Dexie)
    try {
      const cachedDataPromises = ANAGRAFICA_TABLES.map(tableName =>
        db.anagrafiche.get(tableName).then(record => ({ tableName, data: record?.data || [] }))
      );
      const cachedResults = await Promise.all(cachedDataPromises);

      const cachedMasterData = createEmptyMasterData();
      let isCacheComplete = true;
      
      for (const { tableName, data } of cachedResults) {
        if (data.length > 0) {
          (cachedMasterData as any)[tableName] = data;
        } else {
          isCacheComplete = false;
        }
      }

      // Se la cache è completa, usala subito e avvia un sync silenzioso in background se online
      if (isCacheComplete) {
        setMasterData(cachedMasterData);
        setLoading(false);
        console.log("MasterDataProvider: Dati caricati con successo dalla cache locale.");

        if (navigator.onLine) {
          // Sincronizzazione silenziosa in background
          fetchFromFirestore(true).catch(err => {
            console.warn("Sincronizzazione silenziosa in background fallita:", err);
          });
        }
        return; // Dati caricati, esci
      }

    } catch (cacheError) {
      console.error("MasterDataProvider: Errore nel leggere la cache Dexie.", cacheError);
      // Non bloccare, procedi al fetch da Firestore se possibile
    }

    // 2. Se la cache è incompleta o fallisce, tenta di caricarli da Firestore
    if (navigator.onLine) {
      try {
        await fetchFromFirestore(false);
      } catch (firestoreError: any) {
        setError("Impossibile caricare i dati anagrafici da Firestore.");
        setMasterData(createEmptyMasterData()); // Fornisce dati vuoti in caso di fallimento
        setLoading(false);
      }
    } else {
      // 3. Se siamo offline e la cache è incompleta/fallita
      console.warn("MasterDataProvider: App offline e cache locale incompleta o non disponibile.");
      setError("Sei offline. Alcuni dati (es. tecnici, navi) potrebbero non essere disponibili fino alla prossima connessione.");
      // Fornisci dati vuoti per consentire all'app di funzionare in modalità degradata
      setMasterData(createEmptyMasterData()); 
      setLoading(false);
    }
  }, []);

  const fetchFromFirestore = async (isSilent: boolean) => {
    if (!isSilent) {
      setLoading(true);
      setError(null);
    }
    console.log("MasterDataProvider: Inizio fetch da Firestore...");

    try {
      const fetchedMasterData = createEmptyMasterData();
      const promises = ANAGRAFICA_TABLES.map(async (tableName) => {
        const querySnapshot = await getDocs(collection(firestoreDb, tableName));
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        (fetchedMasterData as any)[tableName] = data;
        
        // Aggiorna la cache locale in background
        await db.anagrafiche.put({ id: tableName, data, timestamp: new Date() });
      });

      await Promise.all(promises);
      
      setMasterData(fetchedMasterData);
      console.log("MasterDataProvider: Dati scaricati da Firestore e cache locale aggiornata.");

    } catch (err) {
      console.error("MasterDataProvider: Errore durante il fetch da Firestore:", err);
      if (!isSilent) {
         setError("Errore critico durante il download dei dati anagrafici.");
         // In caso di errore, non lasciare i dati a null, fornisci un oggetto vuoto
         setMasterData(createEmptyMasterData());
      }
      // Se è silent, non fare nulla per non disturbare l'utente
      throw err; // Rilancia l'errore per il chiamante (es. sync in background)
    } finally {
      if (!isSilent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (user) { // Triggera il fetch quando l'utente fa login
        fetchData();
    } else { // Resetta allo stato iniziale al logout
        setMasterData(null);
        setLoading(true);
        setError(null);
    }
  }, [user, fetchData]);

  const contextValue = useMemo(() => ({
    masterData,
    loading,
    error,
    refetch: fetchData,
  }), [masterData, loading, error, fetchData]);

  return (
    <MasterDataContext.Provider value={contextValue}>
      {children}
    </MasterDataContext.Provider>
  );
};
