// CIAO. Importo le funzioni necessarie da Firebase.
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// CIAO. Leggo la configurazione dalle variabili d'ambiente di Vite.
// Questo è il modo sicuro per gestire le credenziali.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// CIAO. Inizializzo l'app Firebase con la configurazione.
const app = initializeApp(firebaseConfig);

// CIAO. Esporto le istanze dei servizi Firebase che useremo nell'app.
export const db = getFirestore(app); // Il database Firestore
export const auth = getAuth(app);    // Il servizio di autenticazione
