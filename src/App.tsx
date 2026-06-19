
import { RouterProvider } from 'react-router-dom';
import { router } from './routes/index';
import { AuthProvider } from './providers/AuthProvider';
import { ThemeProvider } from './providers/ThemeProvider';
import { SnackbarProvider } from './providers/SnackbarProvider';
import { NotificationProvider } from './providers/NotificationProvider';
import { MasterDataProvider } from './providers/MasterDataProvider';
import { GlobalDataProvider } from './providers/GlobalDataProvider';
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
