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
    const { user, userProfile } = useAuth();
    const { notifications, markAsRead, loading, error, deleteNotification } = useNotifications();
    const { showSnackbar } = useSnackbar();

    useEffect(() => {
        if (!loading && notifications.length > 0 && user) {
            // Identifica le notifiche non lette DALL'UTENTE CORRENTE
            const unreadNotifications = notifications.filter(n => !n.readBy || !n.readBy[user.uid]);
            // Segna come lette solo quelle non ancora lette
            unreadNotifications.forEach(n => {
                markAsRead(n.id).catch(err => console.error("Errore durante l'aggiornamento della notifica come letta:", err));
            });
        }
        // La dipendenza da `user` assicura che il codice venga eseguito solo quando l'utente è definito.
    }, [notifications, loading, markAsRead, user]);

    const handleDelete = async (id: string) => {
        try {
            await deleteNotification(id);
            showSnackbar("Notifica eliminata con successo.", "success");
        } catch (error) {
            console.error("Errore durante l'eliminazione della notifica:", error);
            showSnackbar("Errore durante l'eliminazione della notifica.", "error");
        }
    };

    // Funzione per formattare il Timestamp di Firestore
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
                        notifications.map((notifica, index) => {
                            const isUnread = user ? (!notifica.readBy || !notifica.readBy[user.uid]) : false;
                            return (
                                <React.Fragment key={notifica.id}>
                                    <ListItem
                                        alignItems="flex-start"
                                        sx={{ py: 2, px: 3, transition: 'background-color 0.2s', '&:hover': { bgcolor: 'action.hover' }, bgcolor: isUnread ? 'action.selected' : 'transparent' }}
                                        secondaryAction={
                                            <Tooltip title="Elimina notifica">
                                                <IconButton edge="end" aria-label="delete" onClick={() => handleDelete(notifica.id)}>
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        }
                                    >
                                        {isUnread && (
                                            <Box sx={{ mr: 2, mt: 0.5 }}>
                                                <CircleIcon sx={{ fontSize: 12, color: 'primary.main' }} />
                                            </Box>
                                        )}
                                        <ListItemText
                                            primary={
                                                <Typography variant="subtitle1" sx={{ fontWeight: isUnread ? 700 : 500, color: isUnread ? 'primary.dark' : 'text.primary' }}>
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
                            );
                        })
                    )}
                </List>
            </Paper>
        </Container>
    );
};

export default NotifichePage;
