
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { app } from "@/firebase"; 
import { AppNotification } from "@/models/definitions";

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
        // Logic to save the token to Firestore, associating it with the user, will go here
        return currentToken;
      } else {
        console.log(
          "No registration token available. Request notification permission from the user."
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
 * @param addNotification Function to add the notification to the NotificationContext state.
 */
export const initializeForegroundMessageListener = (addNotification: (notification: AppNotification) => void) => {
  const messaging = getMessaging(app);
  onMessage(messaging, (payload) => {
    console.log("Message received in foreground: ", payload);

    const { notification, data } = payload;
    if (notification && data && data.notificationId) {
        const newNotification: AppNotification = {
            id: data.notificationId as string,
            title: notification.title || "New Notification",
            message: notification.body || "",
            createdAt: new Date(),
            isRead: false,
        };
        addNotification(newNotification);
    }
  });
};
