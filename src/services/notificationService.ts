
import { addSyncEvent } from './dataSync';
import { auth } from '@/firebase';

/**
 * Accoda un evento 'NOTIFICATION_READ' nella coda di sincronizzazione locale
 * per marcare una notifica come letta in modo asincrono.
 *
 * @param {string} notificationId L'ID della notifica da marcare come letta.
 * @returns {Promise<boolean>} Ritorna true se l'evento è stato accodato con successo, false altrimenti.
 */
export const markNotificationAsRead = async (notificationId: string): Promise<boolean> => {
  const user = auth.currentUser;

  if (!user) {
    console.error("Utente non autenticato. Impossibile marcare la notifica come letta.");
    return false;
  }

  if (!notificationId) {
    console.error("ID notifica non fornito. Impossibile procedere.");
    return false;
  }

  try {
    // Aggiunta l'asserzione 'as const' per garantire il tipo letterale corretto
    const event = {
      type: 'NOTIFICATION_READ' as const,
      payload: {
        notificationId,
        readByUserId: user.uid,
      },
      timestamp: new Date().toISOString(),
    };

    await addSyncEvent(event);
    console.log(`[SYNC] Evento NOTIFICATION_READ accodato per la notifica: ${notificationId}`);
    return true;

  } catch (error) {
    console.error("[SYNC] Errore durante l'accodamento dell'evento di lettura notifica:", error);
    return false;
  }
};
