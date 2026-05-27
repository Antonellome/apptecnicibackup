
import { initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';

const firebaseConfig = {
    apiKey: "AIzaSyBlpnXKXYvh52cQtojfLsTFUcet-geKzqQ",
    authDomain: "riso-project-app.firebaseapp.com",
    databaseURL: "https://riso-project-app-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "riso-project-app",
    storageBucket: "riso-project-app.firebasestorage.app",
    messagingSenderId: "157316892209",
    appId: "1:157316892209:web:c591c034fa132e549bb710"
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

onBackgroundMessage(messaging, (payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: './vite.svg' // Puoi cambiare questa icona con il tuo logo
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
