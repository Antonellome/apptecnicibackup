import { getMessaging, getToken } from "firebase/messaging";
import { app } from "@/firebase"; // Correzione del percorso di importazione

const VAPID_KEY = "BD6fO2Yy_7rM3sCME3e-C55a-3KkQ81odS21y5Wn1t2N7dO6EGh22h2fAgnYy5tDbkE1Twd2aT8hEx52f95TKAo";

export const initializeFCM = async () => {
  console.log("Inizializzazione FCM...");
  try {
    const messaging = getMessaging(app);

    // Registra esplicitamente il nostro service worker isolato
    const serviceWorkerRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    console.log('Service Worker di Firebase Messaging registrato con successo:', serviceWorkerRegistration);

    // Ottieni il token, passando la registrazione corretta
    const fcmToken = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: serviceWorkerRegistration,
    });

    if (fcmToken) {
      console.log('Token FCM recuperato con successo:', fcmToken);
      return fcmToken;
    } else {
      console.log('Nessun token di registrazione disponibile. Richiedere il permesso per generarne uno.');
      return null;
    }
  } catch (error) {
    console.error('Errore durante l\'inizializzazione di FCM:', error);
    // Rilancia l'errore per poterlo gestire nel contesto
    throw error;
  }
};
