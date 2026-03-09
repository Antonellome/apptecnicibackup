import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
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

let notificationsStore: Notifica[] = [];

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, userProfile } = useAuth();
  const [notifications, setNotifications] = useState<Notifica[]>(notificationsStore);
  const [loading, setLoading] = useState<boolean>(true);

  const sync = useCallback((newDocs: Notifica[]) => {
    const combinedMap = new Map<string, Notifica>();
    
    notificationsStore.forEach(n => combinedMap.set(n.id, n));
    newDocs.forEach(n => combinedMap.set(n.id, n));
    
    const finalArray = Array.from(combinedMap.values());
    
    finalArray.sort((a, b) => {
      const timeA = a.createdAt?.seconds * 1000 || 0;
      const timeB = b.createdAt?.seconds * 1000 || 0;
      return timeB - timeA;
    });

    console.log(`[Master-Sync] Stato aggiornato. Totale: ${finalArray.length}`);
    
    notificationsStore = finalArray;
    setNotifications(finalArray);
  }, []);

  const unreadCount = useMemo(() => 
    notifications.filter(n => !n.isRead).length, 
  [notifications]);

  useEffect(() => {
    if (!user?.uid) {
      notificationsStore = [];
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const notificationsRef = collection(db, 'notificheRichieste');
    
    const qPersonal = query(
      notificationsRef,
      where('to_ids', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(qPersonal, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notifica));
      sync(docs);
      setLoading(false);
    }, (error: FirestoreError) => {
      console.error("Errore query personale:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid, sync]);

  useEffect(() => {
    // La query dipende dall'ID della categoria letto direttamente dal profilo
    if (!user?.uid || !userProfile?.categoriaId) return;

    const notificationsRef = collection(db, 'notificheRichieste');
    
    // --- CORREZIONE FINALE E DEFINITIVA ---
    // La query ora usa il campo corretto 'to_categories' E il campo corretto 'userProfile.categoriaId'
    const qCategory = query(
      notificationsRef,
      where('to_categories', 'array-contains', userProfile.categoriaId)
    );

    const unsubscribe = onSnapshot(qCategory, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notifica));
      sync(docs);
    }, (error: FirestoreError) => {
      console.error("Errore query categoria (necessario indice?):", error);
    });

    return () => unsubscribe();
  }, [user?.uid, userProfile?.categoriaId, sync]);

  const markAsRead = async (notificationId: string) => {
    if (!notificationId) return;
    try {
      const docRef = doc(db, 'notificheRichieste', notificationId);
      await updateDoc(docRef, { isRead: true });
    } catch (err) {
      console.error("Errore aggiornamento lettura:", err);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    if (!notificationId) return;
    try {
      const docRef = doc(db, 'notificheRichieste', notificationId);
      await deleteDoc(docRef);
      
      const updated = notificationsStore.filter(n => n.id !== notificationId);
      notificationsStore = updated;
      setNotifications(updated);
    } catch (err) {
      console.error("Errore eliminazione:", err);
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
