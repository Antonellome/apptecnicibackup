
import React, { useState } from 'react';
import { Notifica } from '../hooks/useUserNotifications';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { 
    ListItem, 
    ListItemText, 
    ListItemIcon, 
    Collapse, 
    Typography, 
    Divider, 
    IconButton 
} from '@mui/material';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import MarkAsUnreadIcon from '@mui/icons-material/MarkAsUnread';
import DraftsIcon from '@mui/icons-material/Drafts';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

interface NotificationItemProps {
  notifica: Notifica;
  isLast: boolean;
}

// CIAO. OBBEDISCO. Funzione di formattazione robusta.
const formatDate = (timestamp: any): string => {
    if (timestamp && typeof timestamp.toDate === 'function') {
        try {
            return format(timestamp.toDate(), "d MMMM yyyy 'alle' HH:mm", { locale: it });
        } catch (error) {
            console.error("Errore formattazione data:", error);
            return "Data corrotta";
        }
    } 
    // CIAO. OBBEDISCO. Gestisco il caso in cui la data sia già una stringa (improbabile ma sicuro)
    else if (typeof timestamp === 'string') {
        try {
            return format(new Date(timestamp), "d MMMM yyyy 'alle' HH:mm", { locale: it });
        } catch (error) {
            return "Data stringa invalida";
        }
    }
    return 'Data non disponibile';
};

const NotificationItem: React.FC<NotificationItemProps> = ({ notifica, isLast }) => {
    const [expanded, setExpanded] = useState(false);

    const handleToggleExpand = async () => {
        const newExpandedState = !expanded;
        setExpanded(newExpandedState);

        // CIAO. OBBEDISCO. Segna come letta solo se non lo è già e la sto espandendo.
        if (newExpandedState && !notifica.letta) {
            try {
                const notifRef = doc(db, 'tecnici', notifica.userId, 'notifiche', notifica.id);
                await updateDoc(notifRef, { letta: true });
            } catch (error) {
                console.error("Errore nell'aggiornare la notifica:", error);
            }
        }
    };

    return (
        <>
            <ListItem 
                button 
                onClick={handleToggleExpand} 
                sx={{ 
                    backgroundColor: notifica.letta ? 'transparent' : 'action.hover',
                    py: 2, 
                    px: 3 
                }}
            >
                <ListItemIcon sx={{ mt: '4px', alignSelf: 'flex-start' }}>
                    {notifica.letta ? <DraftsIcon color="disabled" /> : <MarkAsUnreadIcon color="primary" />}
                </ListItemIcon>
                <ListItemText
                    primary={
                        <Typography variant="h6" component="span" fontWeight={notifica.letta ? 'normal' : 'bold'}>
                            {notifica.title}
                        </Typography>
                    }
                    secondary={formatDate(notifica.timestamp)}
                />
                <IconButton edge="end">
                    {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
            </ListItem>
            <Collapse in={expanded} timeout="auto" unmountOnExit>
                <Typography sx={{ p: 3, pt: 1, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {notifica.body}
                </Typography>
            </Collapse>
            {!isLast && <Divider component="li" />}
        </>
    );
};

export default NotificationItem;
