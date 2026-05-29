
import { RouterProvider } from 'react-router-dom';
import { router } from './routes/index';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SnackbarProvider } from './contexts/SnackbarContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { MasterDataProvider } from './contexts/MasterDataProvider';
import { GlobalDataProvider } from './contexts/GlobalDataProvider';
import CssBaseline from '@mui/material/CssBaseline';

function App() {
  return (
    <ThemeProvider>
      <CssBaseline />
      <AuthProvider>
        <SnackbarProvider>
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
