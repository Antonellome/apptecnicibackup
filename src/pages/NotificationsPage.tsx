import React from 'react';
import {
    Box,
    Typography,
    Paper,
    useTheme as useMuiTheme
} from '@mui/material';
import MenuBar from '../components/MenuBar';

// Icona per indicare l'assenza di notifiche
import NotificationsOffIcon from '@mui/icons-material/NotificationsOff';

const NotificationsPage = () => {
  const muiTheme = useMuiTheme();

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      background: muiTheme.palette.mode === 'dark' ? '#1a1a1a' : '#f0f2f5',
    }}>
      <MenuBar title="Notifiche" />
      <Box 
        component="main" 
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3 },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Paper 
          elevation={3} 
          sx={{
            p: { xs: 3, sm: 4 },
            borderRadius: '16px',
            background: muiTheme.palette.background.paper,
            textAlign: 'center',
            maxWidth: '400px',
            width: '100%',
          }}
        >
          <NotificationsOffIcon sx={{ fontSize: 60, color: muiTheme.palette.text.secondary, mb: 2 }} />
          <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1 }}>
            Nessuna nuova notifica
          </Typography>
          <Typography variant="body1" sx={{ color: muiTheme.palette.text.secondary }}>
            Quando ci saranno novità, le troverai qui.
          </Typography>
        </Paper>
      </Box>
      <Typography variant="body2" sx={{ color: muiTheme.palette.text.secondary, fontStyle: 'italic', textAlign: 'center', p: 2 }}>
        by &quot;AS&quot;
      </Typography>
    </Box>
  );
};

export default NotificationsPage;
