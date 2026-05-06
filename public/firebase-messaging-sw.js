importScripts("https://www.gstatic.com/firebasejs/9.2.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.2.0/firebase-messaging-compat.js");

const firebaseConfig = {
    apiKey: "AIzaSyBlpnXKXYvh52cQtojfLsTFUcet-geKzqQ",
    authDomain: "riso-project-app.firebaseapp.com",
    databaseURL: "https://riso-project-app-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "riso-project-app",
    storageBucket: "riso-project-app.firebasestorage.app",
    messagingSenderId: "157316892209",
    appId: "1:157316892209:web:c591c034fa132e549bb710"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log("[firebase-messaging-sw.js] Received background message ", payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo192.png' // Assicurati che il file esista
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
