
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
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

  // List of collections to sync automatically, excluding 'rapportini'
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

  // --- DATA FETCHING EFFECTS ---

  // Effect for general collections
  useEffect(() => {
    if (!user) {
      setLoading(false);
      // Clear data on logout
      collectionsToSync.forEach(({ setter }) => setter([]));
      setRapportini([]); // Also clear rapportini
      return;
    }

    setLoading(true);
    let pendingLoads = collectionsToSync.length + 1; // +1 for rapportini

    const handleLoadFinished = () => {
      pendingLoads--;
      if (pendingLoads === 0) {
        setLoading(false);
      }
    };

    // Subscribe to general collections
    const unsubscribes = collectionsToSync.map(({ name, setter }) => {
      const collRef = collection(db, name as string);
      return onSnapshot(collRef, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setter(data as any[]);
        handleLoadFinished();
      }, (error) => {
        console.error(`Error fetching ${name}:`, error);
        handleLoadFinished();
      });
    });

    // Specialized effect for 'rapportini' based on user ID
    const rapportiniRef = collection(db, 'rapportini');
    const q_owner = query(rapportiniRef, where("userId", "==", user.uid));
    const q_participant = query(rapportiniRef, where("partecipantiIds", "array-contains", user.uid));

    const unsubOwner = onSnapshot(q_owner, (snapshot) => {
        const ownerRapportini = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Rapportino[];
        setRapportini(prev => {
            const combined = new Map([...prev.map(r => [r.id, r]), ...ownerRapportini.map(r => [r.id, r])]);
            return Array.from(combined.values());
        });
    }, error => console.error("Error fetching owner rapportini:", error));

    const unsubParticipant = onSnapshot(q_participant, (snapshot) => {
        const participantRapportini = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Rapportino[];
        setRapportini(prev => {
            const combined = new Map([...prev.map(r => [r.id, r]), ...participantRapportini.map(r => [r.id, r])]);
            return Array.from(combined.values());
        });
    }, error => console.error("Error fetching participant rapportini:", error));
    
    // Initial load for rapportini is tricky with two queries, we'll just mark it done once.
    handleLoadFinished();

    // Cleanup function
    return () => {
      unsubscribes.forEach(unsub => unsub());
      unsubOwner();
      unsubParticipant();
    };

  }, [user, collectionsToSync]);

  // --- MEMOIZED MAPS ---
  const ditteMap = useMemo(() => new Map(ditte.map(d => [d.id, d])), [ditte]);
  const categorieMap = useMemo(() => new Map(categorie.map(c => [c.id, c])), [categorie]);
  const tecniciMap = useMemo(() => new Map(tecnici.map(t => [t.id, t])), [tecnici]);

  // --- CONTEXT VALUE ---
  const value: IGlobalDataContext = {
    rapportini, tecnici, ditte, categorie, veicoli, clienti, tipiGiornata, navi, luoghi, webAppUsers, qualifiche, documenti,
    ditteMap, categorieMap, tecniciMap,
    loading,
  };

  return <GlobalDataContext.Provider value={value}>{children}</GlobalDataContext.Provider>;
};
