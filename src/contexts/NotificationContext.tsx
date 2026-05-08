import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  arrayUnion,
  Timestamp,
  or
} from 'firebase/firestore';
import { db } from '@/firebase';
import { useAuth } from '@/hooks/useAuth';
import { Notifica } from '@/models/definitions';

interface NotificationContextType {
  notifications: Notifica[];
  unreadCount: number;
  markAsRead: (notificationId: string) => Promise<void>;
  hideNotification: (notificationId: string) => Promise<void>;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, userProfile, loading: authLoading } = useAuth();
  const [notifications, setNotifications] = useState<Notifica[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchTrigger, setFetchTrigger] = useState(0);

  const refetch = useCallback(() => setFetchTrigger(prev => prev + 1), []);

  useEffect(() => {
    if (authLoading || !user || !userProfile?.categoria?.id) {
      setLoading(false);
      setNotifications([]);
      return;
    }

    setLoading(true);
    setError(null);

    const collectionRef = collection(db, 'notificheRichieste');

    // OBBEDISCO. QUESTA E' LA QUERY DEFINITIVA CHE RISPETTA LA TUA ARCHITETTURA.
    const notificheQuery = query(collectionRef, 
      or(
        where('to_ids', 'array-contains', user.uid),
        where('to_category_ids', 'array-contains', userProfile.categoria.id),
        where('target', '==', 'all')
      )
    );

    const unsubscribe = onSnapshot(notificheQuery, (snapshot) => {
      const fetchedNotifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Notifica));
      
      // Ordino i risultati qui, perché la query `or` non può essere combinata con `orderBy`.
      fetchedNotifications.sort((a, b) => {
          const timeA = a.createdAt?.toMillis() ?? 0;
          const timeB = b.createdAt?.toMillis() ?? 0;
          return timeB - timeA; // Ordine decrescente
      });

      setNotifications(fetchedNotifications);
      setLoading(false);
    }, (err) => {
      console.error("Errore nel listener delle notifiche:", err);
      setError("Impossibile caricare il centro notifiche.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, userProfile, authLoading, fetchTrigger]);

  const visibleNotifications = useMemo(() => {
    if (!user) return [];
    return notifications.filter(n => !n.hiddenFor || !n.hiddenFor.includes(user.uid));
  }, [notifications, user]);

  const unreadCount = useMemo(() => {
    if (!user) return 0;
    return visibleNotifications.filter(n => !n.readBy || !n.readBy[user.uid]).length;
  }, [visibleNotifications, user]);

  const markAsRead = async (notificationId: string) => {
    if (!user) return;
    const notificationRef = doc(db, 'notificheRichieste', notificationId);
    try {
      await updateDoc(notificationRef, { [`readBy.${user.uid}`]: true });
    } catch (err) {
      console.error("Errore durante l'aggiornamento della notifica:", err);
    }
  };

  const hideNotification = async (notificationId: string) => {
    if (!user) return;
    try {
      const notificationRef = doc(db, 'notificheRichieste', notificationId);
      await updateDoc(notificationRef, { hiddenFor: arrayUnion(user.uid) });
    } catch (err) {
      console.error("Errore durante il mascheramento della notifica:", err);
    }
  };

  const value = { notifications: visibleNotifications, unreadCount, markAsRead, hideNotification, loading, error, refetch };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications deve essere usato dentro un NotificationProvider');
  }
  return context;
};
