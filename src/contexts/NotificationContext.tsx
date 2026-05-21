
import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import {
  collection,
  query,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/firebase';
import { useAuth } from '@/hooks/useAuth';
import { Notifica } from '@/models/definitions';

interface Target {
  type: 'user' | 'category' | 'all';
  id?: string;
  name?: string;
}

interface FirebaseNotification {
  id: string;
  title: string;
  message: string;
  createdAt: Timestamp;
  target?: Target;
  status: 'read' | 'unread';
  readAt?: Timestamp | null;
  readBy?: { uid: string; name: string } | null;
}

interface NotificationContextType {
  notifications: Notifica[];
  unreadCount: number;
  markAsRead: (notificationId: string) => Promise<void>;
  hideNotification: (notificationId: string) => void;
  loading: boolean;
  error: string | null;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const getHiddenIdsFromStorage = (userId: string): string[] => {
  const stored = localStorage.getItem(`hidden_notifications_${userId}`);
  return stored ? JSON.parse(stored) : [];
};

const setHiddenIdsInStorage = (userId: string, ids: string[]) => {
  localStorage.setItem(`hidden_notifications_${userId}`, JSON.stringify(ids));
};

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, userProfile, loading: authLoading } = useAuth();
  const [allNotifications, setAllNotifications] = useState<FirebaseNotification[]>([]);
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- DIPENDENZE PRIMITIVE E STABILI PER EVITARE LOOP ---
  const userUid = user?.uid;
  const userCategoryId = userProfile?.categoria?.id;

  useEffect(() => {
    if (userUid) {
      setHiddenIds(getHiddenIdsFromStorage(userUid));
    }
  }, [userUid]);

  useEffect(() => {
    // L'effetto si attiva solo se l'utente è caricato e autenticato.
    if (authLoading || !userUid) {
      setLoading(false);
      setAllNotifications([]);
      return;
    }

    setLoading(true);
    setError(null);

    const collectionRef = collection(db, 'notifications');
    const q = query(collectionRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      try {
        const allDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FirebaseNotification));

        const relevantNotifications = allDocs.filter(n => {
            if (!n.target) return false;
            if (n.target.type === 'all') return true;
            if (n.target.type === 'user' && n.target.id === userUid) return true;
            if (n.target.type === 'category' && n.target.id === userCategoryId) return true;
            return false;
        });

        relevantNotifications.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
        setAllNotifications(relevantNotifications);

      } catch (err: any) {
        console.error("Errore durante l'elaborazione delle notifiche:", err);
        setError(`Errore interno nell'elaborazione notifiche: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }, (err) => {
      console.error("Errore nel listener delle notifiche:", err);
      setError("Errore di connessione al centro notifiche.");
      setLoading(false);
    });

    return () => unsubscribe();
  // --- FIX DEFINITIVO 429: L'effetto ora dipende solo da stringhe stabili. ---
  }, [userUid, userCategoryId, authLoading]);

  const markAsRead = async (notificationId: string) => {
    if (!user || !userProfile) return;
    const notificationRef = doc(db, "notifications", notificationId);
    try {
      await updateDoc(notificationRef, {
        status: "read",
        readAt: serverTimestamp(),
        readBy: { uid: user.uid, name: userProfile.nome || "Nome non disponibile" }
      });
    } catch (err) {
      console.error("Errore nell'invio della conferma di lettura:", err);
    }
  };

  const hideNotification = (notificationId: string) => {
    if (!userUid) return;
    const newHiddenIds = [...hiddenIds, notificationId];
    setHiddenIds(newHiddenIds);
    setHiddenIdsInStorage(userUid, newHiddenIds);
  };

  const visibleNotifications = useMemo(() => {
    return allNotifications
      .filter(n => !hiddenIds.includes(n.id))
      .map(n => ({ 
        id: n.id,
        title: n.title,
        body: n.message, 
        createdAt: n.createdAt,
        readBy: n.readBy ? { [n.readBy.uid]: true } : {},
      } as Notifica));
  }, [allNotifications, hiddenIds]);

  const unreadCount = useMemo(() => {
    return allNotifications.filter(n => n.status === 'unread' && !hiddenIds.includes(n.id)).length;
  }, [allNotifications, hiddenIds]);

  const value = { notifications: visibleNotifications, unreadCount, markAsRead, hideNotification, loading, error };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications deve essere usato dentro un NotificationProvider');
  }
  return context;
};
