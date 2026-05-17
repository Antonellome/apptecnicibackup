
import React, { useState } from 'react';
import { Box, Typography, IconButton, Collapse, Paper, Tooltip } from '@mui/material';
import { ExpandMore as ExpandMoreIcon, ExpandLess as ExpandLessIcon, Delete as DeleteIcon } from '@mui/icons-material';
// Manteniamo la dipendenza originale se Notifica è definito lì
import { Notifica } from '@/models/definitions';

// L'interfaccia props che rispecchia la struttura che ti aspetti
interface NotificationItemProps {
    notification: Notifica;
    isUnread: boolean;
    onMarkAsRead: (id: string) => void;
    onDelete: (id: string) => void; // La nuova funzione per l'eliminazione corretta
    formattaData: (timestamp: any) => string;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, isUnread, onMarkAsRead, onDelete, formattaData }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    // Questa logica, che ti piaceva, resta INVARIATA
    const handleToggleExpand = () => {
        if (isUnread) {
            onMarkAsRead(notification.id);
        }
        setIsExpanded(!isExpanded);
    };

    // CORREZIONE: Ora handleDelete chiama la funzione corretta passata dal genitore
    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation(); // Preveniamo l'espansione, come prima
        onDelete(notification.id); // Usiamo onDelete invece del vecchio onHide
    };

    const formattedDate = formattaData(notification.createdAt);

    // Il JSX, lo stile, il layout e il comportamento rimangono ESATTAMENTE come li hai progettati
    return (
        <Paper 
            elevation={2} 
            sx={{
                p: 2,
                mb: 2,
                borderRadius: 2,
                borderLeft: 5,
                borderColor: isUnread ? 'primary.main' : 'transparent',
                bgcolor: isExpanded ? 'action.hover' : 'background.paper',
                transition: 'background-color 0.3s, border-color 0.3s',
                // Aggiungiamo solo una leggera opacità per distinguere i messaggi letti, come richiesto implicitamente
                opacity: isUnread ? 1 : 0.85 
            }}
        >
            <Box display="flex" alignItems="center" onClick={handleToggleExpand} sx={{ cursor: 'pointer' }}>
                <Box flexGrow={1}>
                    <Typography variant="subtitle1" sx={{ fontWeight: isUnread ? 700 : 500 }}>
                        {notification.title}
                    </Typography>
                    {!isExpanded && (
                        <Typography variant="caption" color="text.secondary">
                            {formattedDate}
                        </Typography>
                    )}
                </Box>

                <IconButton size="small">
                    {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
            </Box>

            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                <Box sx={{ pt: 2, mt: 1, borderTop: 1, borderColor: 'divider' }}>
                    <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                        {notification.body}
                    </Typography>
                    <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mt: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                            {formattedDate}
                        </Typography>
                        <Tooltip title="Elimina notifica">
                            <IconButton size="small" onClick={handleDelete}>
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Box>
            </Collapse>
        </Paper>
    );
};

export default NotificationItem;
