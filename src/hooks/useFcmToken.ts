
import { useEffect } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc } from 'firebase/firestore';
import { db, messaging } from '@/firebase';
import { useAuth } from './useAuth';

export const useFcmToken = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const requestPermission = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          const currentToken = await getToken(messaging, {
            vapidKey: 'BIvIQohxlYqW7gficYtCso06NArpaqE0va_j1PRJ63W159OTpQk-Be_nW9PLd-_46l4YqKC4W2iOVoORNocHbyk',
          });

          if (currentToken) {
            const userDocRef = doc(db, 'tecnici', user.uid);
            await updateDoc(userDocRef, { fcmToken: currentToken });
          } else {
            console.log('No registration token available. Request permission to generate one.');
          }
        }
      } catch (error) {
        console.error('An error occurred while retrieving token. ', error);
      }
    };

    requestPermission();

    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Message received. ', payload);
      // Handle foreground message
    });

    return () => unsubscribe();
  }, [user]);
};
