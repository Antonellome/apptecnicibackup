import React from 'react';
import {
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Typography,
    Box,
    IconButton
} from '@mui/material';
import {
    ExpandMore as ExpandMoreIcon,
    Close as CloseIcon // Importa l'icona per chiudere
} from '@mui/icons-material';
import { Notifica } from '@/models/definitions';
import { format, isToday, isYesterday } from 'date-fns';
import { it } from 'date-fns/locale/it';
import { useTheme } from '@mui/material/styles';

interface NotificationItemProps {
    notification: Notifica;
    onMarkAsRead: (id: string) => void;
    onDismiss: (id: string) => void; // NUOVA PROP per nascondere
}

const formatDate = (timestamp: any): string => {
    if (!timestamp || typeof timestamp.seconds !== 'number') {
        return 'Data non disponibile';
    }
    try {
        const date = new Date(timestamp.seconds * 1000);
        if (isToday(date)) return `Oggi alle ${format(date, 'HH:mm', { locale: it })}`;
        if (isYesterday(date)) return `Ieri alle ${format(date, 'HH:mm', { locale: it })}`;
        return format(date, 'd MMMM yyyy HH:mm', { locale: it });
    } catch (error) {
        console.error("Errore nella formattazione della data:", error);
        return 'Data non valida';
    }
};

export const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onMarkAsRead, onDismiss }) => {
    const theme = useTheme();
    const { id, title, body, createdAt, isRead } = notification;
    const isUnread = !isRead;

    const handleAccordionChange = (_event: React.SyntheticEvent, isExpanded: boolean) => {
        if (isExpanded && isUnread) {
            onMarkAsRead(id);
        }
    };

    const handleDismissClick = (event: React.MouseEvent) => {
        event.stopPropagation(); // Impedisce all'accordion di aprirsi/chiudersi
        onDismiss(id);
    };

    const notificationDate = formatDate(createdAt);

    return (
        <Accordion
            onChange={handleAccordionChange}
            sx={{
                borderLeft: `4px solid ${isUnread ? theme.palette.primary.main : 'transparent'}`,
                backgroundColor: isUnread ? 'rgba(13, 71, 161, 0.08)' : 'background.paper',
                boxShadow: theme.shadows[1],
                '&:before': {
                    display: 'none',
                },
                mb: 1.5,
                borderRadius: '8px',
                overflow: 'hidden',
                position: 'relative',
            }}
        >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', pr: 4 /* Spazio per l'icona */ }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: isUnread ? 'bold' : 'normal' }}>
                        {title || 'Titolo non disponibile'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {notificationDate}
                    </Typography>
                </Box>
            </AccordionSummary>
            <AccordionDetails>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {body || 'Contenuto non disponibile'}
                </Typography>
            </AccordionDetails>
            {/* NUOVO: Pulsante per nascondere la notifica */}
            <IconButton
                aria-label="Nascondi notifica"
                onClick={handleDismissClick}
                size="small"
                sx={{
                    position: 'absolute',
                    top: 8,
                    right: 48, // Posizionato a destra dell'icona expand
                    color: 'text.secondary'
                }}
            >
                <CloseIcon fontSize="small" />
            </IconButton>
        </Accordion>
    );
};
