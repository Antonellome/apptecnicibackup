
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { app } from "@/firebase"; 

const VAPID_KEY = "YOUR_VAPID_KEY_HERE"; // TODO: Replace with your VAPID key from Firebase Console

/**
 * Requests permission for notifications and gets the FCM token.
 */
export const requestPermissionAndGetToken = async () => {
  try {
    const messaging = getMessaging(app);
    const permission = await Notification.requestPermission();

    if (permission === "granted") {
      console.log("Notification permission granted.");
      const currentToken = await getToken(messaging, {
        vapidKey: VAPID_KEY,
      });

      if (currentToken) {
        console.log("FCM Token obtained:", currentToken);
        // In a real app, you would send this token to your server.
        return currentToken;
      } else {
        console.log(
          "No registration token available. Request permission from the user."
        );
      }
    } else {
      console.log("Notification permission denied.");
    }
  } catch (error) {
    console.error("Error while getting FCM token:", error);
  }
  return null;
};

/**
 * Initializes the listener for FCM messages received when the app is in the foreground.
 */
export const initializeForegroundMessageListener = () => {
  const messaging = getMessaging(app);
  onMessage(messaging, (payload) => {
    console.log("Message received in foreground: ", payload);
    // The NotificationProvider, listening to Firestore, will handle the update.
    // No direct client-side state manipulation is needed here.
  });
};
