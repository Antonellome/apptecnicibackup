
import React from 'react';
import { AppBar, Toolbar, IconButton, Typography, Box, Chip } from '@mui/material';
import { Menu as MenuIcon, WifiOff, CloudSync } from '@mui/icons-material';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useSyncManager } from '@/hooks/useSyncManager';

const Header: React.FC = () => {
  const isOnline = useOnlineStatus();
  const { requestManualSync, pendingSyncItems } = useSyncManager();
  const itemsToSync = pendingSyncItems ?? 0;

  return (
    <AppBar position="static">
      <Toolbar>
        <IconButton edge="start" color="inherit" aria-label="menu">
          <MenuIcon />
        </IconButton>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Rapportini App
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {itemsToSync > 0 && (
            <Chip 
              icon={<CloudSync />} 
              label={`${itemsToSync} in coda`} 
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
