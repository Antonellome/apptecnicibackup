import React, { useEffect, ReactNode, useMemo, useCallback, useReducer } from 'react';
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
import { NotificationContext, NotificationContextType } from './NotificationContextDefinition';

// ... (interfaces remain the same)
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

// --- useReducer Implementation ---

interface State {
  allNotifications: FirebaseNotification[];
  hiddenIds: string[];
  internalLoading: boolean;
  error: string | null;
}

type Action = 
  | { type: 'START_LOADING' }
  | { type: 'SET_DATA', payload: FirebaseNotification[] }
  | { type: 'SET_ERROR', payload: string }
  | { type: 'RESET_STATE' }
  | { type: 'SET_HIDDEN_IDS', payload: string[] }
  | { type: 'ADD_HIDDEN_ID', payload: string };

const initialState: State = {
  allNotifications: [],
  hiddenIds: [],
  internalLoading: true,
  error: null,
};

function notificationReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'START_LOADING':
      return { ...state, internalLoading: true, error: null };
    case 'SET_DATA':
      return { ...state, internalLoading: false, allNotifications: action.payload };
    case 'SET_ERROR':
      return { ...state, internalLoading: false, error: action.payload };
    case 'RESET_STATE':
      return initialState;
    case 'SET_HIDDEN_IDS':
      return { ...state, hiddenIds: action.payload };
    case 'ADD_HIDDEN_ID':
      return { ...state, hiddenIds: [...state.hiddenIds, action.payload] };
    default:
      return state;
  }
}

// Helper functions for localStorage
const getHiddenIdsFromStorage = (userId: string): string[] => {
  const stored = localStorage.getItem(`hidden_notifications_${userId}`);
  return stored ? JSON.parse(stored) : [];
};

const setHiddenIdsInStorage = (userId: string, ids: string[]) => {
  localStorage.setItem(`hidden_notifications_${userId}`, JSON.stringify(ids));
};

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, userProfile, loading: authLoading } = useAuth();
  const [state, dispatch] = useReducer(notificationReducer, initialState);

  const isLoading = authLoading || state.internalLoading;

  const userUid = user?.uid;
  const userCategoryId = userProfile?.categoria?.id;

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!userUid) {
      dispatch({ type: 'RESET_STATE' });
      return;
    }

    dispatch({ type: 'START_LOADING' });
    dispatch({ type: 'SET_HIDDEN_IDS', payload: getHiddenIdsFromStorage(userUid) });

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
        dispatch({ type: 'SET_DATA', payload: relevantNotifications });

      } catch (err: any) {
        console.error("Errore durante l'elaborazione delle notifiche:", err);
        dispatch({ type: 'SET_ERROR', payload: `Errore interno nell'elaborazione notifiche: ${err.message}` });
      }
    }, (err) => {
      console.error("Errore nel listener delle notifiche:", err);
      dispatch({ type: 'SET_ERROR', payload: "Errore di connessione al centro notifiche." });
    });

    return () => unsubscribe();
  }, [userUid, userCategoryId, authLoading]);

  const markAsRead = useCallback(async (notificationId: string) => {
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
  }, [user, userProfile]);

  const hideNotification = useCallback((notificationId: string) => {
    if (!userUid) return;
    dispatch({ type: 'ADD_HIDDEN_ID', payload: notificationId });
    setHiddenIdsInStorage(userUid, [...state.hiddenIds, notificationId]);
  }, [userUid, state.hiddenIds]);

  const visibleNotifications = useMemo(() => {
    return state.allNotifications
      .filter(n => !state.hiddenIds.includes(n.id))
      .map(n => ({
        id: n.id,
        title: n.title,
        body: n.message,
        createdAt: n.createdAt,
        readBy: n.readBy ? { [n.readBy.uid]: true } : {},
      } as Notifica));
  }, [state.allNotifications, state.hiddenIds]);

  const unreadCount = useMemo(() => {
    return state.allNotifications.filter(n => n.status === 'unread' && !state.hiddenIds.includes(n.id)).length;
  }, [state.allNotifications, state.hiddenIds]);

  const value: NotificationContextType = useMemo(() => ({
    notifications: visibleNotifications,
    unreadCount,
    markAsRead,
    hideNotification,
    loading: isLoading,
    error: state.error
  }), [visibleNotifications, unreadCount, markAsRead, hideNotification, isLoading, state.error]);

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};
