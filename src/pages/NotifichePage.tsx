// CIAO. Obbedisco. Trasformo la pagina Notifiche da mock a reale, sincronizzata con Firestore e Master Office.

import React, { useEffect } from 'react';
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
import { db as firestoreDb } from '@/firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import { useSnackbar } from '@/contexts/SnackbarContext';

const NotifichePage: React.FC = () => {
    const { userProfile } = useAuth();
    const { notifications, markAsRead, loading } = useNotifications();
    const { showSnackbar } = useSnackbar();

    // Effetto per marcare come lette tutte le notifiche non lette all'apertura della pagina
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
            await deleteDoc(doc(firestoreDb, 'notificheRichieste', id));
            showSnackbar("Notifica eliminata con successo.", "success");
        } catch (error) {
            console.error("Errore eliminazione notifica:", error);
            showSnackbar("Errore durante l'eliminazione.", "error");
        }
    };

    const formattaData = (timestamp: any) => {
        if (!timestamp) return 'Data non disponibile';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

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
                Ciao {userProfile?.nome}, qui trovi le comunicazioni dirette dall'amministratore.
            </Typography>

            <Paper elevation={2} sx={{ borderRadius: 2, overflow: 'hidden' }}>
                <List sx={{ p: 0 }}>
                    {notifications.length === 0 ? (
                        <ListItem sx={{ py: 4, justifyContent: 'center' }}>
                            <Typography color="text.secondary">Non ci sono notifiche per te.</Typography>
                        </ListItem>
                    ) : (
                        notifications.map((notifica, index) => (
                            <React.Fragment key={notifica.id}>
                                <ListItem
                                    alignItems="flex-start"
                                    sx={{
                                        py: 2,
                                        px: 3,
                                        backgroundColor: !notifica.isRead ? 'rgba(13, 71, 161, 0.04)' : 'transparent',
                                        transition: 'background-color 0.2s',
                                        '&:hover': { bgcolor: 'action.hover' }
                                    }}
                                    secondaryAction={
                                        notifica.isRead && (
                                            <Tooltip title="Elimina">
                                                <IconButton edge="end" aria-label="delete" onClick={() => handleDelete(notifica.id)}>
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        )
                                    }
                                >
                                    <Box sx={{ mr: 2, mt: 0.5, display: 'flex', alignItems: 'center' }}>
                                        {!notifica.isRead && (
                                            <CircleIcon sx={{ fontSize: 12, color: 'primary.main' }} />
                                        )}
                                    </Box>
                                    <ListItemText
                                        primary={
                                            <Typography 
                                                variant="subtitle1" 
                                                sx={{ 
                                                    fontWeight: !notifica.isRead ? 700 : 500,
                                                    color: !notifica.isRead ? 'primary.main' : 'text.primary'
                                                }}
                                            >
                                                {notifica.title}
                                            </Typography>
                                        }
                                        secondary={
                                            <Box component="span">
                                                <Typography
                                                    component="span"
                                                    variant="body2"
                                                    color="text.primary"
                                                    sx={{ display: 'block', my: 0.5, whiteSpace: 'pre-wrap' }}
                                                >
                                                    {notifica.body}
                                                </Typography>
                                                <Typography component="span" variant="caption" color="text.secondary">
                                                    {formattaData(notifica.createdAt)}
                                                </Typography>
                                            </Box>
                                        }
                                    />
                                </ListItem>
                                {index < notifications.length - 1 && <Divider component="li" />}
                            </React.Fragment>
                        ))
                    )}
                </List>
            </Paper>
            
            <Alert severity="info" sx={{ mt: 4, borderRadius: 2 }}>
                Le notifiche vengono contrassegnate automaticamente come lette quando apri questa pagina. 
                Puoi eliminare solo i messaggi che hai già visualizzato.
            </Alert>
        </Container>
    );
};

export default NotifichePage;