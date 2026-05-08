
// CIAO. Punto di ingresso dell'applicazione React.

import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes/index.tsx'; // Importa il router moderno
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SnackbarProvider } from './contexts/SnackbarContext';
import { NotificationProvider } from './contexts/NotificationContext'; // RE-INSERITO
import { MasterDataProvider } from './contexts/MasterDataProvider';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Impossibile trovare l'elemento root.");

const root = ReactDOM.createRoot(rootElement);

// Utilizza il RouterProvider con la configurazione centralizzata
root.render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <SnackbarProvider>
          <NotificationProvider> {/* RE-INSERITO */}
            <MasterDataProvider>
              <RouterProvider router={router} future={{ v7_startTransition: true }} />
            </MasterDataProvider>
          </NotificationProvider>
        </SnackbarProvider>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);
