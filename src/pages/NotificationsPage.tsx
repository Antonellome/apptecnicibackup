
// CIAO. Correggo i percorsi e le variabili non utilizzate.
import React, { useEffect } from 'react';
import {
    Box, Typography, CircularProgress, Alert, Paper, List
} from '@mui/material';
import { useUserNotifications } from '@/hooks/useUserNotifications';
import NotificationItem from '@/components/notifiche/NotificationItem'; // Corretto percorso

const NotificationsPage: React.FC = () => {
    // CIAO. Aggiungo 'unreadCount' che era erroneamente segnalato come non usato.
    const { notifications, unreadCount, loading, error, markAllAsRead } = useUserNotifications();

    useEffect(() => {
        if (!loading && notifications.length > 0) {
            // CIAO. La dipendenza qui è corretta, serve per rieseguire se cambia l'utente.
            markAllAsRead();
        }
    }, [loading, notifications.length, markAllAsRead]); // Aggiungo notifications.length per stabilità

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Alert severity="error">
                Si è verificato un errore nel caricamento delle notifiche: {error.message}
            </Alert>
        );
    }

    return (
        <Paper elevation={2} sx={{ maxWidth: 800, mx: 'auto', backgroundColor: 'background.paper' }}>
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="h5" component="h1">
                    Centro Notifiche
                </Typography>
                {/* CIAO. Uso 'unreadCount' qui. */}
                <Typography variant="body2" color="text.secondary">
                    {unreadCount > 0 ? `Hai ${unreadCount} notifiche non lette.` : 'Non ci sono nuove notifiche.'}
                </Typography>
            </Box>
            {notifications.length === 0 ? (
                <Box sx={{ textAlign: 'center', p: 4 }}>
                    <Typography variant="h6">Tutto aggiornato!</Typography>
                    <Typography variant="body1" color="text.secondary">
                        Non ci sono messaggi da visualizzare.
                    </Typography>
                </Box>
            ) : (
                <List disablePadding>
                    {notifications.map(notifica => (
                        <NotificationItem
                            key={notifica.id}
                            notifica={notifica}
                        />
                    ))}
                </List>
            )}
        </Paper>
    );
}

export default NotificationsPage;
