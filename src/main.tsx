
import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes/index.tsx';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SnackbarProvider } from './contexts/SnackbarContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { MasterDataProvider } from './contexts/MasterDataProvider';
import { GlobalDataProvider } from './contexts/GlobalDataProvider';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Impossibile trovare l'elemento root.");

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <ThemeProvider>
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
  </React.StrictMode>
);
