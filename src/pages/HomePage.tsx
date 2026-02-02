import React from 'react';
import { Box, Typography, Grid, Card, CardActionArea, IconButton } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import ArticleIcon from '@mui/icons-material/Article';
import BarChartIcon from '@mui/icons-material/BarChart';
import DateRangeIcon from '@mui/icons-material/DateRange';
import LogoutIcon from '@mui/icons-material/Logout';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SettingsIcon from '@mui/icons-material/Settings';

const HomePage = () => {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const menuItems = [
    { text: 'Nuovo Report', icon: <AddCircleOutlineIcon sx={{ fontSize: { xs: 28, sm: 32 } }} />, path: '/new-report' },
    { text: 'Report', icon: <ArticleIcon sx={{ fontSize: { xs: 28, sm: 32 } }} />, path: '/report-list' },
    { text: 'Statistiche', icon: <BarChartIcon sx={{ fontSize: { xs: 28, sm: 32 } }} />, path: '/monthly-report' },
    { text: 'Presenze', icon: <DateRangeIcon sx={{ fontSize: { xs: 28, sm: 32 } }} />, path: '/attendances' },
    { text: 'Notifiche', icon: <NotificationsIcon sx={{ fontSize: { xs: 28, sm: 32 } }} />, path: '/notifications' },
    { text: 'Impostazioni', icon: <SettingsIcon sx={{ fontSize: { xs: 28, sm: 32 } }} />, path: '/settings' },
  ];

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      backgroundColor: '#1a1a1a',
      color: '#ffffff',
      p: { xs: 2, sm: 3 },
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
            <Typography variant="h3" sx={{ fontWeight: '700', fontSize: { xs: '2rem', sm: '2.5rem' }, color: '#2563eb' }}>R.I.S.O. App Tecnici</Typography>
            <Typography variant="subtitle1" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                Report Individuali Sincronizzati Online
            </Typography>
            <Typography variant="subtitle2" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                {user?.email}
            </Typography>
        </Box>
        <IconButton onClick={logout} title="Logout" sx={{ color: '#fff' }}>
            <LogoutIcon />
        </IconButton>
      </Box>

      {/* Centering container */}
      <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ maxWidth: '500px', width: '100%' }}>
          {menuItems.map((item) => (
            <Grid size={4} key={item.text}>
              <Card sx={{
                backgroundColor: '#2563eb',
                borderRadius: '20px',
                boxShadow: '0 8px 24px rgba(37, 99, 235, 0.4)',
                aspectRatio: '1 / 1', // Force square shape
                display: 'flex',
              }}>
                <CardActionArea
                  onClick={() => navigate(item.path)}
                  sx={{ 
                      flexGrow: 1,
                      p: { xs: 1, sm: 2 },
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      textAlign: 'center',
                  }}
                >
                  <Box sx={{
                    width: { xs: 48, sm: 60 },
                    height: { xs: 48, sm: 60 },
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    mb: 1.5,
                  }}>
                    {item.icon}
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: '600', color: '#ffffff', fontSize: { xs: '0.8rem', sm: '1rem' } }}>
                    {item.text}
                  </Typography>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
      
      <Typography variant="body2" sx={{ color: '#2563eb', fontStyle: 'italic', textAlign: 'center', pt: 2, pb: 1 }}>
        by "AS"
      </Typography>
    </Box>
  );
};

export default HomePage;
