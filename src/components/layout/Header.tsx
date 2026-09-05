import React, { useContext } from 'react';
import { AppBar, Toolbar, IconButton, Typography, Box, Chip } from '@mui/material';
import { Menu as MenuIcon, WifiOff, CloudSync } from '@mui/icons-material';
import { AppContext } from '@/contexts/AppContext';
import { useOnlineStatus } from '@/hooks/useOnlineStatus'; // Import corretto
import { useSyncManager } from '@/hooks/useSyncManager';

const Header: React.FC = () => {
  const { setMenuOpen } = useContext(AppContext)!;
  const isOnline = useOnlineStatus(); // Usa l'hook corretto
  const { requestManualSync, pendingSyncCount } = useSyncManager();

  return (
    <AppBar position="static">
      <Toolbar>
        <IconButton edge="start" color="inherit" aria-label="menu" onClick={() => setMenuOpen(true)}>
          <MenuIcon />
        </IconButton>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Rapportini App
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {pendingSyncCount > 0 && (
            <Chip 
              icon={<CloudSync />} 
              label={`${pendingSyncCount} in coda`} 
              color="warning" 
              onClick={requestManualSync}
              aria-label="Avvia sincronizzazione manuale"
            />
          )}
          {!isOnline && (
            <Chip 
              icon={<WifiOff />} 
              label="Offline" 
              color="secondary" 
              variant="outlined"
              aria-label="Stato offline"
            />
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
