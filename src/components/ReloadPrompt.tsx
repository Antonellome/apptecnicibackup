import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button, Snackbar, Alert, Slide } from '@mui/material';
import type { SlideProps } from '@mui/material';
import React from 'react';

function SlideTransition(props: SlideProps) {
  return <Slide {...props} direction="up" />;
}

function ReloadPrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      if (r) {
        // Controlla periodicamente gli aggiornamenti del SW
        setInterval(() => {
          r.update();
        }, 3600 * 1000); // 1 ora
      }
    },
    onRegisterError(error: any) {
      console.error('Errore di registrazione del Service Worker:', error);
    },
  });

  // Handler specifico per la Snackbar, che riceve anche la "reason"
  const handleSnackbarClose = (_event: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  // Handler generico per chiudere la notifica, usato da Alert e Button
  const handleGeneralClose = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  }

  const handleUpdate = () => {
    updateServiceWorker(true);
  };

  const open = offlineReady || needRefresh;

  return (
    <Snackbar
      open={open}
      autoHideDuration={null}
      onClose={handleSnackbarClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      TransitionComponent={SlideTransition}
    >
      <Alert
        severity={offlineReady ? "success" : "info"}
        variant="filled"
        onClose={handleGeneralClose}
        action={
          <>
            {needRefresh && (
              <Button color="inherit" size="small" onClick={handleUpdate}>
                Aggiorna
              </Button>
            )}
            <Button color="inherit" size="small" onClick={handleGeneralClose}>
              Chiudi
            </Button>
          </>
        }
      >
        {offlineReady
          ? "L'app è pronta per funzionare offline."
          : "È disponibile una nuova versione dell'app!"}
      </Alert>
    </Snackbar>
  );
}

export default ReloadPrompt;
