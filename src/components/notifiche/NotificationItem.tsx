
import React, { useState } from 'react';
import { Box, Typography, IconButton, Collapse, Paper, Tooltip } from '@mui/material';
import { ExpandMore as ExpandMoreIcon, ExpandLess as ExpandLessIcon, Delete as DeleteIcon, Circle as CircleIcon } from '@mui/icons-material';
import { Notifica } from '@/models/definitions';

interface NotificationItemProps {
    notification: Notifica;
    isUnread: boolean;
    onMarkAsRead: (id: string) => void;
    onHide: (id: string) => void;
    formattaData: (timestamp: any) => string;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, isUnread, onMarkAsRead, onHide, formattaData }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const handleToggleExpand = () => {
        if (isUnread) {
            onMarkAsRead(notification.id);
        }
        setIsExpanded(!isExpanded);
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation(); // Previene l'apertura/chiusura quando si clicca il cestino
        onHide(notification.id);
    };

    const formattedDate = formattaData(notification.createdAt);

    return (
        <Paper 
            elevation={2} 
            sx={{
                p: 2,
                mb: 2,
                borderRadius: 2,
                borderLeft: 5,
                borderColor: 'primary.main',
                bgcolor: isExpanded ? 'action.hover' : 'background.paper',
                transition: 'background-color 0.3s, border-color 0.3s',
            }}
        >
            <Box display="flex" alignItems="center" onClick={handleToggleExpand} sx={{ cursor: 'pointer' }}>
                {/* Main Content Area */}
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

                {/* Apex Icon */}
                <IconButton size="small">
                    {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
            </Box>

            {/* Collapsible Details */}
            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                <Box sx={{ pt: 2, mt: 1, borderTop: 1, borderColor: 'divider' }}>
                    <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                        {notification.body}
                    </Typography>
                    <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mt: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                            {formattedDate}
                        </Typography>
                        <Tooltip title="Nascondi notifica">
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
