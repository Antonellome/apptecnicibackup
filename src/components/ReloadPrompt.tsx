import { useRegisterSW } from 'virtual:pwa-register/react';
import { Snackbar, Alert, Button, Box } from '@mui/material';

function ReloadPrompt() {
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

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  return (
    <Snackbar
      open={offlineReady || needRefresh}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert
        severity="info"
        variant="filled"
        onClose={close}
        action={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {needRefresh && (
              <Button color="inherit" size="small" onClick={() => updateServiceWorker(true)}>
                Aggiorna
              </Button>
            )}
            <Button color="inherit" size="small" onClick={close}>
              Chiudi
            </Button>
          </Box>
        }
      >
        {offlineReady
          ? 'App pronta per funzionare offline.'
          : 'Nuovo contenuto disponibile, clicca su \'Aggiorna\'.'
        }
      </Alert>
    </Snackbar>
  );
}

export default ReloadPrompt;
