import React from 'react';
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
    Tooltip
} from '@mui/material';
import { Delete as DeleteIcon, Circle as CircleIcon } from '@mui/icons-material';
import { useNotifications } from '@/contexts/NotificationContext';
import { useAuth } from '@/hooks/useAuth';
import { useSnackbar } from '@/contexts/SnackbarContext';

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
                                        button
                                        onClick={() => handleMarkAsRead(notifica.id)}
                                        alignItems="flex-start"
                                        sx={{ py: 2, px: 3, transition: 'background-color 0.2s', '&:hover': { bgcolor: 'action.hover' }, bgcolor: isUnread ? 'action.selected' : 'transparent' }}
                                        secondaryAction={
                                            <Tooltip title="Nascondi notifica">
                                                <IconButton edge="end" aria-label="delete" onClick={(e) => { e.stopPropagation(); handleHide(notifica.id); }}>
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
