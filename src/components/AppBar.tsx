
import { AppBar, Toolbar, Typography, IconButton, Box } from '@mui/material';
import {
  Home as HomeIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const CustomAppBar = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
  };
  
  const goToHome = () => {
    navigate('/');
  };

  const goToSettings = () => {
    navigate('/settings');
  };

  return (
    <AppBar position="static" color="primary" enableColorOnDark>
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Rapportini Lavoro
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center' }}>

          <IconButton onClick={goToHome} color="inherit">
            <HomeIcon />
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
