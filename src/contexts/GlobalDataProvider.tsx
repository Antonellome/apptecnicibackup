import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, DocumentData } from 'firebase/firestore';
import { db } from '@/firebase';
import type { Rapportino, Tecnico, Ditta, Categoria, Veicolo, Cliente, TipoGiornata, Nave, Luogo, WebAppUser, Qualifica, Documento } from '@/models/definitions';

// --- Interfaces ---
export interface IDataContext {
  rapportini: Rapportino[];
  tecnici: Tecnico[];
  ditte: Ditta[];
  categorie: Categoria[];
  veicoli: Veicolo[];
  clienti: Cliente[];
  tipiGiornata: TipoGiornata[];
  navi: Nave[];
  luoghi: Luogo[];
  webAppUsers: WebAppUser[];
  qualifiche: Qualifica[];
  documenti: Documento[];
  ditteMap: Map<string, Ditta>;
  categorieMap: Map<string, Categoria>;
  tecniciMap: Map<string, Tecnico>;
  loading: boolean;
}

// --- Context ---
const DataContext = createContext<IDataContext | undefined>(undefined);

// --- Hook ---
export const useGlobalData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useGlobalData must be used within a GlobalDataProvider');
  }
  return context;
};

// --- Helper per Snapshot ---
const createSnapshotListener = <T extends DocumentData>(
    collectionName: string, 
    setter: React.Dispatch<React.SetStateAction<T[]>>,
    onLoad: () => void, 
    onError: (error: Error) => void
) => {
    const collRef = collection(db, collectionName);
    return onSnapshot(collRef, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as unknown as T[];
        setter(data);
        onLoad();
    }, (error) => {
        console.error(`Errore nel caricamento di ${collectionName}:`, error);
        onError(error);
        onLoad(); // Contiamo anche i fallimenti per sbloccare il loading
    });
};


// --- Provider ---
export const GlobalDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [rapportini, setRapportini] = useState<Rapportino[]>([]);
  const [tecnici, setTecnici] = useState<Tecnico[]>([]);
  const [ditte, setDitte] = useState<Ditta[]>([]);
  const [categorie, setCategorie] = useState<Categoria[]>([]);
  const [veicoli, setVeicoli] = useState<Veicolo[]>([]);
  const [clienti, setClienti] = useState<Cliente[]>([]);
  const [tipiGiornata, setTipiGiornata] = useState<TipoGiornata[]>([]);
  const [navi, setNavi] = useState<Nave[]>([]);
  const [luoghi, setLuoghi] = useState<Luogo[]>([]);
  const [webAppUsers, setWebAppUsers] = useState<WebAppUser[]>([]);
  const [qualifiche, setQualifiche] = useState<Qualifica[]>([]);
  const [documenti, setDocumenti] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    const collectionNames = [
        'rapportini', 'tecnici', 'ditte', 'categorie', 'veicoli', 'clienti', 
        'tipiGiornata', 'navi', 'luoghi', 'webAppUsers', 'qualifiche', 'documenti'
    ];
    let pendingLoads = collectionNames.length;

    const handleLoad = () => {
        pendingLoads--;
        if (pendingLoads === 0) {
            setLoading(false);
        }
    };

    const handleError = (error: Error) => {
        setErrors(prev => [...prev, error.message]);
    };

    const unsubscribes = [
        createSnapshotListener<Rapportino>('rapportini', setRapportini, handleLoad, handleError),
        createSnapshotListener<Tecnico>('tecnici', setTecnici, handleLoad, handleError),
        createSnapshotListener<Ditta>('ditte', setDitte, handleLoad, handleError),
        createSnapshotListener<Categoria>('categorie', setCategorie, handleLoad, handleError),
        createSnapshotListener<Veicolo>('veicoli', setVeicoli, handleLoad, handleError),
        createSnapshotListener<Cliente>('clienti', setClienti, handleLoad, handleError),
        createSnapshotListener<TipoGiornata>('tipiGiornata', setTipiGiornata, handleLoad, handleError),
        createSnapshotListener<Nave>('navi', setNavi, handleLoad, handleError),
        createSnapshotListener<Luogo>('luoghi', setLuoghi, handleLoad, handleError),
        createSnapshotListener<WebAppUser>('webAppUsers', setWebAppUsers, handleLoad, handleError),
        createSnapshotListener<Qualifica>('qualifiche', setQualifiche, handleLoad, handleError),
        createSnapshotListener<Documento>('documenti', setDocumenti, handleLoad, handleError),
    ];

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, []); // L'array vuoto è FONDAMENTALE e ora sicuro.

  const ditteMap = useMemo(() => new Map(ditte.map(d => [d.id, d])), [ditte]);
  const categorieMap = useMemo(() => new Map(categorie.map(c => [c.id, c])), [categorie]);
  const tecniciMap = useMemo(() => new Map(tecnici.map(t => [t.id, t])), [tecnici]);

  const value = useMemo(() => ({
    rapportini,
    tecnici,
    ditte,
    categorie,
    veicoli,
    clienti,
    tipiGiornata,
    navi,
    luoghi,
    webAppUsers,
    qualifiche,
    documenti,
    ditteMap,
    categorieMap,
    tecniciMap,
    loading,
    errors, // Anche gli errori sono disponibili nel contesto, se servono
  }), [
    rapportini, tecnici, ditte, categorie, veicoli, clienti, tipiGiornata, 
    navi, luoghi, webAppUsers, qualifiche, documenti, 
    ditteMap, categorieMap, tecniciMap, loading, errors
  ]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};