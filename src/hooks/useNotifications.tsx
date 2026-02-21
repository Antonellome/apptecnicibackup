// In `src/hooks/useNotifications.ts`
import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import type { Notifica } from '../models/definitions';

export const useNotifications = (userId: string | null) => {
    const [notifications, setNotifications] = useState<Notifica[]>([]);
    const [unreadCount, setUnreadCount] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!userId) {
            setLoading(false);
            setNotifications([]);
            setUnreadCount(0);
            return;
        }

        setLoading(true);
        
        const notificationsQuery = query(
            collection(db, 'notifiche'),
            where('destinatarioId', '==', userId)
        );

        const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
            const notificationsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Notifica));

            const sortedNotifications = notificationsData.sort((a, b) => {
                const dateA = a.data.toMillis();
                const dateB = b.data.toMillis();
                return dateB - dateA;
            });

            const count = sortedNotifications.filter(n => !n.letta).length;
            
            setNotifications(sortedNotifications);
            setUnreadCount(count);
            setLoading(false);
        }, (err) => {
            console.error("Errore nel recupero real-time delle notifiche:", err);
            setError(err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userId]);

    const markAsRead = useCallback(async (notificationId: string) => {
        try {
            const notificationRef = doc(db, 'notifiche', notificationId);
            await updateDoc(notificationRef, { letta: true });
        } catch (err) {
            console.error("Errore nell'aggiornare la notifica come letta:", err);
        }
    }, []);

    const deleteNotification = useCallback(async (notificationId: string) => {
        try {
            const notificationRef = doc(db, 'notifiche', notificationId);
            await deleteDoc(notificationRef);
        } catch (err) {
            console.error("Errore durante l'eliminazione della notifica:", err);
        }
    }, []);

    return { notifications, unreadCount, loading, error, markAsRead, deleteNotification };
};
