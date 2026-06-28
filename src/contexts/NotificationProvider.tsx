import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { collection, query, where, onSnapshot, Timestamp, orderBy } from 'firebase/firestore';
import { db as firestore } from '@/firebase';
import { useAuth } from '@/hooks/useAuth';
import { Notifica } from '@/models/definitions';

interface NotificationContextType {
    notifications: Notifica[];
    loading: boolean;
    unreadCount: number;
}

const NotificationContext = createContext<NotificationContextType>({ 
    notifications: [], 
    loading: true, 
    unreadCount: 0 
});

export const useNotifications = () => useContext(NotificationContext);

interface NotificationProviderProps {
    children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
    const { userProfile } = useAuth();
    const [notifications, setNotifications] = useState<Notifica[]>([]);
    const [loading, setLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!userProfile?.tecnicoId) {
            setLoading(false);
            setNotifications([]);
            setUnreadCount(0);
            return;
        }

        setLoading(true);

        const q = query(
            collection(firestore, 'notifiche'),
            where('tecnicoId', '==', userProfile.tecnicoId),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const fetchedNotifications = querySnapshot.docs.map(doc => {
                const data = doc.data();
                const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date();
                
                const isRead = data.readBy && data.readBy[userProfile.tecnicoId] ? true : false;

                return {
                    id: doc.id,
                    title: data.title,
                    body: data.body,
                    link: data.link,
                    tecnicoId: data.tecnicoId,
                    isRead: isRead,
                    createdAt: createdAt,
                } as Notifica;
            });

            const count = fetchedNotifications.filter(n => !n.isRead).length;

            setNotifications(fetchedNotifications);
            setUnreadCount(count);
            setLoading(false);

        }, (error) => {
            console.error("Errore nel listener delle notifiche Firestore:", error);
            setLoading(false);
        });

        return () => unsubscribe();

    }, [userProfile?.tecnicoId]);

    return (
        <NotificationContext.Provider value={{ notifications, loading, unreadCount }}>
            {children}
        </NotificationContext.Provider>
    );
};
