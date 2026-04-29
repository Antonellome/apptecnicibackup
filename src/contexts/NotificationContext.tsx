// CIAO. QUESTA È LA VERSIONE CORRETTA E IDEMPOTENTE.
// Utilizza una mappa per 'readBy' per evitare duplicati.

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
  serverTimestamp, // Re-introdotto per la logica a mappa
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

  // =========================================================================
  // == FUNZIONE MARKASREAD CORRETTA E IDEMPOTENTE (LOGICA A MAPPA) ==
  // =========================================================================
  const markAsRead = async (notificationId: string) => {
    if (!user || !userProfile) return;

    try {
      const notificationRef = doc(db, 'notificheRichieste', notificationId);
      
      const readerInfo = {
        uid: user.uid,
        nome: userProfile.nome || 'Nome non disponibile',
        readAt: serverTimestamp(), // Ora è corretto perché non è dentro un arrayUnion
      };

      // Usa la notazione a punti per scrivere in una mappa (oggetto).
      // Questo crea o sovrascrive la voce per l'UID dell'utente,
      // garantendo che non ci siano mai duplicati (IDEMPOTENZA).
      await updateDoc(notificationRef, {
        [`readBy.${user.uid}`]: readerInfo,
        isRead: true,
      });

      // Aggiorna lo stato locale per riflettere immediatamente il cambiamento
      // nell'interfaccia utente, senza attendere un nuovo fetch.
      setNotifications(prev => 
        prev.map(n => {
          if (n.id === notificationId) {
            // Prepara l'oggetto per l'aggiornamento dello stato locale.
            // Poiché serverTimestamp() non è ancora eseguito, usiamo new Date()
            // per l'aggiornamento immediato dell'UI. Il valore reale sarà quello del server.
            const localReaderInfo = {
              uid: user.uid,
              nome: userProfile.nome || 'Nome non disponibile',
              readAt: new Date(),
            };
            return { 
              ...n, 
              isRead: true, 
              readBy: { ...(n.readBy || {}), [user.uid]: localReaderInfo } 
            };
          }
          return n;
        })
      );

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
