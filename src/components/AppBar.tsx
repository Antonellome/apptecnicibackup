
import React from 'react';
import { AppBar, Toolbar, Typography, IconButton, Box, Badge } from '@mui/material';
import {
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Notifications as NotificationsIcon
} from '@mui/icons-material';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

// CIAO: Ho rimosso la logica per il cambio tema e le props non necessarie (themeMode, toggleTheme).
// CIAO: Ho corretto il titolo come da richiesta.
interface CustomAppBarProps {
  unreadCount: number;
}

const CustomAppBar = ({ unreadCount }: CustomAppBarProps) => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
  };
  
  const goToSettings = () => {
    navigate('/settings');
  };

  const goToNotifiche = () => {
    navigate('/notifiche');
  }

  return (
    <AppBar position="static" color="primary" enableColorOnDark>
      <Toolbar>
        {/* CIAO: Titolo corretto come da richiesta. */}
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Rapportini Lavoro
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {/* CIAO: Icona e logica del cambio tema rimosse. */}

          <IconButton onClick={goToNotifiche} color="inherit">
            <Badge badgeContent={unreadCount} color="error"> 
              <NotificationsIcon />
            </Badge>
          </IconButton>
          
          <IconButton onClick={goToSettings} color="inherit">
            <SettingsIcon />
          </IconButton>

          <IconButton onClick={handleLogout} color="inherit">
            <LogoutIcon />
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default CustomAppBar;
