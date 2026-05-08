import React from 'react';
import {
    Container,
    Typography,
    Box,
    Alert,
    CircularProgress,
} from '@mui/material';
import { useNotifications } from '@/contexts/NotificationContext';
import { useAuth } from '@/hooks/useAuth';
import { useSnackbar } from '@/contexts/SnackbarContext';
import NotificationItem from '@/components/notifiche/NotificationItem';

const NotifichePage: React.FC = () => {
    const { user, userProfile } = useAuth();
    const { notifications, loading, error, hideNotification, markAsRead } = useNotifications();
    const { showSnackbar } = useSnackbar();

    const handleHide = async (id: string) => {
        try {
            await hideNotification(id);
            showSnackbar("Notifica nascosta con successo.", "success");
        } catch (error) {
            console.error("Errore durante il mascheramento della notifica:", error);
            showSnackbar("Errore durante il mascheramento della notifica.", "error");
        }
    };

    const handleMarkAsRead = (id: string) => {
        markAsRead(id);
    }

    const formattaData = (timestamp: any): string => {
        if (!timestamp || typeof timestamp.toDate !== 'function') {
            return 'Data non disponibile';
        }
        try {
            const date = timestamp.toDate();
            return date.toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            console.error("Errore formattazione data:", e);
            return 'Data invalida';
        }
    };

    if (error) {
        return (
             <Container maxWidth="md" sx={{ py: 4 }}>
                <Alert severity="error" sx={{ mt: 2, p: 3 }}>
                    <Typography fontWeight="bold">Errore nel Caricamento</Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                        {error}
                    </Typography>
                </Alert>
            </Container>
        )
    }

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main', mb: 1 }}>
                Centro Notifiche
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                Ciao {userProfile?.nome}, qui trovi le comunicazioni più recenti.
            </Typography>

            {notifications.length === 0 ? (
                <Box sx={{ py: 4, textAlign: 'center' }}>
                    <Typography color="text.secondary">Non ci sono nuove notifiche per te.</Typography>
                </Box>
            ) : (
                <Box>
                    {notifications.map((notifica) => {
                        const isUnread = user ? (!notifica.readBy || !notifica.readBy[user.uid]) : false;
                        return (
                            <NotificationItem 
                                key={notifica.id}
                                notification={notifica}
                                isUnread={isUnread}
                                onMarkAsRead={handleMarkAsRead}
                                onHide={handleHide}
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
