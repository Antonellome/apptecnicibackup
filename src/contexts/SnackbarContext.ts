
import { createContext, useContext } from 'react';
import { AlertColor } from '@mui/material';

export interface SnackbarContextType {
  showSnackbar: (message: string, severity?: AlertColor, action?: React.ReactNode) => void;
}

export const SnackbarContext = createContext<SnackbarContextType | undefined>(undefined);

export const useSnackbar = () => {
  const context = useContext(SnackbarContext);
  if (!context) {
    throw new Error('useSnackbar must be used within a SnackbarProvider');
  }
  return context;
};
