
import React, { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/local-db'; // Importa l'istanza di Dexie
import { useAuth } from '@/hooks/useAuth';
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
} from '@/models/definitions';
import { GlobalDataContext, IGlobalDataContext } from '../contexts/GlobalDataContext';

// --- PROVIDER COMPONENT ---
export const GlobalDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();

  // --- LETTURA DATI ESCLUSIVAMENTE DA DEXIE (DATABASE LOCALE) ---
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
  
  // Calcola lo stato di caricamento basandosi sulla disponibilità dei dati da Dexie.
  // useLiveQuery restituisce `undefined` mentre la query è in corso.
  const dataLoading = 
      rapportini === undefined || tecnici === undefined || ditte === undefined || categorie === undefined || 
      veicoli === undefined || clienti === undefined || tipiGiornata === undefined || navi === undefined || 
      luoghi === undefined || sedi === undefined || webAppUsers === undefined || qualifiche === undefined || 
      documenti === undefined;

  const loading = authLoading || dataLoading;
  
  // Creazione delle mappe memoizzate per ottimizzare le performance
  const ditteMap = useMemo(() => new Map((ditte || []).map(d => [d.id, d])), [ditte]);
  const categorieMap = useMemo(() => new Map((categorie || []).map(c => [c.id, c])), [categorie]);
  const tecniciMap = useMemo(() => new Map((tecnici || []).map(t => [t.id, t])), [tecnici]);

  const value: IGlobalDataContext = {
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
