import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode, useCallback } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  or,
} from 'firebase/firestore';
import { db } from '@/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Notifica } from '@/models/definitions';

interface NotificationContextType {
  notifications: Notifica[];
  unreadCount: number;
  markAsRead: (notificationId: string) => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
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

    const finalQuery = query(
      collection(db, 'notificheRichieste'),
      or(
        where('to_ids', 'array-contains', user.uid),
        where('to_category_ids', 'array-contains', userProfile.categoria.id),
        where('sendToAll', '==', true)
      )
    );

    const unsubscribe = onSnapshot(finalQuery,
      (snapshot) => {
        const docs = snapshot.docs.map(doc => {
          const data = doc.data();
          return { 
              id: doc.id, 
              ...data, 
              createdAt: data.createdAt, // Manteniamo il formato che arriva da firestore
              readBy: data.readBy || {}
          } as Notifica;
        });

        docs.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
        setNotifications(docs);
        setLoading(false);
      },
      (err: any) => {
        console.error("Errore nel listener delle notifiche (Verificare Indice Firestore):", err);
        setError(err.message || 'Errore sconosciuto');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, userProfile, authLoading, fetchTrigger]);

  const unreadCount = useMemo(() => {
      if (!user) return 0;
      return notifications.filter(n => !n.readBy || !n.readBy[user.uid]).length;
  }, [notifications, user]);

  const markAsRead = async (notificationId: string) => {
      if (!user) return;
      try {
          const notificationRef = doc(db, 'notificheRichieste', notificationId);
          // Aggiorna il campo mappa 'readBy' con l'uid dell'utente
          // La notazione a punti è fondamentale per aggiornare un campo in una mappa
          await updateDoc(notificationRef, { [`readBy.${user.uid}`]: true });

          // Aggiornamento locale per una UI reattiva
          setNotifications(prev => prev.map(n => 
              n.id === notificationId 
                  ? { ...n, readBy: { ...n.readBy, [user.uid]: true } } 
                  : n
          ));
      } catch (err) {
          console.error("Errore durante l'aggiornamento della notifica:", err);
          // Qui potresti voler mostrare uno snackbar di errore
      }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await deleteDoc(doc(db, 'notificheRichieste', notificationId));
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (err) {
      console.error("Errore durante l'eliminazione della notifica:", err);
    }
  };

  const value = { notifications, unreadCount, markAsRead, deleteNotification, loading, error, refetch };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications deve essere usato dentro un NotificationProvider');
  }
  return context;
};
