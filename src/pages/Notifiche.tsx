import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';
import { List, ListItem, ListItemText, Typography, CircularProgress, Box, Paper, Divider, ListItemButton, IconButton } from '@mui/material';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import type { Notifica } from '../models/definitions';
import DeleteIcon from '@mui/icons-material/Delete';

const NotificationsPage = () => {
    const { user } = useAuth();
    // The hook now returns deleteNotification
    const { notifications, loading, markAsRead, deleteNotification } = useNotifications(user?.uid || null);

    const handleNotificationClick = (notification: Notifica) => {
        if (!notification.letta) {
            markAsRead(notification.id);
        }
    };

    const handleDeleteClick = (event: React.MouseEvent, notificationId: string) => {
        event.stopPropagation(); // Prevents the click from triggering handleNotificationClick
        deleteNotification(notificationId);
    }

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    }

    return (
        <Paper sx={{ p: 2, m: 2 }}>
            <Typography variant="h5" gutterBottom>Centro Notifiche</Typography>
            <List>
                {notifications.length === 0 ? (
                    <ListItem>
                        <ListItemText primary="Nessuna notifica presente." />
                    </ListItem>
                ) : (
                    notifications.map((notif, index) => (
                        <React.Fragment key={notif.id}>
                            <ListItemButton
                                onClick={() => handleNotificationClick(notif)}
                                sx={{
                                    backgroundColor: !notif.letta ? 'action.hover' : 'transparent',
                                    borderRadius: 1,
                                    mb: 1,
                                    alignItems: 'flex-start'
                                }}
                            >
                                <ListItemText
                                    primary={
                                        <Typography component="span" sx={{ fontWeight: !notif.letta ? 'bold' : 'normal' }}>
                                            {notif.titolo}
                                        </Typography>
                                    }
                                    secondary={
                                        <>
                                            <Typography component="span" variant="body2" color="text.primary" sx={{ display: 'block', whiteSpace: 'pre-wrap' }}>
                                                {notif.testo}
                                            </Typography>
                                            <Typography component="span" variant="caption" display="block" sx={{ mt: 1 }}>
                                                {`Da: ${notif.mittente.nome} • ${formatDistanceToNow(notif.data.toDate(), { addSuffix: true, locale: it })}`}
                                            </Typography>
                                        </>
                                    }
                                />
                                {notif.letta && (
                                    <IconButton 
                                        edge="end" 
                                        aria-label="delete"
                                        onClick={(e) => handleDeleteClick(e, notif.id)}
                                        sx={{ ml: 2, mt: 1}} // Align with text
                                    >
                                        <DeleteIcon />
                                    </IconButton>
                                )}
                            </ListItemButton>
                            {index < notifications.length - 1 && <Divider component="li" />}
                        </React.Fragment>
                    ))
                )}
            </List>
        </Paper>
    );
};

export default NotificationsPage;
