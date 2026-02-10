
import React from 'react';
import { AppBar, Toolbar, Typography, IconButton, Box } from '@mui/material';
import { Brightness4, Brightness7, Settings, Logout } from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme'; // Corrected import path and hook name

const CustomAppBar = () => {
  const { user, logout } = useAuth();
  // Correctly use useTheme and its returned values
  const { mode, toggleTheme } = useTheme();

  return (
    <AppBar position="static">
      <Toolbar>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h6" component="h1" sx={{ fontWeight: 'bold' }}>
            R.I.S.O. App Tecnici
          </Typography>
          <Typography variant="subtitle2" component="h2">
            Report Individuali Sincronizzati Online
          </Typography>
        </Box>

        {user && (
          <Typography sx={{ mr: 2 }}>
            Ciao, {user.displayName || user.email}
          </Typography>
        )}

        {/* Correctly call toggleTheme on click */}
        <IconButton sx={{ ml: 1 }} onClick={toggleTheme} color="inherit">
          {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
        </IconButton>
        <IconButton
          color="inherit"
          onClick={() => {
            /* Navigate to settings */
          }}
        >
          <Settings />
        </IconButton>
        <IconButton color="inherit" onClick={logout}>
          <Logout />
        </IconButton>
      </Toolbar>
    </AppBar>
  );
};

export default CustomAppBar;
