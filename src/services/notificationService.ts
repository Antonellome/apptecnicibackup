
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/firebase"; // Importo l'istanza dell'app Firebase

/**
 * Chiama la Cloud Function 'markNotificationAsRead' per marcare 
 * una notifica come letta sul server.
 *
 * @param {string} notificationId L'ID del documento della notifica in Firestore.
 * @returns {Promise<boolean>} Ritorna true in caso di successo, false altrimenti.
 */
export const markNotificationAsReadOnServer = async (notificationId: string): Promise<boolean> => {
  if (!notificationId) {
    console.error("ID notifica non fornito. Impossibile procedere.");
    return false;
  }

  try {
    const functions = getFunctions(app, 'europe-west1');
    const markAsRead = httpsCallable(functions, 'markNotificationAsRead');
    
    console.log(`[CLIENT] Chiamata a markNotificationAsRead per la notifica: ${notificationId}`);
    
    const result = await markAsRead({ notificationId: notificationId });
    
    const data = result.data as { status: string; message?: string };

    if (data.status === 'success') {
      console.log(`[SERVER] Successo: ${data.message}`);
      return true;
    } else {
      console.error("[SERVER] La funzione ha risposto con un errore:", data.message);
      return false;
    }

  } catch (error: any) {
    console.error("[CLIENT] Errore di rete o di permessi durante la chiamata alla funzione:", error.message);
    return false;
  }
};
