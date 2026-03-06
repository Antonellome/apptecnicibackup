import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db, app } from "./firebase";

const VAPID_KEY = "BIvIQohxlYqW7gficYtCso06NArpaqE0va_j1PRJ63W159OTpQk-Be_nW9PLd-_46l4YqKC4W2iOVoORNocHbyk";

/**
 * Normalizza il nome di una categoria per renderlo un topic FCM valido.
 * Deve corrispondere esattamente alla logica usata nell'app Master.
 */
export const normalizeTopicName = (name: string): string => {
  return name.replace(/[^a-zA-Z0-9-_.~%]+/g, '_').replace(/\s+/g, '_');
};

/**
 * Tenta di registrare il dispositivo per le notifiche.
 * 1. Richiede esplicitamente il permesso all'utente.
 * 2. Se concesso, ottiene il token FCM.
 * 3. Salva il token in Firestore.
 * Restituisce un booleano che indica il successo dell'operazione.
 */
export const requestAndSaveToken = async (userId: string): Promise<boolean> => {
  if (!userId) {
    console.error("ID utente non fornito.");
    return false;
  }

  try {
    const permission = await Notification.requestPermission();

    if (permission === "granted") {
      console.log("Permesso concesso dall'utente.");
      const messaging = getMessaging(app);
      const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });

      if (currentToken) {
        console.log("Token FCM ottenuto:", currentToken);
        const userDocRef = doc(db, "tecnici", userId);
        await updateDoc(userDocRef, {
          fcmToken: currentToken,
          fcmTokenLastUpdated: serverTimestamp(),
        });
        console.log("Token FCM salvato con successo per l'utente:", userId);
        return true;
      } else {
        console.log("Impossibile ottenere il token FCM anche con permesso concesso.");
        return false;
      }
    }
    
    console.log("Permesso per le notifiche non concesso dall'utente.");
    return false;

  } catch (error) {
    console.error("Errore durante la richiesta del permesso o del token FCM:", error);
    return false;
  }
};


/**
 * Imposta l'ascoltatore per i messaggi ricevuti quando l'app è in primo piano.
 */
export const initializeOnMessageListener = (showAlertCallback: (title: string, message: string) => void) => {
  const messaging = getMessaging(app);
  onMessage(messaging, (payload) => {
    console.log("Messaggio ricevuto in primo piano: ", payload);
    
    if (payload.notification) {
        showAlertCallback(payload.notification.title || 'Nuova Notifica', payload.notification.body || '');
    }
  });
};

// Rimuovo la funzione getAndSaveToken che si basava su un permesso implicito.
// Era quella la fonte dei miei errori.