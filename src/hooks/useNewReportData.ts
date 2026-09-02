import { useMasterData } from '@/hooks/useMasterData';

/**
 * Hook per caricare tutti i dati necessari per il form di nuovo report.
 * Questo hook ora funge da wrapper per useMasterData, 
 * esponendo solo i dati necessari per i form.
 */
export const useNewReportData = () => {
  const { masterData, loading, error } = useMasterData();

  // Ritorna le anagrafiche specifiche e gli stati di caricamento/errore
  // presi direttamente dal master context.
  return {
    tipiGiornata: masterData?.tipiGiornata || [],
    tecnici: masterData?.tecnici || [],
    navi: masterData?.navi || [],
    luoghi: masterData?.luoghi || [],
    veicoli: masterData?.veicoli || [],
    clienti: masterData?.clienti || [],
    loading,
    error,
  };
};
