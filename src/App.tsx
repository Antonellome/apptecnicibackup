
import { RouterProvider } from 'react-router-dom';
import { router } from './routes/index';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SnackbarProvider } from './contexts/SnackbarContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { MasterDataProvider } from './contexts/MasterDataProvider';
import { GlobalDataProvider } from './contexts/GlobalDataProvider';
import CssBaseline from '@mui/material/CssBaseline';
import { GlobalStyles } from '@mui/material';
import PWAUpdater from './components/PWAUpdater';

function App() {
  return (
    <ThemeProvider>
      <CssBaseline />
      <GlobalStyles styles={{ 'body::-webkit-scrollbar': { display: 'none' } }} />
      <AuthProvider>
        <SnackbarProvider>
          <PWAUpdater />
          <MasterDataProvider>
            <GlobalDataProvider>
              <NotificationProvider>
                <RouterProvider router={router} future={{ v7_startTransition: true }} />
              </NotificationProvider>
            </GlobalDataProvider>
          </MasterDataProvider>
        </SnackbarProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
