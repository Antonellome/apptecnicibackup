
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";

// Configurazione copiata da src/firebase.js
const firebaseConfig = {
  apiKey: "AIzaSyBlpnXKXYvh52cQtojfLsTFUcet-geKzqQ",
  authDomain: "riso-project-app.firebaseapp.com",
  projectId: "riso-project-app",
  storageBucket: "riso-project-app.firebasestorage.app",
  messagingSenderId: "157316892209",
  appId: "1:157316892209:web:d62e706690c966599bb710"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const userId = "sm6w10dUiHcEs5p1zdFmWlreKAd2";

async function createUserProfile() {
  try {
    console.log(`Creo il profilo per l\'utente ${userId} nella collezione 'tecnici'...`);
    const userDocRef = doc(db, 'tecnici', userId);
    await setDoc(userDocRef, { accessoApp: true });
    console.log("PROFILO CREATO CON SUCCESSO.");
    console.log("Ora puoi accedere.");
  } catch (error) {
    console.error("ERRORE DURANTE LA CREAZIONE DEL PROFILO:", error);
  }
}

createUserProfile().then(() => {
    // Disconnessione forzata per terminare lo script
    process.exit(0);
});
