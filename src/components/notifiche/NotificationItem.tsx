import React from 'react';
import { Accordion, AccordionSummary, AccordionDetails, Typography, Box } from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import { Notifica } from '@/models/definitions';
import { format, isToday, isYesterday } from 'date-fns';
import { it } from 'date-fns/locale/it';
import { useTheme } from '@mui/material/styles';

interface NotificationItemProps {
  notification: Notifica;
  onMarkAsRead: (id: string) => void;
}

const formatDate = (date: Date) => {
  try {
    if (isToday(date)) return `Oggi alle ${format(date, 'HH:mm', { locale: it })}`;
    if (isYesterday(date)) return `Ieri alle ${format(date, 'HH:mm', { locale: it })}`;
    return format(date, 'd MMMM yyyy HH:mm', { locale: it });
  } catch (error) {
    console.error("Errore nella formattazione della data:", error);
    return 'Data non valida';
  }
};

export const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onMarkAsRead }) => {
  const theme = useTheme();
  const { id, title, body, createdAt, isRead } = notification;

  const handleAccordionChange = (_event: React.SyntheticEvent, isExpanded: boolean) => {
    if (isExpanded && !isRead) {
      onMarkAsRead(id);
    }
  };

  const notificationDate = createdAt ? formatDate(new Date(createdAt)) : 'Data non disponibile';

  return (
    <Accordion 
      onChange={handleAccordionChange}
      sx={{
        borderLeft: `4px solid ${!isRead ? theme.palette.primary.main : 'transparent'}`,
        backgroundColor: !isRead ? 'rgba(13, 71, 161, 0.08)' : 'transparent',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        '&:before': {
          display: 'none',
        },
        mb: 1.5,
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: !isRead ? 'bold' : 'normal' }}>
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
    </Accordion>
  );
};
