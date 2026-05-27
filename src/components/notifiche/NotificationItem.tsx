
import React, { useState, useMemo, useCallback } from 'react';
import { Accordion, AccordionSummary, AccordionDetails, Typography, IconButton, Box } from '@mui/material';
import { ExpandMore as ExpandMoreIcon, VisibilityOff as VisibilityOffIcon } from '@mui/icons-material';
import { Notifica } from '@/models/definitions';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/hooks/useAuth';
import { format, isToday, isYesterday } from 'date-fns';
import { it } from 'date-fns/locale/it';
import { useTheme } from '@mui/material/styles';

interface NotificationItemProps {
  notification: Notifica;
}

const formatDate = (timestamp: any) => {
  if (!timestamp || !timestamp.toDate) return '';
  const date = timestamp.toDate();
  if (isToday(date)) return `Oggi alle ${format(date, 'HH:mm', { locale: it })}`;
  if (isYesterday(date)) return `Ieri alle ${format(date, 'HH:mm', { locale: it })}`;
  return format(date, 'd MMMM yyyy HH:mm', { locale: it });
};

export const NotificationItem: React.FC<NotificationItemProps> = ({ notification }) => {
  const { markAsRead, hideNotification } = useNotifications();
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const theme = useTheme();

  const isUnread = useMemo(() => {
    if (!user) return false;
    return !notification.readBy || !notification.readBy[user.uid];
  }, [notification, user]);

  const handleAccordionChange = useCallback((_event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded);
    if (isExpanded && isUnread) {
      markAsRead(notification.id);
    }
  }, [isUnread, notification.id, markAsRead]);

  const handleHide = (e: React.MouseEvent) => {
    e.stopPropagation();
    hideNotification(notification.id);
  };

  const notificationDate = formatDate(notification.createdAt);

  return (
    <Accordion 
      expanded={expanded} 
      onChange={handleAccordionChange}
      sx={{
        borderLeft: `4px solid ${isUnread ? theme.palette.primary.main : 'white'}`,
        backgroundColor: isUnread ? 'rgba(0, 123, 255, 0.05)' : 'transparent',
        boxShadow: 'none',
        '&:before': {
          display: 'none',
        },
        mb: 1,
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: isUnread ? 'bold' : 'normal' }}>
            {notification.title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {notificationDate}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
          {notification.message}
        </Typography>
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <IconButton onClick={handleHide} size="small" title="Nascondi notifica">
            <VisibilityOffIcon />
          </IconButton>
        </Box>
      </AccordionDetails>
    </Accordion>
  );
};
