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

// 1. Definisci let notificationsStore FUORI dal componente per la persistenza assoluta
let notificationsStore: Notifica[] = [];

const normalizeToTopic = (categoryName: string): string => {
    let normalized = categoryName.toLowerCase();
    if (normalized.endsWith('a')) {
        normalized = normalized.slice(0, -1) + 'i';
    }
    return normalized.replace(/[^a-z0-9-_.~%]+/g, '_').replace(/\s+/g, '_');
};

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, userProfile } = useAuth();
  // 2. Usa lo store esterno come valore iniziale
  const [notifications, setNotifications] = useState<Notifica[]>(notificationsStore);
  const [loading, setLoading] = useState<boolean>(false);

  // 3. Funzione sync che aggiorna lo store esterno e lo stato locale
  const sync = useCallback((newDocs: Notifica[]) => {
    const combinedMap = new Map<string, Notifica>();
    
    // Unisce i nuovi documenti allo store esistente
    notificationsStore.forEach(n => combinedMap.set(n.id, n));
    newDocs.forEach(n => combinedMap.set(n.id, n));
    
    const finalArray = Array.from(combinedMap.values());
    
    // Ordinamento cronologico decrescente
    finalArray.sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?.seconds * 1000 || 0);
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?.seconds * 1000 || 0);
      return timeB - timeA;
    });

    // 6. Inserisci i log
    console.log(`[Master-Sync] Stato aggiornato. Totale: ${finalArray.length}`);
    
    notificationsStore = finalArray;
    setNotifications(finalArray);
  }, []);

  const unreadCount = useMemo(() => 
    notifications.filter(n => !n.isRead).length, 
  [notifications]);

  // 4. Implementa i due useEffect indipendenti
  
  // Effetto A: Notifiche nominali (UID)
  useEffect(() => {
    if (!user?.uid) {
      notificationsStore = [];
      setNotifications([]);
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

  // Effetto B: Notifiche categoria (topics)
  useEffect(() => {
    if (!user?.uid || !userProfile?.nomeCategoria) return;

    const notificationsRef = collection(db, 'notificheRichieste');
    const topicName = normalizeToTopic(userProfile.nomeCategoria);
    
    const qCategory = query(
      notificationsRef,
      where('topics', 'array-contains', topicName)
    );

    const unsubscribe = onSnapshot(qCategory, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notifica));
      sync(docs);
    }, (error: FirestoreError) => {
      console.error("Errore query categoria:", error);
    });

    return () => unsubscribe();
  }, [user?.uid, userProfile?.nomeCategoria, sync]);

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
      // Aggiorna lo store locale dopo l'eliminazione
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