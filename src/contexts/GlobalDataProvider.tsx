import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/local-db';
import { useAuth } from '@/hooks/useAuth';
import { useSyncManager } from '@/hooks/useSyncManager';
import type { 
    Rapportino, 
    UserProfile,
    Qualifica,
    Documento,
    Tecnico,
    Ditta,
    Categoria,
    Veicolo,
    Cliente,
    TipoGiornata,
    Nave,
    Luogo,
    Sede
} from '../models/definitions';

// Definizione dell'interfaccia per il contesto
interface GlobalDataContextType {
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

// Creazione del contesto
const GlobalDataContext = createContext<GlobalDataContextType | undefined>(undefined);

// Provider Component
export const GlobalDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();

  // ATTIVAZIONE DEL SYNC MANAGER
  useSyncManager();

  // LETTURA DATI DA DEXIE
  const rapportini = useLiveQuery(() => user ? db.rapportini.toArray() : [], [user], [] as Rapportino[]);
  const tecnici = useLiveQuery(() => db.tecnici.toArray(), [], [] as Tecnico[]);
  const ditte = useLiveQuery(() => db.ditte.toArray(), [], [] as Ditta[]);
  const categorie = useLiveQuery(() => db.categorie.toArray(), [], [] as Categoria[]);
  const veicoli = useLiveQuery(() => db.veicoli.toArray(), [], [] as Veicolo[]);
  const clienti = useLiveQuery(() => db.clienti.toArray(), [], [] as Cliente[]);
  const tipiGiornata = useLiveQuery(() => db.tipiGiornata.toArray(), [], [] as TipoGiornata[]);
  const navi = useLiveQuery(() => db.navi.toArray(), [], [] as Nave[]);
  const luoghi = useLiveQuery(() => db.luoghi.toArray(), [], [] as Luogo[]);
  const sedi = useLiveQuery(() => db.sedi.toArray(), [], [] as Sede[]);
  const webAppUsers = useLiveQuery(() => db.webAppUsers.toArray(), [], [] as UserProfile[]);
  const qualifiche = useLiveQuery(() => db.qualifiche.toArray(), [], [] as Qualifica[]);
  const documenti = useLiveQuery(() => db.documenti.toArray(), [], [] as Documento[]);
  
  // Calcolo dello stato di caricamento
  const dataLoading = 
      rapportini === undefined || tecnici === undefined || ditte === undefined || categorie === undefined || 
      veicoli === undefined || clienti === undefined || tipiGiornata === undefined || navi === undefined || 
      luoghi === undefined || sedi === undefined || webAppUsers === undefined || qualifiche === undefined || 
      documenti === undefined;

  const loading = authLoading || dataLoading;
  
  // Creazione delle mappe per accesso rapido
  const ditteMap = useMemo(() => new Map((ditte || []).map(d => [d.id, d])), [ditte]);
  const categorieMap = useMemo(() => new Map((categorie || []).map(c => [c.id, c])), [categorie]);
  const tecniciMap = useMemo(() => new Map((tecnici || []).map(t => [t.id, t])), [tecnici]);

  // Valore del contesto da passare ai componenti figli
  const value: GlobalDataContextType = {
    rapportini: rapportini || [],
    tecnici: tecnici || [],
    ditte: ditte || [],
    categorie: categorie || [],
    veicoli: veicoli || [],
    clienti: clienti || [],
    tipiGiornata: tipiGiornata || [],
    navi: navi || [],
    luoghi: luoghi || [],
    sedi: sedi || [],
    webAppUsers: webAppUsers || [],
    qualifiche: qualifiche || [],
    documenti: documenti || [],
    ditteMap,
    categorieMap,
    tecniciMap,
    loading,
  };

  return <GlobalDataContext.Provider value={value}>{children}</GlobalDataContext.Provider>;
};

// Hook per consumare il contesto
export const useGlobalData = () => {
    const context = useContext(GlobalDataContext);
    if (context === undefined) {
        throw new Error('useGlobalData deve essere usato all\'interno di un GlobalDataProvider');
    }
    return context;
};
