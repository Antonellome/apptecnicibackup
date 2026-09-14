import { useState, useEffect } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db as firestore } from '@/utils/firebase';
import type { UserProfile, Notifica as NotificaDef } from '@/models/definitions';

const DELETED_STORAGE_KEY = 'deleted_notifications';

// Estendiamo la definizione base di Notifica se necessario, o la usiamo direttamente
interface Notifica extends NotificaDef {}

const getDeletedIds = (): string[] => {
    try {
        const stored = localStorage.getItem(DELETED_STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.error("Errore lettura ID cancellati in hook:", error);
        return [];
    }
};

/**
 * Hook che fornisce il conteggio delle notifiche non lette da FIRESTORE.
 * Accetta il profilo utente come parametro per evitare chiamate a hook condizionali.
 */
export const useUnreadNotificationsCount = (userProfile: UserProfile | null | undefined) => {
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        // Se non c'è un profilo utente valido, il conteggio è 0.
        if (!userProfile?.tecnicoId) {
            setUnreadCount(0);
            return;
        }

        const q = query(collection(firestore, "notifiche"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const serverNotifiche = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notifica));
            const deletedIds = getDeletedIds();

            const userNotifiche = serverNotifiche.filter(n => 
                (n.target === 'all' || 
                 n.tecnicoId === userProfile.tecnicoId ||
                 (n.categoriaId && n.categoriaId === userProfile.categoriaId))
            );

            // Il conteggio considera solo le notifiche non lette E non cancellate
            const count = userNotifiche.filter(n => 
                !n.isRead && 
                !deletedIds.includes(n.id)
            ).length;

            setUnreadCount(count);

        }, (error) => {
            console.error("Errore conteggio notifiche non lette:", error);
            setUnreadCount(0);
        });

        // Pulizia all'unmount del componente
        return () => unsubscribe();

    }, [userProfile]); // L'hook si riattiva solo se cambia il profilo utente

    return unreadCount;
};
