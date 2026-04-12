/**
 * @file MasterDataProvider.tsx
 * @description Questo file definisce un contesto React e un provider per la gestione dei "dati master" dell'applicazione.
 *
 * OBIETTIVO E ARCHITETTURA:
 * In linea con le direttive del "Manuale Operativo" (ISTRUZIONI_TECNICI.md), questo provider ha il compito ESCLUSIVO
 * di recuperare i dati anagrafici (es. Clienti, Navi, Luoghi) che cambiano raramente.
 *
 * PRINCIPIO CHIAVE:
 * 1. EFFICIENZA: Invece di aprire molteplici listener su Firestore, viene eseguita UNA SOLA chiamata
 *    alla Cloud Function `getMasterData` per recuperare tutti i dati necessari in un colpo solo.
 * 2. CENTRALIZZAZIONE: Fornisce un unico punto di verità ("Single Source of Truth") per i dati master,
 *    rendendoli disponibili a tutta l'applicazione tramite l'hook `useMasterData`.
 * 3. DIPENDENZA DALL'AUTH: Il recupero dei dati viene attivato SOLO dopo che l'utente ha effettuato
 *    correttamente il login, come indicato dall' `AuthProvider`.
 *
 * Questo approccio sostituisce il vecchio `GlobalDataProvider` che caricava in modo inefficiente tutte le collezioni
 * all'avvio, causando lentezza e violando le regole architetturali.
 */

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from '@/hooks/useAuth'; // Dipendenza fondamentale per sapere quando l'utente è loggato
import type { Cliente, Nave, Luogo, Categoria, Ditta, Tecnico, TipoGiornata, Veicolo } from '@/models/definitions';

// --- 1. Interfacce e Tipi ---
// Definisce la forma dei dati che la Cloud Function `getMasterData` dovrebbe restituire.
export interface MasterData {
  clienti: Cliente[];
  navi: Nave[];
  luoghi: Luogo[];
  categorie: Categoria[];
  ditte: Ditta[];
  tecnici: Tecnico[];
  tipiGiornata: TipoGiornata[];
  veicoli: Veicolo[];
}

// Definisce la forma del nostro contesto: i dati più lo stato di caricamento/errore.
export interface IMasterDataContext {
  masterData: MasterData | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void; // Funzione per forzare un nuovo caricamento
}

// --- 2. Creazione del Contesto ---
// Viene creato con `undefined` come valore di default. Se usato fuori dal Provider, lancerà un errore.
const MasterDataContext = createContext<IMasterDataContext | undefined>(undefined);

// --- 3. Hook Personalizzato (`useMasterData`) ---
// Questo è il modo in cui i componenti accederanno ai dati.
// Semplifica l'uso del contesto e garantisce che venga usato correttamente.
export const useMasterData = () => {
  const context = useContext(MasterDataContext);
  if (context === undefined) {
    throw new Error('useMasterData deve essere usato all\'interno di un MasterDataProvider');
  }
  return context;
};

// --- 4. Il Provider Component (`MasterDataProvider`) ---
export const MasterDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth(); // Recuperiamo l'utente dal contesto di autenticazione.
  const [masterData, setMasterData] = useState<MasterData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  // Un trigger per forzare il re-fetch dei dati
  const [fetchTrigger, setFetchTrigger] = useState(0); 

  // La funzione per forzare il ricaricamento
  const refetch = () => setFetchTrigger(prev => prev + 1);

  // L'effetto che recupera i dati.
  // Si attiva quando l'utente cambia (login/logout) o quando `fetchTrigger` viene incrementato.
  useEffect(() => {
    // Se non c'è un utente loggato, non fare nulla e resetta lo stato.
    if (!user) {
      setMasterData(null);
      setLoading(false);
      setError(null);
      return;
    }

    // Funzione asincrona per chiamare la Cloud Function.
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      // console.log("MasterDataProvider: Inizio recupero dati master...");

      try {
        const functions = getFunctions();
        const getMasterData = httpsCallable<void, MasterData>(functions, 'getMasterData');
        const result = await getMasterData();
        setMasterData(result.data);
        // console.log("MasterDataProvider: Dati master recuperati con successo.", result.data);
      } catch (err: any) {
        console.error("MasterDataProvider: Errore nel recupero dei dati master.", err);
        setMasterData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

  }, [user, fetchTrigger]); // Dipendenze dell'effetto

  // Memoizziamo il valore del contesto per evitare re-render non necessari
  const value = useMemo(() => ({
    masterData,
    loading,
    error,
    refetch
  }), [masterData, loading, error]);

  return (
    <MasterDataContext.Provider value={value}>
      {children}
    </MasterDataContext.Provider>
  );
};
