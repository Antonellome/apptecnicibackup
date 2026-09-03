import { AuthProvider } from './providers/AuthProvider';
import { ThemeProvider } from './providers/ThemeProvider';
import { SnackbarProvider } from './providers/SnackbarProvider';
import { MasterDataProvider } from './providers/MasterDataProvider';
import { GlobalDataProvider } from './providers/GlobalDataProvider'; // CORRETTO: Importo il provider, non il contesto.
import CssBaseline from '@mui/material/CssBaseline';
import { GlobalStyles } from '@mui/material';
import ReloadPrompt from './components/ReloadPrompt';
import AppContent from './components/AppContent';
import ErrorBoundary from './components/ErrorBoundary';

import './components/ReloadPrompt.css';

/**
 * Questa è l'architettura finale e corretta dei Provider.
 * 1. AuthProvider: Fornisce lo stato di autenticazione.
 * 2. GlobalDataProvider: Fonte di verità per l'UI. Usa Auth e Sync per gestire il loading
 *    e legge i dati da Dexie in tempo reale per fornirli all'app.
 * 3. MasterDataProvider: È un servizio "fantasma" che non renderizza nulla. Ascolta le
 *    modifiche alle anagrafiche in background e aggiorna Dexie, senza interferire con l'UI.
 */
function App() {
  return (
    <ThemeProvider>
      <CssBaseline />
      <GlobalStyles styles={{ 'body::-webkit-scrollbar': { display: 'none' } }} />
      <AuthProvider>
        <SnackbarProvider>
          <GlobalDataProvider>
            {/* MasterDataProvider ora vive qui, come un servizio silenzioso in background */}
            <MasterDataProvider />
            
            <ReloadPrompt />
            <ErrorBoundary>
              <AppContent />
            </ErrorBoundary>
            
          </GlobalDataProvider>
        </SnackbarProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
