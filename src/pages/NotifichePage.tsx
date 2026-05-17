
import React from 'react';
import {
    Container,
    Typography,
    Box,
    CircularProgress,
} from '@mui/material';
import { useGlobalData, Notification } from '@/contexts/GlobalDataProvider';
import { useAuth } from '@/hooks/useAuth';
import NotificationItem from '@/components/notifiche/NotificationItem';
import { Timestamp } from 'firebase/firestore';
import { Notifica } from '@/models/definitions';

const NotifichePage: React.FC = () => {
    const { userProfile } = useAuth();
    const { notifications, loading, markNotificationAsRead, deleteNotification } = useGlobalData();

    const handleMarkAsRead = async (id: string) => {
        try {
            await markNotificationAsRead(id);
        } catch (error) {
            console.error("Errore durante l'aggiornamento della notifica:", error);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteNotification(id);
        } catch (error) {
            console.error("Errore durante l'eliminazione della notifica:", error);
        }
    };

    const formattaData = (timestamp: Timestamp | Date): string => {
        if (!timestamp) return 'Data non disponibile';
        const date = timestamp instanceof Timestamp ? timestamp.toDate() : timestamp;
        return date.toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    if (loading || !userProfile) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    const safeNotifications = Array.isArray(notifications) ? notifications : [];
    const sortedNotifications = [...safeNotifications].sort((a, b) => {
        const timeA = a.createdAt?.toMillis() || 0;
        const timeB = b.createdAt?.toMillis() || 0;
        return timeB - timeA;
    });

    // Funzione di trasformazione per garantire la compatibilità
    const transformNotification = (notification: Notification): Notifica => {
        const isUnread = notification.status === 'unread';
        return {
            id: notification.id,
            title: notification.title,
            createdAt: notification.createdAt,
            // ++ FIX: Mappatura esplicita per creare un oggetto Notifica valido
            body: notification.title || 'Nessun dettaglio disponibile', // Usa title per body
            senderId: 'Sistema', // Fornisce un default per senderId
            recipientId: userProfile.uid,
            readBy: isUnread ? {} : { [userProfile.uid]: true },
        };
    };

    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main', mb: 1 }}>
                Centro Notifiche
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                Ciao {userProfile?.nome}, qui trovi tutte le tue comunicazioni.
            </Typography>

            {sortedNotifications.length === 0 ? (
                <Box sx={{ py: 4, textAlign: 'center' }}>
                    <Typography color="text.secondary">Non ci sono notifiche per te.</Typography>
                </Box>
            ) : (
                <Box>
                    {sortedNotifications.map((notification) => {
                        const notificaForChild = transformNotification(notification);
                        return (
                            <NotificationItem 
                                key={notification.id}
                                notification={notificaForChild} // Passa l'oggetto trasformato
                                isUnread={notification.status === 'unread'}
                                onMarkAsRead={() => handleMarkAsRead(notification.id)}
                                onDelete={() => handleDelete(notification.id)}
                                formattaData={formattaData}
                            />
                        );
                    })}
                </Box>
            )}
        </Container>
    );
};

export default NotifichePage;
