
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { app } from "@/firebase"; // Importa l'istanza dell'app Firebase
import { useNotifications } from "@/contexts/NotificationContext";

const VAPID_KEY = "YOUR_VAPID_KEY_HERE"; // TODO: Sostituisci con la tua VAPID key da Firebase Console

/**
 * Richiede il permesso per le notifiche e ottiene il token FCM.
 */
export const requestPermissionAndGetToken = async () => {
  try {
    const messaging = getMessaging(app);
    const permission = await Notification.requestPermission();

    if (permission === "granted") {
      console.log("Permesso per le notifiche accordato.");
      const currentToken = await getToken(messaging, {
        vapidKey: VAPID_KEY,
      });

      if (currentToken) {
        console.log("Token FCM ottenuto:", currentToken);
        // Qui andrà la logica per salvare il token su Firestore, associandolo all'utente
        return currentToken;
      } else {
        console.log(
          "Nessun token di registrazione disponibile. Richiedi il permesso di notifica all'utente."
        );
      }
    } else {
      console.log("Permesso per le notifiche negato.");
    }
  } catch (error) {
    console.error("Errore durante l'ottenimento del token FCM:", error);
  }
  return null;
};

/**
 * Inizializza il listener per i messaggi FCM ricevuti quando l'app è in foreground.
 * @param addNotification Funzione per aggiungere la notifica allo stato del NotificationContext.
 */
export const initializeForegroundMessageListener = (addNotification) => {
  const messaging = getMessaging(app);
  onMessage(messaging, (payload) => {
    console.log("Messaggio ricevuto in foreground: ", payload);

    // Estrai i dati necessari e aggiungi la notifica allo stato globale
    const { notification, data } = payload;
    if (notification && data && data.notificationId) {
        const newNotification = {
            id: data.notificationId,
            title: notification.title || "Nuova Notifica",
            message: notification.body || "",
            createdAt: new Date(), // Usiamo la data di ricezione
            // ... altri campi potrebbero arrivare in `data`
        };
        addNotification(newNotification);
    }
  });
};
