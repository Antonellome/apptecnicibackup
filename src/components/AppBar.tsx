import React from 'react';
import { AppBar, Toolbar, Typography, IconButton, Box } from '@mui/material';
import {
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Brightness4 as Brightness4Icon, // Icona per tema scuro
  Brightness7 as Brightness7Icon, // Icona per tema chiaro
  Menu as MenuIcon 
} from '@mui/icons-material';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

// Definisco le nuove proprietà che il componente riceverà
interface CustomAppBarProps {
  themeMode: 'light' | 'dark';
  toggleTheme: () => void;
}

// Aggiungo le proprietà al componente
const CustomAppBar = ({ themeMode, toggleTheme }: CustomAppBarProps) => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
  };
  
  const goToSettings = () => {
    navigate('/settings'); // Naviga alla pagina delle impostazioni
  };

  // Per il drawer del menù laterale (la logica rimane invariata)
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const toggleDrawer = (open: boolean) => (event: React.KeyboardEvent | React.MouseEvent) => {
    if (
      event.type === 'keydown' &&
      ((event as React.KeyboardEvent).key === 'Tab' || (event as React.KeyboardEvent).key === 'Shift')
    ) {
      return;
    }
    setDrawerOpen(open);
  };

  return (
    <AppBar position="static" color="primary" enableColorOnDark>
      <Toolbar>
        <IconButton
          edge="start"
          color="inherit"
          aria-label="menu"
          sx={{ mr: 2 }}
          onClick={toggleDrawer(true)}
        >
          <MenuIcon />
        </IconButton>
        
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          <Typography variant="h6" component="div" sx={{ color: 'text.primary', lineHeight: 1.2 }}>
            R.I.S.O. App Tecnici
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.primary', opacity: 0.7 }}>
            Report Individuali Sincronizzati Online
          </Typography>
        </Box>

        {/* SOSTITUZIONE: Invece del menu, ora ci sono le 3 icone richieste */}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography sx={{ mr: 2, color: 'text.primary' }}>{user?.username}</Typography>
          
          {/* 1. Icona Tema */}
          <IconButton onClick={toggleTheme} color="inherit">
            {themeMode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
          
          {/* 2. Icona Impostazioni */}
          <IconButton onClick={goToSettings} color="inherit">
            <SettingsIcon />
          </IconButton>

          {/* 3. Icona Logout */}
          <IconButton onClick={handleLogout} color="inherit">
            <LogoutIcon />
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default CustomAppBar;
