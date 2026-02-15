
import React, { useMemo, ReactNode } from 'react';
import { ThemeProvider as MUIThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { getThemeOptions } from '../theme';

interface ThemeProviderProps {
  children: ReactNode;
}

// CIAO: Correzione del crash. Rimuovo la logica di cambio tema che causava l'errore.
// Applico direttamente e unicamente il tema scuro, come da ordine ricevuto.
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  
  const theme = useMemo(() => createTheme(getThemeOptions()), []);

  return (
    <MUIThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </MUIThemeProvider>
  );
};
