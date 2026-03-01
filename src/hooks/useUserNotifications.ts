
// CIAO. Correggo i percorsi di importazione.
import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, writeBatch, getDocs } from 'firebase/firestore';
import { db } from '@/utils/firebase';
import { useAuth } from '@/contexts/AuthProvider';

interface Notification {
  id: string;
  title: string;
  body: string;
  sender: string;
  read: boolean;
  createdAt: any;
}

export const useUserNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
        setLoading(false);
        return;
    }

    const notificationsRef = collection(db, 'tecnici', user.uid, 'notifiche');
    const q = query(notificationsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const userNotifications: Notification[] = [];
        let count = 0;
        snapshot.forEach(doc => {
            const data = doc.data();
            userNotifications.push({ id: doc.id, ...data } as Notification);
            if (!data.read) {
                count++;
            }
        });
        
        setNotifications(userNotifications);
        setUnreadCount(count);
        setLoading(false);
    }, (err) => {
        console.error("Errore nell'ascolto delle notifiche: ", err);
        setError(err);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const markAllAsRead = async () => {
    if (!user || unreadCount === 0) return;

    const notificationsRef = collection(db, 'tecnici', user.uid, 'notifiche');
    const unreadQuery = query(notificationsRef, where("read", "==", false));

    const batch = writeBatch(db);
    
    try {
        const snapshot = await getDocs(unreadQuery);
        snapshot.forEach(doc => {
            batch.update(doc.ref, { read: true });
        });
        await batch.commit();
    } catch (err) {
        console.error("Errore nel marcare le notifiche come lette: ", err as Error);
        setError(err as Error);
    }
  };

  return { notifications, unreadCount, loading, error, markAllAsRead };
};
