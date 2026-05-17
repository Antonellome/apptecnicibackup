
import React from 'react';
import {
    Container,
    Typography,
    Box,
    CircularProgress,
} from '@mui/material';
import { useGlobalData } from '@/contexts/GlobalDataProvider';
import { useAuth } from '@/hooks/useAuth';
import NotificationItem from '@/components/notifiche/NotificationItem';
import { Timestamp } from 'firebase/firestore';

const NotifichePage: React.FC = () => {
    const { userProfile } = useAuth();
    // 1. Recupero le funzioni aggiornate, inclusa deleteNotification
    const { notifications, loading, markNotificationAsRead, deleteNotification } = useGlobalData();

    const handleMarkAsRead = async (id: string) => {
        try {
            await markNotificationAsRead(id);
        } catch (error) {
            console.error("Errore durante l'aggiornamento della notifica:", error);
        }
    };

    // 2. Aggiungo la funzione per gestire l'eliminazione
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

    if (loading) {
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
                    {sortedNotifications.map((notifica) => {
                        const isUnread = notifica.status === 'unread';
                        return (
                            <NotificationItem 
                                key={notifica.id}
                                notification={notifica}
                                isUnread={isUnread}
                                onMarkAsRead={() => handleMarkAsRead(notifica.id)}
                                // 3. Passo la funzione di eliminazione al componente figlio
                                onDelete={() => handleDelete(notifica.id)}
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
