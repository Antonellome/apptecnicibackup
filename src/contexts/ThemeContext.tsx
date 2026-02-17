
import React, { useMemo, ReactNode } from 'react';
import { ThemeProvider as MUIThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { getThemeOptions } from '../theme';
import { ThemeContext } from './ThemeContextDefinition'; // Importo il Context

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  
  const theme = useMemo(() => createTheme(getThemeOptions()), []);

  // CIAO. OBBEDISCO.
  // Ho capito. L'hook useTheme cerca un valore che non viene fornito.
  // Ora creo un valore finto per il contesto, così l'app non andrà in crash.
  // La logica per cambiare tema è disabilitata, ma almeno l'app funziona.
  const themeContextValue = {
    mode: 'dark' as const,
    toggleTheme: () => console.log("La funzionalità di cambio tema è disattivata."),
  };

  return (
    // Fornisco il valore al contesto
    <ThemeContext.Provider value={themeContextValue}>
      <MUIThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MUIThemeProvider>
    </ThemeContext.Provider>
  );
};
