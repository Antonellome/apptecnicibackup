
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/utils/firebase';
import type { Rapportino, Tecnico, Ditta, Categoria, Veicolo, Cliente, TipoGiornata, Nave, Luogo, WebAppUser, Qualifica, Documento } from '@/models/definitions';

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

const DataContext = createContext<IDataContext | undefined>(undefined);

export const useGlobalData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useGlobalData must be used within a GlobalDataProvider');
  }
  return context;
};

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

  useEffect(() => {
    const collections: { name: keyof IDataContext; setter: React.Dispatch<React.SetStateAction<any[]>> }[] = [
      { name: 'rapportini', setter: setRapportini },
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
    ];

    let initialLoads = collections.length;

    const unsubscribes = collections.map(({ name, setter }) => {
      const collRef = collection(db, name as string);
      return onSnapshot(collRef, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setter(data as any[]);
        if (initialLoads > 0) {
            initialLoads--;
            if (initialLoads === 0) {
                setLoading(false);
            }
        }
      }, (error) => {
        console.error(`Error fetching ${name}:`, error);
        initialLoads--;
        if (initialLoads === 0) {
            setLoading(false);
        }
      });
    });

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, []);

  const ditteMap = useMemo(() => new Map(ditte.map(d => [d.id, d])), [ditte]);
  const categorieMap = useMemo(() => new Map(categorie.map(c => [c.id, c])), [categorie]);
  const tecniciMap = useMemo(() => new Map(tecnici.map(t => [t.id, t])), [tecnici]);

  const value: IDataContext = {
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
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
