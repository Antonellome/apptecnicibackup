import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Snackbar, Alert, AlertColor } from '@mui/material';

interface SnackbarContextType {
  showSnackbar: (message: string, severity?: AlertColor, action?: React.ReactNode) => void;
}

const SnackbarContext = createContext<SnackbarContextType | undefined>(undefined);

export const useSnackbar = () => {
  const context = useContext(SnackbarContext);
  if (!context) {
    throw new Error('useSnackbar must be used within a SnackbarProvider');
  }
  return context;
};

interface SnackbarProviderProps {
  children: ReactNode;
}

export const SnackbarProvider: React.FC<SnackbarProviderProps> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<AlertColor>('info');
  const [action, setAction] = useState<React.ReactNode | undefined>(undefined);

  const showSnackbar = (message: string, severity: AlertColor = 'info', action?: React.ReactNode) => {
    setMessage(message);
    setSeverity(severity);
    setAction(action);
    setOpen(true);
  };

  const handleClose = (_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpen(false);
    // Resettiamo l'azione dopo che l'animazione di chiusura è iniziata/finita
    // Lo stato verrà comunque sovrascritto alla prossima chiamata di showSnackbar
  };

  return (
    <SnackbarContext.Provider value={{ showSnackbar }}>
      {children}
      <Snackbar 
        open={open} 
        autoHideDuration={action ? null : 6000} // Se c'è un'azione di sistema (come aggiorna), non chiudere automaticamente
        onClose={handleClose}
        action={action}
      >
        <Alert 
          onClose={handleClose} 
          severity={severity} 
          sx={{ width: '100%' }}
          action={action}
        >
          {message}
        </Alert>
      </Snackbar>
    </SnackbarContext.Provider>
  );
};