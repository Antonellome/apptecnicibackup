import React, { createContext, useState, useMemo, useContext, ReactNode } from 'react';
import { ThemeProvider as MUIThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { getTheme } from '@/theme';

// 1. TIPI E INTERFACCE
export type ThemeMode = 'light' | 'dark';

export interface ThemeContextInterface {
  toggleTheme: () => void;
  mode: ThemeMode;
}

// 2. CREAZIONE DEL CONTESTO
export const ThemeContext = createContext<ThemeContextInterface | undefined>(undefined);

// 3. HOOK PERSONALIZZATO
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// 4. PROVIDER COMPONENT
const getInitialMode = (): ThemeMode => {
  if (typeof window !== 'undefined') {
    const savedMode = localStorage.getItem('themeMode');
    if (savedMode === 'light' || savedMode === 'dark') {
      return savedMode;
    }
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  }
  return 'light';
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [mode, setMode] = useState<ThemeMode>(getInitialMode);

  const toggleTheme = () => {
    setMode((prevMode) => {
      const newMode = prevMode === 'light' ? 'dark' : 'light';
      if (typeof window !== 'undefined') {
        localStorage.setItem('themeMode', newMode);
      }
      return newMode;
    });
  };

  const theme = useMemo(() => getTheme(mode), [mode]);
  const contextValue: ThemeContextInterface = useMemo(() => ({ toggleTheme, mode }), [mode]);

  return (
    <ThemeContext.Provider value={contextValue}>
      <MUIThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MUIThemeProvider>
    </ThemeContext.Provider>
  );
};
