// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getFunctions } from 'firebase/functions';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBlpnXKXYvh52cQtojfLsTFUcet-geKzqQ",
  authDomain: "riso-project-app.firebaseapp.com",
  databaseURL: "https://riso-project-app-default-rtdb.europe-west6.firebasedatabase.app",
  projectId: "riso-project-app",
  storageBucket: "riso-project-app.appspot.com",
  messagingSenderId: "157316892209",
  appId: "1:157316892209:web:d62e706690c966599bb710"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
// Correctly initialize Functions service pointing to the right region
const functions = getFunctions(app, 'europe-west6');

export { app, db, auth, functions };
