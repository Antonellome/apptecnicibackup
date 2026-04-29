// CIAO. CORREGGO DI NUOVO IL CRASH DELLA UI (TypeError).
// Questa è una misura di sicurezza per assicurarci di vedere il vero errore.

import React, { useEffect, useMemo } from 'react';
import {
    Container,
    Typography,
    Paper,
    List,
    ListItem,
    ListItemText,
    Divider,
    IconButton,
    Box,
    Alert,
    CircularProgress,
    Tooltip,
    Button
} from '@mui/material';
import { Delete as DeleteIcon, Circle as CircleIcon, OpenInNew as OpenInNewIcon } from '@mui/icons-material';
import { useNotifications } from '@/contexts/NotificationContext';
import { useAuth } from '@/hooks/useAuth';
import { useSnackbar } from '@/contexts/SnackbarContext';

const NotifichePage: React.FC = () => {
    const { userProfile } = useAuth();
    const { notifications, markAsRead, loading, error, deleteNotification } = useNotifications();
    const { showSnackbar } = useSnackbar();

    useEffect(() => {
        if (!loading && notifications.length > 0) {
            const unreadNotifications = notifications.filter(n => !n.isRead);
            unreadNotifications.forEach(n => {
                markAsRead(n.id).catch(err => console.error("Errore update lettura:", err));
            });
        }
    }, [notifications, loading, markAsRead]);

    const handleDelete = async (id: string) => {
        try {
            await deleteNotification(id);
            showSnackbar("Notifica eliminata con successo.", "success");
        } catch (error) {
            console.error("Errore durante l'eliminazione della notifica:", error);
            showSnackbar("Errore durante l'eliminazione della notifica.", "error");
        }
    };

    const formattaData = (date: Date | any) => {
        if (!date) return 'Data non disponibile';
        const dateObj = date instanceof Date ? date : new Date(date);
        if (isNaN(dateObj.getTime())) return 'Data invalida';
        return dateObj.toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const firestoreLink = useMemo(() => {
        if (typeof error !== 'string') return null;
        const urlRegex = /(https?:\/\/[^\s]+)/;
        const match = error.match(urlRegex);
        return match ? match[0] : null;
    }, [error]);

    if (error && firestoreLink) {
        return (
            <Container maxWidth="md" sx={{ py: 4 }}>
                <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: 'error.main', mb: 1 }}>
                    Azione Richiesta
                </Typography>
                <Alert severity="error" sx={{ mt: 2, p: 3 }}>
                    <Typography fontWeight="bold">Errore di Configurazione Firestore</Typography>
                    <Typography variant="body2" sx={{ mt: 1, mb: 2 }}>
                        La query per le notifiche richiede un indice composito che non è presente nel database.
                        Per risolvere, apri il link seguente in una nuova scheda e clicca su "Crea Indice" nella pagina di Firebase.
                    </Typography>
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<OpenInNewIcon />}
                        href={firestoreLink}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Apri Console Firebase per Creare l'Indice
                    </Button>
                </Alert>
            </Container>
        );
    } else if (error) {
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

            <Paper elevation={2} sx={{ borderRadius: 2, overflow: 'hidden' }}>
                <List sx={{ p: 0 }}>
                    {notifications.length === 0 ? (
                        <ListItem sx={{ py: 4, justifyContent: 'center' }}>
                            <Typography color="text.secondary">Non ci sono nuove notifiche per te.</Typography>
                        </ListItem>
                    ) : (
                        notifications.map((notifica, index) => (
                            <React.Fragment key={notifica.id}>
                                <ListItem
                                    alignItems="flex-start"
                                    sx={{ py: 2, px: 3, transition: 'background-color 0.2s', '&:hover': { bgcolor: 'action.hover' } }}
                                    secondaryAction={
                                        <Tooltip title="Elimina notifica">
                                            <IconButton edge="end" aria-label="delete" onClick={() => handleDelete(notifica.id)}>
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    }
                                >
                                    {!notifica.isRead && (
                                        <Box sx={{ mr: 2, mt: 0.5 }}>
                                            <CircleIcon sx={{ fontSize: 12, color: 'primary.main' }} />
                                        </Box>
                                    )}
                                    <ListItemText
                                        primary={
                                            <Typography variant="subtitle1" sx={{ fontWeight: !notifica.isRead ? 700 : 500, color: !notifica.isRead ? 'primary.dark' : 'text.primary' }}>
                                                {notifica.title}
                                            </Typography>
                                        }
                                        secondary={
                                            <>
                                                <Typography component="span" variant="body2" color="text.secondary" sx={{ display: 'block', my: 0.5, whiteSpace: 'pre-wrap' }}>
                                                    {notifica.body}
                                                </Typography>
                                                <Typography component="span" variant="caption" color="text.secondary">
                                                    {formattaData(notifica.createdAt)}
                                                </Typography>
                                            </>
                                        }
                                    />
                                </ListItem>
                                {index < notifications.length - 1 && <Divider component="li" />}
                            </React.Fragment>
                        ))
                    )}
                </List>
            </Paper>
        </Container>
    );
};

export default NotifichePage;
