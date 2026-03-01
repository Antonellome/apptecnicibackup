
// CIAO. Componente per visualizzare una singola notifica.
import React from 'react';
import {
    ListItem, ListItemText, Typography, Box
} from '@mui/material';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';

interface Notification {
    id: string;
    title: string;
    body: string;
    sender: string;
    read: boolean;
    createdAt: any; 
}

interface NotificationItemProps {
    notifica: Notification;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notifica }) => {

    const timeAgo = notifica.createdAt
        ? formatDistanceToNow(notifica.createdAt.toDate(), { addSuffix: true, locale: it })
        : 'data non disponibile';

    return (
        <ListItem 
            divider
            sx={{ 
                // CIAO. Applica uno sfondo diverso se la notifica non è letta.
                backgroundColor: notifica.read ? 'transparent' : 'action.hover',
                py: 1.5
            }}
        >
            <ListItemText
                primary={
                    <Typography variant="subtitle1" component="div" sx={{ fontWeight: notifica.read ? 'normal' : 'bold' }}>
                        {notifica.title}
                    </Typography>
                }
                secondary={
                    <>
                        <Typography variant="body2" color="text.secondary" component="p">
                            {notifica.body}
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                                Da: {notifica.sender}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {timeAgo}
                            </Typography>
                        </Box>
                    </>
                }
            />
        </ListItem>
    );
}

export default NotificationItem;
