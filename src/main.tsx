
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes/index.tsx';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SnackbarProvider } from './contexts/SnackbarContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { syncMasterData } from './services/dataSync';
import './index.css';
import { CircularProgress, Box, Typography } from '@mui/material';

const AppInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const initialize = async () => {
            try {
                await syncMasterData();
                setLoading(false);
            } catch (err) {
                console.error(err);
                setError("Impossibile sincronizzare i dati. L'applicazione non può partire.");
            }
        };
        initialize();
    }, []);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <CircularProgress />
                <Typography sx={{ mt: 2 }}>Inizializzazione dati in corso...</Typography>
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'red' }}>
                <Typography variant="h6">{error}</Typography>
            </Box>
        );
    }

    return <>{children}</>;
};

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Impossibile trovare l'elemento root.");

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <SnackbarProvider>
          <NotificationProvider>
            <AppInitializer>
                <RouterProvider router={router} future={{ v7_startTransition: true }} />
            </AppInitializer>
          </NotificationProvider>
        </SnackbarProvider>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);
