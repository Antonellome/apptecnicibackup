
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { requestPermissionAndGetToken, initializeForegroundMessageListener } from '@/utils/fcm';

/**
 * Questo componente gestisce le inizializzazioni a livello di applicazione
 * che dipendono dal contesto Auth.
 * Non renderizza alcun output visivo.
 */
export const AppInitializer = () => {
  const { userProfile } = useAuth();

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
    
    // La funzione non richiede più un callback. Il NotificationProvider
    // si aggiornerà autonomamente tramite il suo listener su Firestore.
    initializeForegroundMessageListener();
    
    // Questo listener viene impostato una sola volta per l'intera vita dell'app.
  }, []); // L'array di dipendenze vuoto assicura che venga eseguito una sola volta.

  return null; // Componente non renderizzante.
};
