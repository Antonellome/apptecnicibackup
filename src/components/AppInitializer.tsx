
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSyncManager } from '@/hooks/useSyncManager'; // Importa il nuovo hook
import { requestPermissionAndGetToken, initializeForegroundMessageListener } from '@/utils/fcm';

/**
 * Questo componente gestisce le inizializzazioni a livello di applicazione
 * che dipendono dal contesto Auth e non solo.
 * Non renderizza alcun output visivo.
 */
export const AppInitializer = () => {
  const { userProfile } = useAuth();

  // Inizializza il gestore di sincronizzazione offline.
  // Questo hook ora gestisce autonomamente lo stato online/offline
  // e avvia la sincronizzazione quando necessario.
  useSyncManager();

  // 1. Richiede il permesso FCM e salva il token quando l'utente è loggato.
  useEffect(() => {
    if (userProfile?.tecnicoId) {
      console.log('AppInitializer: Profilo utente pronto, richiedo il token FCM.');
      requestPermissionAndGetToken();
    }
  }, [userProfile?.tecnicoId]); // Eseguito ogni volta che tecnicoId cambia.

  // 2. Inizializza il listener per i messaggi FCM in foreground.
  useEffect(() => {
    console.log('AppInitializer: Imposto il listener per i messaggi in foreground.');
    initializeForegroundMessageListener();
  }, []); // L'array di dipendenze vuoto assicura che venga eseguito una sola volta.

  return null; // Componente non renderizzante.
};
