import { RouterProvider } from 'react-router-dom';
import { router } from './routes/index';
import { AuthProvider } from './providers/AuthProvider';
import { ThemeProvider } from './providers/ThemeProvider';
import { SnackbarProvider } from './providers/SnackbarProvider';
import { MasterDataProvider } from './providers/MasterDataProvider';
import { GlobalDataProvider } from './providers/GlobalDataProvider';
import CssBaseline from '@mui/material/CssBaseline';
import { GlobalStyles } from '@mui/material';
import ReloadPrompt from './components/ReloadPrompt';

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
              <RouterProvider router={router} future={{ v7_startTransition: true }} />
            </GlobalDataProvider>
          </MasterDataProvider>
        </SnackbarProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
