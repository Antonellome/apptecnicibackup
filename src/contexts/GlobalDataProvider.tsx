
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, where, DocumentSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { useAuth } from '@/hooks/useAuth';
import type { 
    Rapportino, 
    Tecnico, 
    Ditta, 
    Categoria, 
    Veicolo, 
    Cliente, 
    TipoGiornata, 
    Nave, 
    Luogo, 
    WebAppUser, 
    Qualifica, 
    Documento
} from '@/models/definitions';

// --- FUNZIONE DI CONVERSIONE SICURA ---
const docToRapportino = (doc: DocumentSnapshot): Rapportino => {
    const data = doc.data()!;
    const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date();
    const updatedAt = data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date();
    const dataRapportino = data.data instanceof Timestamp ? data.data.toDate() : new Date();

    return {
        id: doc.id,
        ...data,
        data: dataRapportino,
        createdAt,
        updatedAt,
    } as Rapportino;
};


// --- CONTEXT INTERFACE ---
export interface IGlobalDataContext {
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

const GlobalDataContext = createContext<IGlobalDataContext | undefined>(undefined);

export const useGlobalData = () => {
  const context = useContext(GlobalDataContext);
  if (!context) {
    throw new Error('useGlobalData must be used within a GlobalDataProvider');
  }
  return context;
};

// --- PROVIDER COMPONENT ---
export const GlobalDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  // --- STATE HOOKS ---
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

  const collectionsToSync = useMemo(() => [
    { name: 'tecnici', setter: setTecnici },
    { name: 'ditte', setter: setDitte },
    { name: 'categorie', setter: setCategorie },
    { name: 'veicoli', setter: setVeicoli },
    { name: 'clienti', setter: setClienti },
    { name: 'tipiGiornata', setter: setTipiGiornata },
    { name: 'navi', setter: setNavi },
    { name: 'luoghi', setter: setLuoghi },
    { name: 'webAppUsers', setter: setWebAppUsers },
    { name: 'qualifiche', setter: setQualifiche },
    { name: 'documenti', setter: setDocumenti },
  ], []);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      collectionsToSync.forEach(({ setter }) => setter([]));
      setRapportini([]);
      return;
    }

    setLoading(true);
    const unsubscribes: (() => void)[] = [];

    // Generic listener for simple collections
    collectionsToSync.forEach(({ name, setter }) => {
      const collRef = collection(db, name as string);
      const unsubscribe = onSnapshot(collRef, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setter(data as any[]); 
      }, (error) => {
        console.error(`Error fetching ${name}:`, error);
      });
      unsubscribes.push(unsubscribe);
    });

    // Specialized listeners for 'rapportini'
    const queries = [
      query(collection(db, 'rapportini'), where("tecnicoId", "==", user.uid)),
      query(collection(db, 'rapportini'), where("presenze", "array-contains", user.uid))
    ];

    let rapportiniLoaded = false;
    const handleRapportiniSnapshot = (snapshot: any) => {
      const newRapportini = snapshot.docs.map(docToRapportino);
      setRapportini(prevRapportini => {
        const rapportiniMap = new Map(prevRapportini.map((r: Rapportino) => [r.id, r]));
        newRapportini.forEach((r: Rapportino) => rapportiniMap.set(r.id, r));
        return Array.from(rapportiniMap.values());
      });
      if (!rapportiniLoaded) {
        rapportiniLoaded = true;
        if (unsubscribes.length === collectionsToSync.length) setLoading(false);
      }
    };

    queries.forEach(q => {
        const unsubscribe = onSnapshot(q, handleRapportiniSnapshot, (error) => {
            console.error("Error fetching rapportini:", error);
        });
        unsubscribes.push(unsubscribe);
    });
    
    return () => {
      unsubscribes.forEach(unsub => unsub());
    };

  }, [user, collectionsToSync]);

  const ditteMap = useMemo(() => new Map(ditte.map(d => [d.id, d])), [ditte]);
  const categorieMap = useMemo(() => new Map(categorie.map(c => [c.id, c])), [categorie]);
  const tecniciMap = useMemo(() => new Map(tecnici.map(t => [t.id, t])), [tecnici]);

  const value: IGlobalDataContext = {
    rapportini, tecnici, ditte, categorie, veicoli, clienti, tipiGiornata, navi, luoghi, webAppUsers, qualifiche, documenti,
    ditteMap, categorieMap, tecniciMap,
    loading,
  };

  return <GlobalDataContext.Provider value={value}>{children}</GlobalDataContext.Provider>;
};
