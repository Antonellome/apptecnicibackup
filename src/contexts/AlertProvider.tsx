import React, { useState, useCallback, ReactNode } from 'react';
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button, Snackbar, Alert as MuiAlert } from '@mui/material';
import { AlertContext } from './AlertContext';
import type { ConfirmOptions, AlertOptions } from './AlertContext';

interface AlertProviderProps {
  children: ReactNode;
}

export const AlertProvider: React.FC<AlertProviderProps> = ({ children }) => {
  const [alert, setAlert] = useState<AlertOptions | null>(null);
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null);

  const handleCloseAlert = () => setAlert(null);
  const handleCloseConfirm = () => setConfirm(null);

  const handleCancel = () => {
    if (confirm?.onCancel) {
      confirm.onCancel();
    }
    handleCloseConfirm();
  };

  const handleConfirm = async () => {
    if (confirm?.onConfirm) {
      await confirm.onConfirm();
    }
    handleCloseConfirm();
  };

  const showAlert = useCallback((message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setAlert({ message, severity });
  }, []);

  const showConfirm = useCallback((options: ConfirmOptions) => {
    setConfirm(options);
  }, []);

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm }}>
      {children}

      <Snackbar 
        open={!!alert} 
        autoHideDuration={6000} 
        onClose={handleCloseAlert} 
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {alert && (
          <MuiAlert onClose={handleCloseAlert} severity={alert.severity} sx={{ width: '100%' }} variant="filled">
            {alert.message}
          </MuiAlert>
        )}
      </Snackbar>

      {confirm && (
        <Dialog open={!!confirm} onClose={handleCancel}>
          <DialogTitle>{confirm.title}</DialogTitle>
          <DialogContent>
            <DialogContentText>{confirm.description}</DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCancel}>{confirm.cancelText || 'Annulla'}</Button>
            <Button onClick={handleConfirm} color="primary" autoFocus>
              {confirm.confirmText || 'Conferma'}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </AlertContext.Provider>
  );
};
