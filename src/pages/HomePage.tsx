import React from 'react';
import { Box, Typography, Grid, Card, CardActionArea, IconButton, useTheme as useMuiTheme, Divider } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';

// Icons
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import ArticleIcon from '@mui/icons-material/Article';
import BarChartIcon from '@mui/icons-material/BarChart';
import DateRangeIcon from '@mui/icons-material/DateRange';
import LogoutIcon from '@mui/icons-material/Logout';
import SettingsIcon from '@mui/icons-material/Settings';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';

// Definiamo l'azione principale e le azioni secondarie per una maggiore chiarezza
const mainAction = { 
  text: 'Nuovo Report', 
  icon: <AddCircleOutlineIcon sx={{ fontSize: '2rem' }} />, 
  path: '/rapportini/nuovo', 
  description: 'Crea e invia il tuo report giornaliero.' 
};

const menuItems = [
  { text: 'Lista Report', icon: <ArticleIcon sx={{ fontSize: { xs: 28, sm: 32 } }} />, path: '/rapportini' },
  { text: 'Riepilogo Mensile', icon: <BarChartIcon sx={{ fontSize: { xs: 28, sm: 32 } }} />, path: '/monthly-report' },
  { text: 'Presenze', icon: <DateRangeIcon sx={{ fontSize: { xs: 28, sm: 32 } }} />, path: '/attendances' },
];


const HomePage = () => {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const { mode, toggleTheme } = useTheme();
  const theme = useMuiTheme();

  // Estrae il nome utente dall'email per un saluto più personale
  const userDisplayName = user?.email ? user.email.split('@')[0] : 'Tecnico';

  return (
    <Box sx={{
      minHeight: '100vh',
      background: theme.palette.mode === 'dark' 
        ? 'linear-gradient(180deg, rgba(18,24,38,1) 0%, rgba(26,26,26,1) 100%)' 
        : 'linear-gradient(180deg, #f0f2f5 0%, #e8ecf1 100%)',
      color: theme.palette.text.primary,
      p: { xs: 2, sm: 3, md: 4 },
      transition: 'background-color 0.3s, color 0.3s',
    }}>
      {/* Sezione Intestazione */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: theme.palette.primary.main }}>
                Ciao, {userDisplayName}!
            </Typography>
            <Typography variant="body1" sx={{ color: theme.palette.text.secondary }}>
                Pronto a iniziare la giornata?
            </Typography>
        </Box>
        <Box>
            <IconButton onClick={toggleTheme} color="inherit" title={mode === 'dark' ? 'Tema chiaro' : 'Tema scuro'}>
                {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>
            <IconButton onClick={() => navigate('/settings')} color="inherit" title="Impostazioni">
                <SettingsIcon />
            </IconButton>
            <IconButton onClick={logout} color="inherit" title="Logout">
                <LogoutIcon />
            </IconButton>
        </Box>
      </Box>

      {/* Azione Principale: Nuovo Report */}
      <Card sx={{
          mb: 4,
          p: 3,
          borderRadius: '24px',
          background: `linear-gradient(145deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
          color: theme.palette.primary.contrastText,
          boxShadow: `0 10px 30px -10px ${theme.palette.primary.main}`,
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: `0 14px 35px -10px ${theme.palette.primary.dark}`,
          }
      }}>
          <CardActionArea onClick={() => navigate(mainAction.path)} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                  <Typography variant="h5" sx={{ fontWeight: 'bold' }}>{mainAction.text}</Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>{mainAction.description}</Typography>
              </Box>
              <Box sx={{
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
              }}>
                {mainAction.icon}
              </Box>
          </CardActionArea>
      </Card>
      
      <Divider sx={{ my: 4, borderColor: 'rgba(255, 255, 255, 0.1)' }}>
        <Typography variant="overline" sx={{ color: theme.palette.text.secondary }}>Strumenti</Typography>
      </Divider>

      {/* Griglia per le altre azioni */}
      <Grid container spacing={3}>
        {menuItems.map((item) => (
          <Grid xs={12} sm={6} key={item.text}>
            <Card sx={{
              borderRadius: '20px',
              backgroundColor: theme.palette.background.paper,
              boxShadow: theme.shadows[2],
              transition: 'transform 0.3s ease, box-shadow 0.3s ease',
              '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: theme.shadows[6],
              }
            }}>
              <CardActionArea
                onClick={() => navigate(item.path)}
                sx={{ 
                    p: 2.5,
                    display: 'flex', 
                    alignItems: 'center', 
                }}
              >
                <Box sx={{
                  width: { xs: 48, sm: 52 },
                  height: { xs: 48, sm: 52 },
                  borderRadius: '16px',
                  backgroundColor: theme.palette.primary.light + '33',
                  color: theme.palette.primary.main,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  mr: 2,
                }}>
                  {item.icon}
                </Box>
                <Typography variant="h6" sx={{ fontWeight: '600', color: 'inherit' }}>
                  {item.text}
                </Typography>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
      
      {/* Footer */}
      <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontStyle: 'italic', textAlign: 'center', pt: 6, pb: 1 }}>
        R.I.S.O. by &quot;AS&quot;
      </Typography>
    </Box>
  );
};

export default HomePage;
