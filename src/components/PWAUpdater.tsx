import React, { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { Button } from '@mui/material';

/**
 * Componente invisibile che gestisce l'aggiornamento automatico della PWA.
 * Utilizza il Metodo del Grande Maestro per garantire che l'utente riceva
 * l'ultima versione di hosting senza dover reinstallare l'app sulla Home.
 */
const PWAUpdater: React.FC = () => {
  const { showSnackbar } = useSnackbar();
  
  // Registrazione del Service Worker con monitoraggio degli aggiornamenti
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r: ServiceWorkerRegistration | undefined) {
      console.log('SW Registered: ', r);
    },
    onRegisterError(error: any) {
      console.error('SW registration error', error);
    },
  });

  useEffect(() => {
    if (needRefresh) {
      // Azione dello Snackbar per forzare il refresh del Service Worker
      const action = (
        <Button 
          color="inherit" 
          size="small" 
          onClick={() => {
            updateServiceWorker(true);
            setNeedRefresh(false);
          }}
          sx={{ fontWeight: 'bold' }}
        >
          AGGIORNA
        </Button>
      );

      // Mostra la notifica all'utente tramite il context centralizzato, includendo l'azione
      showSnackbar("Nuova versione disponibile!", "info", action);
    }
  }, [needRefresh, updateServiceWorker, setNeedRefresh, showSnackbar]);

  // Il componente non renderizza nulla nella UI
  return null;
};

export default PWAUpdater;