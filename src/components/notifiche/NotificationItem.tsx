import React from 'react';
import {
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Typography,
    Box,
    Link,
    IconButton,
} from '@mui/material';
import {
    ExpandMore as ExpandMoreIcon,
    Delete as DeleteIcon,
} from '@mui/icons-material';
import { Notifica } from '@/models/definitions';
import { format, isToday, isYesterday } from 'date-fns';
import { it } from 'date-fns/locale/it';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';

interface NotificationItemProps {
  notification: Notifica;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
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

export const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onMarkAsRead, onDelete }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { id, title, body, createdAt, isRead, link } = notification;

  const handleAccordionChange = (_event: React.SyntheticEvent, isExpanded: boolean) => {
    if (isExpanded && !isRead) {
      onMarkAsRead(id);
    }
  };

  const handleLinkClick = (e: React.MouseEvent) => {
    if(link){
      e.stopPropagation();
      navigate(link);
    }
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(id);
  };

  const notificationDate = createdAt ? formatDate(new Date(createdAt)) : 'Data non disponibile';

  return (
    <Accordion 
      onChange={handleAccordionChange}
      sx={{
        borderLeft: `4px solid ${!isRead ? theme.palette.primary.main : 'transparent'}`,
        backgroundColor: !isRead ? 'rgba(13, 71, 161, 0.08)' : theme.palette.background.paper,
        boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
        transition: 'background-color 0.3s, border-color 0.3s',
        '&:before': { display: 'none' },
        mb: 1.5,
        borderRadius: '8px!important',
        overflow: 'hidden',
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: !isRead ? 600 : 'normal' }}>
            {title || 'Titolo non disponibile'} 
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {notificationDate}
          </Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>
            {body || 'Contenuto non disponibile'}
          </Typography>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {link ? (
              <Link 
                component="button" 
                variant="body2"
                onClick={handleLinkClick}
                sx={{ textAlign: 'left' }}
              >
                Visualizza dettagli
              </Link>
            ) : (
              <Box />
            )}
            
            <IconButton 
              aria-label="Elimina notifica"
              onClick={handleDeleteClick}
              size="small"
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </AccordionDetails>
    </Accordion>
  );
};
