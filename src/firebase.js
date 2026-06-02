import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getDatabase } from 'firebase/database';
import { getMessaging } from 'firebase/messaging';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBlpnXKXYvh52cQtojfLsTFUcet-geKzqQ",
  authDomain: "riso-project-app.firebaseapp.com",
  databaseURL: "https://riso-project-app-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "riso-project-app",
  storageBucket: "riso-project-app.firebasestorage.app",
  messagingSenderId: "157316892209",
  appId: "1:157316892209:web:c591c034fa132e549bb710",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize other Firebase services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const database = getDatabase(app);
const messaging = getMessaging(app);

export { app, auth, db, storage, database, messaging };
