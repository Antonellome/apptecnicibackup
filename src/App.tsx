import { AuthProvider } from './providers/AuthProvider';
import { ThemeProvider } from './providers/ThemeProvider';
import { SnackbarProvider } from './providers/SnackbarProvider';
import { MasterDataProvider } from './providers/MasterDataProvider';
// CORREZIONE: Cambiato il percorso di importazione per usare il provider corretto
import { GlobalDataProvider } from './contexts/GlobalDataProvider';
import CssBaseline from '@mui/material/CssBaseline';
import { GlobalStyles } from '@mui/material';
import ReloadPrompt from './components/ReloadPrompt';
import AppContent from './components/AppContent';
import ErrorBoundary from './components/ErrorBoundary';

import './components/ReloadPrompt.css';

function App() {
  return (
    <ThemeProvider>
      <CssBaseline />
      <GlobalStyles styles={{ 'body::-webkit-scrollbar': { display: 'none' } }} />
      <AuthProvider>
        <SnackbarProvider>
          <ReloadPrompt />
          <MasterDataProvider>
            <GlobalDataProvider>
              <ErrorBoundary>
                <AppContent />
              </ErrorBoundary>
            </GlobalDataProvider>
          </MasterDataProvider>
        </SnackbarProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
