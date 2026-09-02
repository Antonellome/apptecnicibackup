
import { createContext, useContext } from 'react';
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

export const GlobalDataContext = createContext<IGlobalDataContext | undefined>(undefined);

export const useGlobalData = () => {
  const context = useContext(GlobalDataContext);
  if (!context) {
    throw new Error('useGlobalData must be used within a GlobalDataProvider');
  }
  return context;
};
