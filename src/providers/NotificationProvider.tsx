
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
import { Notifica } from '@/models/definitions'; // <-- Corretto da AppNotification a Notifica
import { NotificationContext, NotificationContextType } from '../contexts/NotificationContextDefinition';

type FirestoreNotification = Notifica & {
  readBy?: Record<string, { readAt: Timestamp; tecnicoName: string }>;
  createdAt: Timestamp | Date;
}

interface State {
  allNotifications: FirestoreNotification[];
  hiddenIds: string[];
  internalLoading: boolean;
  error: string | null;
}

type Action = 
  | { type: 'START_LOADING' }
  | { type: 'SET_DATA', payload: FirestoreNotification[] }
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
  const userCategoryId = typeof userProfile?.categoria === 'string' 
    ? userProfile.categoria 
    : userProfile?.categoria?.id;

  useEffect(() => {
    if (authLoading) return;
    if (!userUid) {
      dispatch({ type: 'RESET_STATE' });
      return;
    }

    dispatch({ type: 'START_LOADING' });
    dispatch({ type: 'SET_HIDDEN_IDS', payload: getHiddenIdsFromStorage(userUid) });

    const q = query(collection(db, 'notifications'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      try {
        const allDocs = snapshot.docs.map(doc => {
          const data = doc.data();
          const message = data.message || data.body || '';
          return {
            id: doc.id,
            ...data,
            message,
          } as FirestoreNotification;
        });

        const relevantNotifications = allDocs.filter(n => {
            if (!n.target) return false;
            if (n.target.type === 'all') return true;
            if (n.target.type === 'user' && n.target.id === userUid) return true;
            if (n.target.type === 'category' && n.target.id === userCategoryId) return true;
            return false;
        });

        relevantNotifications.sort((a, b) => {
          const timeA = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : new Date(a.createdAt).getTime();
          const timeB = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : new Date(b.createdAt).getTime();
          return timeB - timeA;
        });

        dispatch({ type: 'SET_DATA', payload: relevantNotifications });

      } catch (err: any) {
        dispatch({ type: 'SET_ERROR', payload: err.message });
      }
    }, (err) => {
      dispatch({ type: 'SET_ERROR', payload: err.message });
    });

    return () => unsubscribe();
  }, [userUid, userCategoryId, authLoading]);

  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user || !userProfile) return;
    
    const fullName = `${userProfile.nome} ${userProfile.cognome}`.trim() || user.displayName;
    const notificationRef = doc(db, "notifications", notificationId);
    
    try {
      await updateDoc(notificationRef, {
        [`readBy.${user.uid}`]: { 
          readAt: serverTimestamp(), 
          tecnicoName: fullName
        }
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
      .map(n => ({ ...n } as Notifica)); // Il cast ora è sicuro
  }, [state.allNotifications, state.hiddenIds]);

  const unreadCount = useMemo(() => {
    if (!userUid) return 0;
    return state.allNotifications
        .filter(n => !state.hiddenIds.includes(n.id))
        .filter(n => !n.readBy || !n.readBy[userUid]).length;
  }, [state.allNotifications, state.hiddenIds, userUid]);

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
