
import React from 'react';
import {
    Container,
    Typography,
    Box,
    CircularProgress,
    Alert
} from '@mui/material';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications'; // <-- PERCORSO CORRETTO
import { NotificationItem } from '@/components/notifiche/NotificationItem';

const NotifichePage: React.FC = () => {
    // Dati utente per il saluto
    const { userProfile } = useAuth();
    // Dati delle notifiche dalla fonte di verità unica
    const { notifications, loading, error } = useNotifications();

    // Stato di caricamento gestito dal context
    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                <CircularProgress />
            </Box>
        );
    }
    
    // Stato di errore gestito dal context
    if (error) {
        return (
            <Container maxWidth="md" sx={{ py: 4 }}>
                 <Alert severity="error">{error}</Alert>
            </Container>
        );
    }

    // La pagina è ora un semplice "presentatore" di dati
    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main', mb: 1 }}>
                Centro Notifiche
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                {userProfile ? `Ciao ${userProfile.nome}, qui trovi tutte le tue comunicazioni.` : 'Qui trovi tutte le tue comunicazioni.'}
            </Typography>

            {notifications.length === 0 ? (
                <Box sx={{ py: 4, textAlign: 'center' }}>
                    <Typography color="text.secondary">Non ci sono notifiche per te.</Typography>
                </Box>
            ) : (
                <Box>
                    {/* Nessuna trasformazione o ordinamento. La logica è nel context. */}
                    {notifications.map((notification) => (
                        <NotificationItem 
                            key={notification.id}
                            notification={notification} // Passaggio diretto dei dati già pronti
                        />
                    ))}
                </Box>
            )}
        </Container>
    );
};

export default NotifichePage;
