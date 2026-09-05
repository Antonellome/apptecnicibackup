import React, { useState, createContext } from 'react';
import { RouterProvider } from 'react-router-dom';
import { CssBaseline } from '@mui/material';
import { AuthProvider } from '@/providers/AuthProvider';
import { GlobalDataProvider } from '@/providers/GlobalDataProvider';
import { SnackbarProvider } from '@/providers/SnackbarProvider';
import { router } from '@/routes';

export const AppContext = createContext<{
  isMenuOpen: boolean;
  setMenuOpen: (isOpen: boolean) => void;
} | null>(null);

const App: React.FC = () => {
  const [isMenuOpen, setMenuOpen] = useState(false);
  const contextValue = { isMenuOpen, setMenuOpen };

  return (
    <AppContext.Provider value={contextValue}>
      <CssBaseline />
      <SnackbarProvider>
        <AuthProvider>
          <GlobalDataProvider>
            <RouterProvider router={router} future={{ v7_startTransition: true }} />
          </GlobalDataProvider>
        </AuthProvider>
      </SnackbarProvider>
    </AppContext.Provider>
  );
};

export default App;
