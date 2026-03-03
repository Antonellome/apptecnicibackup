import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc,
  FirestoreError 
} from 'firebase/firestore';
import { db } from '@/firebase';
import { useAuth } from '@/hooks/useAuth';
import { Notifica } from '@/models/definitions';

interface NotificationContextType {
  notifications: Notifica[];
  unreadCount: number;
  markAsRead: (notificationId: string) => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  loading: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, userProfile } = useAuth();
  const [notifications, setNotifications] = useState<Notifica[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const unreadCount = useMemo(() => 
    notifications.filter(n => !n.isRead).length, 
  [notifications]);

  useEffect(() => {
    if (!user?.uid) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const notificationsRef = collection(db, 'notificheRichieste');
    
    // Mappa per tenere traccia dei risultati delle due query ed evitare duplicati
    const resultsMap = new Map<string, { personal: Notifica[], category: Notifica[] }>();
    resultsMap.set('current', { personal: [], category: [] });

    const updateCombinedState = () => {
      const { personal, category } = resultsMap.get('current')!;
      const combinedMap = new Map<string, Notifica>();
      
      personal.forEach(n => combinedMap.set(n.id, n));
      category.forEach(n => combinedMap.set(n.id, n));

      const finalArray = Array.from(combinedMap.values());
      
      // Ordinamento per data decrescente
      finalArray.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?.seconds * 1000 || 0);
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?.seconds * 1000 || 0);
        return timeB - timeA;
      });

      setNotifications(finalArray);
      setLoading(false);
    };

    // Query 1: Notifiche dirette al tecnico
    const qPersonal = query(
      notificationsRef,
      where('to_ids', 'array-contains', user.uid)
    );

    const unsubscribePersonal = onSnapshot(qPersonal, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notifica));
      const current = resultsMap.get('current')!;
      resultsMap.set('current', { ...current, personal: docs });
      updateCombinedState();
    }, (error: FirestoreError) => {
      console.error("Errore onSnapshot notifiche personali:", error);
    });

    // Query 2: Notifiche per categoria (se disponibile)
    let unsubscribeCategory = () => {};
    const categoriaId = userProfile?.categoria?.id;

    if (categoriaId) {
      const qCategory = query(
        notificationsRef,
        where('to_category_ids', 'array-contains', categoriaId)
      );

      unsubscribeCategory = onSnapshot(qCategory, (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notifica));
        const current = resultsMap.get('current')!;
        resultsMap.set('current', { ...current, category: docs });
        updateCombinedState();
      }, (error: FirestoreError) => {
        console.error("Errore onSnapshot notifiche categoria:", error);
      });
    }

    return () => {
      unsubscribePersonal();
      unsubscribeCategory();
    };
  }, [user?.uid, userProfile?.categoria?.id]);

  const markAsRead = async (notificationId: string) => {
    if (!notificationId) return;
    try {
      const docRef = doc(db, 'notificheRichieste', notificationId);
      await updateDoc(docRef, { isRead: true });
    } catch (err) {
      console.error("Errore nell'aggiornamento della notifica:", err);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    if (!notificationId) return;
    try {
      const docRef = doc(db, 'notificheRichieste', notificationId);
      await deleteDoc(docRef);
    } catch (err) {
      console.error("Errore nell'eliminazione della notifica:", err);
    }
  };

  const value = {
    notifications,
    unreadCount,
    markAsRead,
    deleteNotification,
    loading
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications deve essere utilizzato all\'interno di un NotificationProvider');
  }
  return context;
};