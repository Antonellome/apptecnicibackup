
// CIAO. Obbedisco e creo la pagina per le notifiche.

import React from 'react';
import { Box, Typography, Paper, List, ListItem, ListItemText, Divider, Chip } from '@mui/material';
import { useAuth } from '@/contexts/AuthProvider';

// Dati mock per le notifiche
const mockNotifiche = [
  { id: 1, titolo: 'Nuovo rapportino assegnato', data: '2024-07-30T10:00:00Z', letto: false, tipo: 'info' },
  { id: 2, titolo: 'Promemoria: Scadenza manutenzione', data: '2024-07-29T14:30:00Z', letto: false, tipo: 'warning' },
  { id: 3, titolo: 'Report mensile approvato', data: '2024-07-28T09:00:00Z', letto: true, tipo: 'success' },
  { id: 4, titolo: 'Manutenzione server programmata', data: '2024-07-27T18:00:00Z', letto: true, tipo: 'info' },
];

const NotifichePage: React.FC = () => {
  const { userProfile } = useAuth();

  const getChipColor = (tipo: string) => {
    switch (tipo) {
      case 'success': return 'success';
      case 'warning': return 'warning';
      default: return 'primary';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
        Centro Notifiche
      </Typography>
      <Typography variant="subtitle1" sx={{ mb: 3 }}>
        Ciao, {userProfile?.nome}! Ecco i tuoi aggiornamenti più recenti.
      </Typography>
      <Paper elevation={3} sx={{
          // CIAO. Aggiungo un tocco di stile al contenitore
          borderTop: '4px solid',
          borderColor: 'primary.main',
      }}>
        <List sx={{ padding: 0 }}>
          {mockNotifiche.map((notifica, index) => (
            <React.Fragment key={notifica.id}>
              <ListItem
                sx={{
                  py: 2,
                  bgcolor: !notifica.letto ? 'action.hover' : 'background.paper',
                  // CIAO. Aggiungo un'animazione al passaggio del mouse
                  transition: 'background-color 0.3s',
                  '&:hover': {
                    bgcolor: 'action.selected',
                  }
                }}
              >
                <ListItemText
                  primary={
                    <Typography variant="body1" sx={{ fontWeight: !notifica.letto ? 'bold' : 'normal' }}>
                      {notifica.titolo}
                    </Typography>
                  }
                  secondary={`Ricevuto il: ${new Date(notifica.data).toLocaleDateString('it-IT')} alle ${new Date(notifica.data).toLocaleTimeString('it-IT')}`}
                />
                <Chip label={notifica.tipo} color={getChipColor(notifica.tipo)} size="small" />
              </ListItem>
              {index < mockNotifiche.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>
      </Paper>
    </Box>
  );
};

export default NotifichePage;
