
// Import and configure the Firebase SDK
// These scripts are loaded in the service worker environment
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: "AIzaSyBlpnXKXYvh52cQtojfLsTFUcet-geKzqQ",
    authDomain: "riso-project-app.firebaseapp.com",
    databaseURL: "https://riso-project-app-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "riso-project-app",
    storageBucket: "riso-project-app.firebasestorage.app",
    messagingSenderId: "157316892209",
    appId: "1:157316892209:web:c591c034fa132e549bb710"
};

const app = firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging(app);

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: './vite.svg' 
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
