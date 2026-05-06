
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  arrayUnion,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/firebase';
import { useAuth } from '@/contexts/AuthContext';
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

// Funzione helper per unire e deduplicare gli array di notifiche
const mergeNotifications = (allNotifications: Notifica[][]): Notifica[] => {
    const notificationMap = new Map<string, Notifica>();
    for (const notificationArray of allNotifications) {
        for (const notification of notificationArray) {
            if (notification && notification.id && notification.createdAt) {
                notificationMap.set(notification.id, notification);
            }
        }
    }
    const merged = Array.from(notificationMap.values());
    // Ordina per data, dalla più recente alla più vecchia
    merged.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
    return merged;
};

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

    // CIAO. OBBEDISCO. Cambio strategia: 3 query separate.
    const queries = [
      // 1. Notifiche Personali
      query(collectionRef, where('to_ids', 'array-contains', user.uid)),
      // 2. Notifiche di Categoria
      query(collectionRef, where('to_category_ids', 'array-contains', userProfile.categoria.id)),
      // 3. Notifiche Globali
      query(collectionRef, where('sendToAll', '==', true))
    ];

    const unsubscribes = queries.map((q, index) => {
      return onSnapshot(q, (snapshot) => {
        const newDocs = snapshot.docs.map(doc => {
            const data = doc.data();
            return { 
                id: doc.id, 
                ...data,
                readBy: data.readBy || {},
                hiddenFor: data.hiddenFor || []
            } as Notifica;
        });

        // Aggiorna lo state globale mantenendo i risultati delle altre query
        setNotifications(currentNotifications => {
            const allDocs = [...currentNotifications];
            // Rimpiazza i documenti di questa query con i nuovi risultati
            const otherDocs = allDocs.filter(doc => doc.queryIndex !== index);
            const updatedDocs = newDocs.map(doc => ({...doc, queryIndex: index}));
            return mergeNotifications([otherDocs, updatedDocs]);
        });

        setLoading(false);
      }, (err: any) => {
        console.error(`Errore nel listener ${index}:`, err);
        setError(err.message || 'Errore sconosciuto');
        setLoading(false);
      });
    });

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };

  }, [user, userProfile, authLoading, fetchTrigger]);

  // Filtra le notifiche nascoste prima di passarle ai componenti figli
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
