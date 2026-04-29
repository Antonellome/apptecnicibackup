// CIAO. QUESTA È LA VERSIONE CON LA DEPENDENCY ARRAY CORRETTA E SPECIFICA.
// Ascolto i valori primitivi (uid, categoria.id) per evitare problemi di riferimento.

import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  or,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/utils/firebase';
import { useAuth } from '@/hooks/useAuth';
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

  const refetch = () => setFetchTrigger(prev => prev + 1);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (authLoading || !user?.uid || !userProfile?.categoria?.id) {
        setLoading(false);
        setNotifications([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const finalQuery = query(
          collection(db, 'notificheRichieste'),
          or(
            where('to_ids', 'array-contains', user.uid),
            where('to_category_ids', 'array-contains', userProfile.categoria.id),
            where('sendToAll', '==', true)
          )
        );

        const snapshot = await getDocs(finalQuery);
        
        const docs = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
          } as Notifica;
        });

        docs.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
        setNotifications(docs);

      } catch (err: any) {
        console.error("[DIAGNOSTICA] Query fallita! L'indice composito è quasi certamente mancante.", err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();

  }, [authLoading, user?.uid, userProfile?.categoria?.id, fetchTrigger]);

  const unreadCount = useMemo(() => notifications.filter(n => !n.isRead).length, [notifications]);

  const markAsRead = async (notificationId: string) => {
    try {
      await updateDoc(doc(db, 'notificheRichieste', notificationId), { isRead: true });
      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error("Errore marcatura come letto:", err);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await deleteDoc(doc(db, 'notificheRichieste', notificationId));
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (err) {
      console.error("Errore eliminazione:", err);
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
