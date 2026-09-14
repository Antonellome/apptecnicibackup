
import { useGlobalData } from './useGlobalData';
import { useEnrichedRapportini } from './useEnrichedRapportini'; // Importa il nuovo hook

// L'interfaccia EnrichedRapportino è già definita in useEnrichedRapportini, quindi non è necessario duplicarla qui.

/**
 * Hook per ottenere i dati dei rapportini già processati e pronti per la UI.
 * Utilizza i dati forniti dall'hook useEnrichedRapportini.
 */
export const useReportData = () => {
  // Utilizza l'hook corretto per ottenere i rapportini arricchiti
  const { rapportini, isLoading, error } = useEnrichedRapportini();
  const { masterData, loading: masterDataLoading } = useGlobalData();

  // Non è più necessario arricchire i rapportini qui, 
  // poiché useEnrichedRapportini lo fa già.
  // La logica di mappatura di tipiGiornataMap è già gestita in useEnrichedRapportini.

  // La loading state ora dipende sia dal caricamento dei rapportini che dei masterData
  const loading = isLoading || masterDataLoading;

  // Restituisco i dati pronti per la UI e lo stato di caricamento.
  return { rapportini, loading, error, masterData }; // Aggiungo masterData al ritorno se necessario in altri componenti
};
