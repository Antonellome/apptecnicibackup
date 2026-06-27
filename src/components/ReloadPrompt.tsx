
import { useRegisterSW } from 'virtual:pwa-register/react';
import {
  Snackbar,
  Paper,
  Typography,
  Button,
  Box,
  useTheme,
} from '@mui/material';

function ReloadPrompt() {
  const theme = useTheme();
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log(`SW Registered: ${r}`);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  const handleClose = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  const handleUpdate = () => {
    updateServiceWorker(true);
  };

  return (
    <Snackbar
      open={offlineReady || needRefresh}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      sx={{ 
        bottom: { xs: 8, sm: 24 },
        justifyContent: 'center',
      }}
    >
      <Paper 
        elevation={4}
        sx={{
          p: 2,
          width: '100%',
          maxWidth: 400,
          mx: 2,
          backgroundColor: needRefresh ? theme.palette.primary.dark : theme.palette.background.paper,
          color: needRefresh ? theme.palette.primary.contrastText : theme.palette.text.primary,
          borderRadius: Number(theme.shape.borderRadius) * 1.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.5 }}>
              {needRefresh ? "Aggiornamento Disponibile" : "App Pronta Offline"}
            </Typography>
            <Typography variant="body2">
              {needRefresh
                ? "Una nuova versione dell'app è pronta."
                : "L'app è stata salvata e funzionerà anche senza connessione."
              }
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 1, ml: 2 }}>
            {needRefresh && (
              <Button 
                variant="contained" 
                color="secondary" 
                size="small" 
                onClick={handleUpdate}
                sx={{ color: 'white', fontWeight: 'bold' }}
              >
                Aggiorna
              </Button>
            )}
            <Button 
              variant="outlined" 
              color={needRefresh ? 'inherit' : 'primary'}
              size="small" 
              onClick={handleClose}
            >
              Chiudi
            </Button>
          </Box>
        </Box>
      </Paper>
    </Snackbar>
  );
}

export default ReloadPrompt;
