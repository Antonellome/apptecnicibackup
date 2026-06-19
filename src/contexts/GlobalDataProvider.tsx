
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, where, DocumentSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useMasterData } from '@/hooks/useMasterData';
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
    Sede, 
    Qualifica, 
    Documento,
    UserProfile
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
  sedi: Sede[];
  webAppUsers: UserProfile[];
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
  const { masterData, loading: masterDataLoading } = useMasterData();

  const [rapportini, setRapportini] = useState<Rapportino[]>([]);
  const [webAppUsers, setWebAppUsers] = useState<UserProfile[]>([]);
  const [qualifiche, setQualifiche] = useState<Qualifica[]>([]);
  const [documenti, setDocumenti] = useState<Documento[]>([]);
  const [localDataLoading, setLocalDataLoading] = useState(true);

  const collectionsToSync = useMemo(() => [
    { name: 'webAppUsers', setter: setWebAppUsers },
    { name: 'qualifiche', setter: setQualifiche },
    { name: 'documenti', setter: setDocumenti },
  ], []);

  useEffect(() => {
    const syncData = async () => {
        if (!user) {
            setLocalDataLoading(true);
            collectionsToSync.forEach(({ setter }) => setter([]));
            setRapportini([]);
            return () => {}; // Restituisce una funzione di cleanup vuota
        }

        setLocalDataLoading(true);
        const unsubscribes: (() => void)[] = [];

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

        const queries = [
            query(collection(db, 'rapportini'), where("tecnicoId", "==", user.uid)),
            query(collection(db, 'rapportini'), where("presenze", "array-contains", user.uid))
        ];

        let rapportiniInitialLoads = queries.length;
        const handleRapportiniSnapshot = (snapshot: any) => {
            const newRapportini = snapshot.docs.map(docToRapportino);
            setRapportini(prevRapportini => {
                const rapportiniMap = new Map(prevRapportini.map((r: Rapportino) => [r.id, r]));
                newRapportini.forEach((r: Rapportino) => rapportiniMap.set(r.id, r));
                return Array.from(rapportiniMap.values());
            });

            if (rapportiniInitialLoads > 0) {
                rapportiniInitialLoads--;
                if (rapportiniInitialLoads === 0) {
                    setLocalDataLoading(false);
                }
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
    };

    const cleanupPromise = syncData();

    return () => {
        cleanupPromise.then(cleanup => cleanup());
    };
}, [user, collectionsToSync]);
  
  const {
      tecnici = [],
      ditte = [],
      categorie = [],
      veicoli = [],
      clienti = [],
      tipiGiornata = [],
      navi = [],
      luoghi = [],
      sedi = [],
  } = masterData || {};

  const ditteMap = useMemo(() => new Map(ditte.map(d => [d.id, d])), [ditte]);
  const categorieMap = useMemo(() => new Map(categorie.map(c => [c.id, c])), [categorie]);
  const tecniciMap = useMemo(() => new Map(tecnici.map(t => [t.id, t])), [tecnici]);

  const loading = masterDataLoading || localDataLoading;

  const value: IGlobalDataContext = {
    rapportini,
    tecnici, ditte, categorie, veicoli, clienti, tipiGiornata, navi, luoghi, sedi,
    webAppUsers, qualifiche, documenti,
    ditteMap, categorieMap, tecniciMap,
    loading,
  };

  return <GlobalDataContext.Provider value={value}>{children}</GlobalDataContext.Provider>;
};
