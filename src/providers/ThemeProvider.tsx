
import React, { useMemo, ReactNode } from 'react';
import { ThemeProvider as MUIThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { getThemeOptions } from '@/theme';
import { ThemeContext } from '../contexts/ThemeContextDefinition';

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  
  const theme = useMemo(() => createTheme(getThemeOptions()), []);

  const themeContextValue = {
    mode: 'dark' as const,
    toggleTheme: () => console.log("La funzionalità di cambio tema è disattivata."),
  };

  return (
    <ThemeContext.Provider value={themeContextValue}>
      <MUIThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MUIThemeProvider>
    </ThemeContext.Provider>
  );
};
