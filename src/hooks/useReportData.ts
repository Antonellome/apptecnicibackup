
import { useMemo } from 'react';
import { useGlobalData } from './useGlobalData';
import { Rapportino } from '@/models/definitions';

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
  // Questi dati sono garantiti essere pronti e sicuri quando loading è false.
  const { rapportini, masterData, loading } = useGlobalData();

  // Creo una mappa per cercare rapidamente i nomi dei tipi giornata tramite il loro ID.
  // Questo è molto più efficiente che ciclare l'array ogni volta.
  const tipiGiornataMap = useMemo(() => {
    if (loading || !masterData.tipiGiornata) return new Map<string, string>();
    return new Map(masterData.tipiGiornata.map(tg => [tg.id, tg.nome]));
  }, [masterData.tipiGiornata, loading]);

  // Arricchisco i rapportini con le informazioni aggiuntive (es. nome del tipo giornata).
  // Questo calcolo viene eseguito solo quando i dati di input cambiano.
  const enrichedRapportini = useMemo<EnrichedRapportino[]>(() => {
    // Se stiamo ancora caricando o non ci sono rapportini, restituisco un array vuoto.
    if (loading || !rapportini) return [];
    
    // Mappo ogni rapportino per creare un oggetto "arricchito".
    return rapportini.map(r => ({
      ...r,
      tipoGiornataNome: r.tipoGiornataId ? tipiGiornataMap.get(r.tipoGiornataId) : 'N/A',
    }));
  }, [rapportini, tipiGiornataMap, loading]);

  // Restituisco i dati pronti per la UI e lo stato di caricamento.
  return { rapportini: enrichedRapportini, loading };
};
