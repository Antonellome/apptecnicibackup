import React from 'react';
import { 
    Box, 
    Typography, 
    Paper, 
    Stack, 
    List, 
    ListItem, 
    ListItemIcon, 
    ListItemText, 
    Switch, 
    Button, 
    Divider,
    useTheme as useMuiTheme 
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import MenuBar from '../components/MenuBar';

// Icons
import Brightness4Icon from '@mui/icons-material/Brightness4';
import EmailIcon from '@mui/icons-material/Email';
import LogoutIcon from '@mui/icons-material/Logout';

const SettingsPage = () => {
  const muiTheme = useMuiTheme();
  const { mode, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      // La logica di AuthContext reindirizzerà già a /login
    } catch (error) {
      console.error("Errore durante il logout:", error);
      // Opzionale: mostrare un messaggio di errore all'utente
    }
  };

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      background: muiTheme.palette.mode === 'dark' 
        ? '#1a1a1a' 
        : '#f0f2f5',
    }}>
      <MenuBar title="Impostazioni" />
      <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, sm: 3 } }}>
        <Stack spacing={4} sx={{ maxWidth: '800px', margin: 'auto' }}>

          {/* Sezione Aspetto */}
          <Paper elevation={3} sx={{ borderRadius: '16px', overflow: 'hidden', background: muiTheme.palette.background.paper }}>
            <Box sx={{ p: 2, borderBottom: `1px solid ${muiTheme.palette.divider}` }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Aspetto</Typography>
            </Box>
            <List>
              <ListItem>
                <ListItemIcon sx={{ minWidth: '48px' }}><Brightness4Icon /></ListItemIcon>
                <ListItemText primary="Tema Scuro" secondary="Attiva o disattiva la modalità scura" />
                <Switch
                  edge="end"
                  onChange={toggleTheme}
                  checked={mode === 'dark'}
                  inputProps={{ 'aria-labelledby': 'switch-theme' }}
                />
              </ListItem>
            </List>
          </Paper>

          {/* Sezione Account */}
          <Paper elevation={3} sx={{ borderRadius: '16px', overflow: 'hidden', background: muiTheme.palette.background.paper }}>
            <Box sx={{ p: 2, borderBottom: `1px solid ${muiTheme.palette.divider}` }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Account</Typography>
            </Box>
            <List>
              <ListItem>
                <ListItemIcon sx={{ minWidth: '48px' }}><EmailIcon /></ListItemIcon>
                <ListItemText primary="Email" secondary={user?.email || 'Nessun utente loggato'} />
              </ListItem>
              <Divider variant="inset" component="li" />
              <ListItem sx={{ p: 2 }}>
                <Button 
                  variant="contained"
                  color="error"
                  startIcon={<LogoutIcon />} 
                  onClick={handleLogout}
                  sx={{ width: '100%', py: 1.5, fontWeight: 'bold' }}
                >
                  Logout
                </Button>
              </ListItem>
            </List>
          </Paper>

        </Stack>
      </Box>
      <Typography variant="body2" sx={{ color: muiTheme.palette.text.secondary, fontStyle: 'italic', textAlign: 'center', p: 2 }}>
        by &quot;AS&quot;
      </Typography>
    </Box>
  );
};

export default SettingsPage;
