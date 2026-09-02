import { createContext } from 'react';

// 1. TIPI E INTERFACCE
export type ThemeMode = 'light' | 'dark';

export interface ThemeContextInterface {
  toggleTheme: () => void;
  mode: ThemeMode;
}

// 2. CREAZIONE DEL CONTESTO
export const ThemeContext = createContext<ThemeContextInterface | undefined>(undefined);
