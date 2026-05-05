import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  arrayUnion,
  or,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Notifica } from '@/models/definitions';

// --- INTERFACCIA E CONTESTO DEFINITI CORRETTAMENTE ---
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

    let unsubscribe: () => void = () => {};

    const setupListener = () => {
      unsubscribe();
      setLoading(true);
      setError(null);

      const finalQuery = query(
        collection(db, 'notificheRichieste'),
        or(
          where('to_ids', 'array-contains', user.uid),
          where('to_category_ids', 'array-contains', userProfile.categoria.id),
          where('sendToAll', '==', true)
        )
      );

      unsubscribe = onSnapshot(finalQuery,
        (snapshot) => {
          const docs = snapshot.docs.map(doc => {
            const data = doc.data();
            return { 
                id: doc.id, 
                ...data,
                // Assicura che questi campi esistano sempre
                readBy: data.readBy || {},
                hiddenFor: data.hiddenFor || []
            } as Notifica;
          });

          // --- LOGICA DIFENSIVA ---
          const validDocs = docs.filter(doc => {
            const hasTimestamp = doc.createdAt && doc.createdAt instanceof Timestamp;
            if (!hasTimestamp) {
              console.warn("Documento notifica scartato per mancanza di timestamp valido:", doc.id);
            }
            return hasTimestamp;
          });

          validDocs.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
          
          const visibleDocs = validDocs.filter(doc => !doc.hiddenFor.includes(user.uid));

          setNotifications(visibleDocs);
          setLoading(false);
        },
        (err: any) => {
          console.error("Errore nel listener delle notifiche:", err);
          setError(err.message || 'Errore sconosciuto');
          setLoading(false);
        }
      );
    };

    const handleVisibilityChange = () => {
        if (document.hidden) {
            unsubscribe();
            console.log("Notification listener scollegato (app in background).");
        } else {
            console.log("App in primo piano, ricollego il listener delle notifiche.");
            setupListener();
        }
    };

    setupListener();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };

  }, [user, userProfile, authLoading, fetchTrigger]);

  // --- CODICE FUNZIONALITÀ RIPRISTINATO ---
  const unreadCount = useMemo(() => {
      if (!user) return 0;
      return notifications.filter(n => !n.readBy[user.uid]).length;
  }, [notifications, user]);

  const markAsRead = async (notificationId: string) => {
      if (!user) return;
      try {
          const notificationRef = doc(db, 'notificheRichieste', notificationId);
          await updateDoc(notificationRef, { [`readBy.${user.uid}`]: true });
          setNotifications(prev => prev.map(n => 
              n.id === notificationId 
                  ? { ...n, readBy: { ...n.readBy, [user.uid]: true } } 
                  : n
          ));
      } catch (err) {
          console.error("Errore durante l'aggiornamento della notifica:", err);
      }
  };

  const hideNotification = async (notificationId: string) => {
    if (!user) return;
    try {
      const notificationRef = doc(db, 'notificheRichieste', notificationId);
      await updateDoc(notificationRef, { hiddenFor: arrayUnion(user.uid) });
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (err) {
      console.error("Errore durante il mascheramento della notifica:", err);
    }
  };

  const value = { notifications, unreadCount, markAsRead, hideNotification, loading, error, refetch };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications deve essere usato dentro un NotificationProvider');
  }
  return context;
};
