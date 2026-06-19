
import React, { useState, ReactNode } from 'react';
import { Snackbar, Alert, AlertColor } from '@mui/material';
import { SnackbarContext } from '../contexts/SnackbarContext';

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
  };

  return (
    <SnackbarContext.Provider value={{ showSnackbar }}>
      {children}
      <Snackbar 
        open={open} 
        autoHideDuration={action ? null : 6000} 
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
