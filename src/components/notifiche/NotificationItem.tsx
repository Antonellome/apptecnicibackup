import React from 'react';
import {
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Typography,
    Box
} from '@mui/material';
import {
    ExpandMore as ExpandMoreIcon,
    Delete as DeleteIcon
} from '@mui/icons-material';
import { Notifica } from '@/models/definitions';
import { format, isToday, isYesterday } from 'date-fns';
import { it } from 'date-fns/locale/it';
import { useTheme } from '@mui/material/styles';

interface NotificationItemProps {
    notification: Notifica;
    onMarkAsRead: (id: string) => void;
    onDismiss: (id: string) => void;
}

const formatDate = (timestamp: any): string => {
    if (!timestamp || typeof timestamp.seconds !== 'number') return 'Data non disponibile';
    try {
        const date = new Date(timestamp.seconds * 1000);
        if (isToday(date)) return `Oggi alle ${format(date, 'HH:mm', { locale: it })}`;
        if (isYesterday(date)) return `Ieri alle ${format(date, 'HH:mm', { locale: it })}`;
        return format(date, 'd MMMM yyyy HH:mm', { locale: it });
    } catch (error) {
        console.error("Errore formattazione data:", error);
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

    // Questa funzione gestisce il click sull'icona del cestino
    // event.stopPropagation() è FONDAMENTALE per non far aprire l'accordion
    const handleDismissClick = (event: React.MouseEvent) => {
        event.stopPropagation();
        onDismiss(id);
    };

    const notificationDate = formatDate(createdAt);

    return (
        <Accordion
            onChange={handleAccordionChange}
            disableGutters
            elevation={2}
            sx={{
                borderLeft: `4px solid ${isUnread ? theme.palette.primary.main : 'transparent'}`,
                backgroundColor: isUnread ? 'rgba(13, 71, 161, 0.08)' : 'background.paper',
                '&:before': { display: 'none' },
                mb: 1.5,
                borderRadius: '8px',
                overflow: 'hidden',
            }}
        >
            <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls={`panel-content-${id}`}
                id={`panel-header-${id}`}
                sx={{ 
                    // L'area del summary ora contiene tutto il layout
                    // per avere il controllo completo sulla posizione degli elementi
                    '.MuiAccordionSummary-content': {
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                    }
                }}
            >
                {/* Contenitore per Titolo e Data */}
                <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: isUnread ? 'bold' : 'normal' }}>
                        {title || 'Titolo non disponibile'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {notificationDate}
                    </Typography>
                </Box>

                {/* Contenitore per il Cestino (non è un bottone!) */}
                <Box sx={{ ml: 2, display: 'flex', alignItems: 'center' }}>
                    <DeleteIcon 
                        aria-label="Nascondi"
                        onClick={handleDismissClick}
                        sx={{
                            color: theme.palette.action.active,
                            cursor: 'pointer',
                            '&:hover': {
                                color: theme.palette.error.main
                            }
                        }}
                    />
                </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ px: 2, pt: 0 }}>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {body || 'Contenuto non disponibile'}
                </Typography>
            </AccordionDetails>
        </Accordion>
    );
};
