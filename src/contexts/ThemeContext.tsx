import React, { createContext, useState, useMemo, ReactNode } from 'react';
import { ThemeProvider as MUIThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
// CORREZIONE: Importo 'appThemes' che è l'export corretto, al posto di 'getTheme'
import { appThemes } from '@/theme';

// 1. TIPI E INTERFACCE
export type ThemeMode = 'light' | 'dark';

export interface ThemeContextInterface {
  // La funzione per cambiare tema al momento non avrà effetto
  toggleTheme: () => void;
  mode: ThemeMode;
}

// 2. CREAZIONE DEL CONTESTO
export const ThemeContext = createContext<ThemeContextInterface | undefined>(undefined);

// 3. PROVIDER COMPONENT
interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  // Poiché il blueprint definisce solo un tema scuro, forzo la modalità 'dark'
  const [mode] = useState<ThemeMode>('dark');

  // La funzione toggle non fa nulla, dato che non c'è un altro tema a cui passare
  const toggleTheme = () => {
    console.log("Cambio tema non abilitato: solo il tema scuro è definito.");
  };

  // CORREZIONE: Uso l'oggetto appThemes importato per selezionare il tema.
  // Visto che abbiamo solo il tema scuro, uso direttamente appThemes.dark.
  const theme = useMemo(() => appThemes.dark, []);

  const contextValue = useMemo(() => ({ toggleTheme, mode }), [mode]);

  return (
    <ThemeContext.Provider value={contextValue}>
      <MUIThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MUIThemeProvider>
    </ThemeContext.Provider>
  );
};
