import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import type { TipoGiornata, Tecnico, Nave, Luogo, Veicolo } from '../models/definitions';

// Funzione generica per recuperare una collezione da Firestore
const fetchCollection = async <T>(collectionName: string): Promise<T[]> => {
  const querySnapshot = await getDocs(collection(db, collectionName));
  // Mappa i documenti aggiungendo l'ID a ciascun oggetto
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as T[];
};

/**
 * Hook per caricare tutti i dati necessari per il form di nuovo report.
 * Gestisce lo stato di caricamento e gli errori.
 */
export const useNewReportData = () => {
  const [tipiGiornata, setTipiGiornata] = useState<TipoGiornata[]>([]);
  const [tecnici, setTecnici] = useState<Tecnico[]>([]);
  const [navi, setNavi] = useState<Nave[]>([]);
  const [luoghi, setLuoghi] = useState<Luogo[]>([]);
  const [veicoli, setVeicoli] = useState<Veicolo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);

        // Esegue tutte le operazioni di fetch in parallelo per ottimizzare i tempi
        const [
          tipiGiornataData,
          tecniciData,
          naviData,
          luoghiData,
          veicoliData,
        ] = await Promise.all([
          fetchCollection<TipoGiornata>('tipiGiornata'),
          fetchCollection<Tecnico>('tecnici'),
          fetchCollection<Nave>('navi'),
          fetchCollection<Luogo>('luoghi'),
          fetchCollection<Veicolo>('veicoli'),
        ]);

        // Aggiorna gli stati con i dati recuperati
        setTipiGiornata(tipiGiornataData);
        setTecnici(tecniciData);
        setNavi(naviData);
        setLuoghi(luoghiData);
        setVeicoli(veicoliData);
        setError(null); // Resetta eventuali errori precedenti

      } catch (err) {
        console.error("Errore durante il recupero dei dati da Firestore:", err);
        setError(err as Error);
      } finally {
        setLoading(false); // Imposta il caricamento a false in ogni caso (successo o errore)
      }
    };

    fetchAllData();
  }, []); // L'array di dipendenze vuoto assicura che l'effetto venga eseguito solo al montaggio del componente

  // Ritorna tutti i dati e gli stati necessari al componente che userà l'hook
  return { tipiGiornata, tecnici, navi, luoghi, veicoli, loading, error };
};
