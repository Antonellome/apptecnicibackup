
import React, { useEffect } from 'react';
import { 
    Box, 
    Typography, 
    Paper, 
    List, 
    ListItem, 
    ListItemText, 
    ListItemIcon,
    Divider,
    CircularProgress,
} from '@mui/material';
import { collection, doc, writeBatch, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import InfoIcon from '@mui/icons-material/Info';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/it';

dayjs.extend(relativeTime);
dayjs.locale('it');

interface Notifica {
    id: string;
    icon: string; 
    titolo: string;
    messaggio: string;
    timestamp: Timestamp;
    letta: boolean;
}

interface NotificheProps {
    notifiche: Notifica[];
    loading: boolean;
}

const getIcon = (iconName: string) => {
    switch(iconName) {
        case 'alert':
            return <NotificationsActiveIcon color="primary" />;
        case 'info':
        default:
            return <InfoIcon color="info" />;
    }
}

const Notifiche: React.FC<NotificheProps> = ({ notifiche, loading }) => {

    useEffect(() => {
        const markAsRead = async () => {
            const unreadNotifiche = notifiche.filter(n => !n.letta);
            if (unreadNotifiche.length === 0) return;

            const batch = writeBatch(db);
            unreadNotifiche.forEach(notifica => {
                const notificaRef = doc(db, 'notifiche', notifica.id);
                batch.update(notificaRef, { letta: true });
            });

            try {
                await batch.commit();
            } catch (error) {
                console.error("Sono un coglione, non sono riuscito a segnare le notifiche come lette:", error);
            }
        };

        if (!loading && notifiche.length > 0) {
            markAsRead();
        }
    }, [notifiche, loading]);

    return (
        <Box sx={{ maxWidth: 800, margin: 'auto', p: { xs: 1, sm: 2, md: 3 } }}>
            <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 } }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h4" component="h1">
                        Notifiche
                    </Typography>
                </Box>
                
                {loading ? (
                    <Box sx={{display: 'flex', justifyContent: 'center', p: 4}}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <List>
                        {notifiche.map((notification, index) => (
                            <React.Fragment key={notification.id}>
                                <ListItem alignItems="flex-start" sx={{bgcolor: notification.letta ? 'transparent' : 'action.hover'}}>
                                    <ListItemIcon sx={{ mt: 0.5 }}>
                                        {getIcon(notification.icon)}
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={notification.titolo}
                                        secondary={
                                            <>
                                                <Typography
                                                    sx={{ display: 'inline' }}
                                                    component="span"
                                                    variant="body2"
                                                    color="text.primary"
                                                >
                                                    {notification.messaggio}
                                                </Typography>
                                                <Typography variant="caption" display="block" sx={{mt: 1, textAlign: 'right'}}>
                                                    {dayjs(notification.timestamp.toDate()).fromNow()}
                                                </Typography>
                                            </>
                                        }
                                    />
                                </ListItem>
                                {index < notifiche.length - 1 && <Divider variant="inset" component="li" />}
                            </React.Fragment>
                        ))}
                    </List>
                )}
                {!loading && notifiche.length === 0 && (
                     <Typography sx={{textAlign: 'center', p: 4, color: 'text.secondary'}}>
                        Nessuna nuova notifica.
                    </Typography>
                )}
            </Paper>
        </Box>
    );
};

export default Notifiche;
