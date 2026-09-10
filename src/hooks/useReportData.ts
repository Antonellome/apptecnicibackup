
import { useMemo } from 'react';
import { useGlobalData } from './useGlobalData';
import { Rapportino, TipoGiornata } from '@/models/definitions';

// Definisco un'interfaccia estesa per il rapportino arricchito
export interface EnrichedRapportino extends Rapportino {
  tipoGiornataNome?: string;
}

/**
 * Hook per ottenere i dati dei rapportini già processati e pronti per la UI.
 * Utilizza i dati sicuri forniti da GlobalDataProvider.
 */
export const useReportData = () => {
  // Accedo ai dati globali e allo stato di caricamento.
  const { masterData, loading } = useGlobalData();
  const rapportini: Rapportino[] = []; // Array vuoto temporaneo per evitare errori

  // Creo una mappa per cercare rapidamente i nomi dei tipi giornata tramite il loro ID.
  const tipiGiornataMap = useMemo(() => {
    if (loading || !masterData?.tipiGiornata) return new Map<string, string>();
    return new Map(masterData.tipiGiornata.map((tg: TipoGiornata) => [tg.id, tg.nome]));
  }, [masterData, loading]);

  // Arricchisco i rapportini con le informazioni aggiuntive (es. nome del tipo giornata).
  const enrichedRapportini = useMemo<EnrichedRapportino[]>(() => {
    if (loading || !rapportini) return [];
    
    return rapportini.map((r: Rapportino) => ({
      ...r,
      tipoGiornataNome: r.tipoGiornataId ? tipiGiornataMap.get(r.tipoGiornataId) : 'N/A',
    }));
  }, [rapportini, tipiGiornataMap, loading]);

  // Restituisco i dati pronti per la UI e lo stato di caricamento.
  return { rapportini: enrichedRapportini, loading };
};
