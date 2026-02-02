import React from 'react';
import { Box, Typography } from '@mui/material';
import MenuBar from '../components/MenuBar';

const NotificationsPage = () => {
  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      backgroundColor: '#1a1a1a',
      color: '#ffffff',
    }}>
      <MenuBar title="Notifiche" />
      <Box sx={{ flexGrow: 1, p: { xs: 2, sm: 3 } }}>
        <Typography>Pagina delle notifiche</Typography>
      </Box>
      <Typography variant="body2" sx={{ color: '#2563eb', fontStyle: 'italic', textAlign: 'center', p: 2 }}>
        by "AS"
      </Typography>
    </Box>
  );
};

export default NotificationsPage;
