import { useContext } from 'react';
// CIAO. OBBEDISCO. Correggo il percorso di importazione per risolvere il crash.
import { ThemeContext, type ThemeContextInterface } from '@/contexts/ThemeContextDefinition';

/**
 * Hook personalizzato per accedere al contesto del tema.
 * Fornisce un accesso sicuro e tipizzato al `ThemeContext`,
 * garantendo che venga utilizzato solo all'interno di un `ThemeProvider`.
 *
 * @returns {ThemeContextInterface} L'oggetto del contesto contenente `mode` e `toggleTheme`.
 * @throws {Error} Se l'hook viene utilizzato al di fuori di un `ThemeProvider`.
 */
export const useTheme = (): ThemeContextInterface => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme deve essere utilizzato all\'interno di un ThemeProvider');
  }
  return context;
};
