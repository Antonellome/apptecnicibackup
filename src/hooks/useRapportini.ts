/**
 * @file useRapportini.ts
 * @description Hook specializzato per recuperare l'elenco dei rapportini per il tecnico autenticato.
 *
 * OBIETTIVO E ARCHITETTURA (POST-REFACTORING):
 * Questo hook è stato semplificato per allinearsi alla nuova architettura basata sul MasterDataProvider.
 * La sua unica responsabilità ora è caricare l'elenco dei rapportini dell'utente, senza occuparsi
 * dei dati anagrafici associati, che sono gestiti a livello globale.
 *
 * PRINCIPIO CHIAVE:
 * 1. CARICAMENTO SINGOLO: Utilizza `getDocs` per eseguire una singola query all'avvio, invece di
 *    mantenere un listener in tempo reale (`onSnapshot`). Questo è più efficiente per dati che non
 *    necessitano di aggiornamenti istantanei e riduce i costi di lettura di Firestore.
 * 2. EFFICIENZA DELLA QUERY: La query rimane mirata sull'utente loggato, garantendo che solo i dati
 *    pertinenti vengano scaricati.
 * 3. DIPENDENZA IMPLICITA: L'hook non sa nulla dei dati master. Si fida che un altro sistema
 *    (il `MasterDataProvider`) fornirà i dati necessari al componente che lo utilizza (es. `ReportListPage`)
 *    per risolvere gli ID in nomi leggibili.
 */

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore'; // Importa getDocs
import { db } from '@/firebase';
import { useAuth } from '@/hooks/useAuth';
import { Rapportino } from '@/models/definitions';

export const useRapportini = () => {
  const { user } = useAuth();
  const [rapportini, setRapportini] = useState<Rapportino[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Funzione asincrona per caricare i dati
    const fetchRapportini = async () => {
      if (!user) {
        setRapportini([]);
        setLoading(false);
        return;
      }

      console.log(`useRapportini: Avvio fetch per i rapportini dell'utente ${user.uid}`);
      setLoading(true);

      try {
        // La query è identica a prima, ma useremo getDocs per un caricamento singolo.
        const q = query(
          collection(db, 'rapportini'),
          where('partecipanti', 'array-contains', user.uid),
          orderBy('header.dataIntervento', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Rapportino[];
        
        setRapportini(data);
        setError(null);
        console.log(`useRapportini: ${data.length} rapportini caricati con successo.`);

      } catch (err: any) {
        console.error('useRapportini: Errore durante il fetch dei rapportini:', err);
        // Questo errore può ancora indicare un indice mancante, ma ora viene gestito nel catch.
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchRapportini();

    // L'array delle dipendenze [user] assicura che il fetch venga rieseguito solo se l'utente cambia.
  }, [user]);

  return { rapportini, loading, error };
};
