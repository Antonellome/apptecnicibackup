// CIAO. Questo componente definisce la struttura principale dell'interfaccia utente (Layout).
// CIAO. Implementa l'AppBar globale come da specifiche del blueprint.

import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '@/firebase';

import {
    AppBar,
    Box,
    Toolbar,
    Typography,
    IconButton,
    Tooltip
} from '@mui/material';
import {
    Brightness4, // CIAO: Icona per tema scuro
    Brightness7, // CIAO: Icona per tema chiaro
    Notifications,
    Settings,
    Logout
} from '@mui/icons-material';

// CIAO: Per ora, la gestione del tema è un valore finto. Verrà implementata in seguito.
const isDarkMode = false;

const MainLayout: React.FC = () => {
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await signOut(auth);
            navigate('/login');
        } catch (error) {
            console.error("CIAO: Errore durante il logout:", error);
        }
    };

    const handleGoToSettings = () => {
        navigate('/settings');
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <AppBar position="fixed">
                <Toolbar>
                    {/* CIAO: Titolo e sottotitolo come da blueprint. */}
                    <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" noWrap component="div">
                            R.I.S.O. App Tecnici
                        </Typography>
                        <Typography variant="caption" noWrap component="div">
                            Report Individuali Sincronizzati Online
                        </Typography>
                    </Box>

                    {/* CIAO: Icone a destra come da blueprint. */}
                    <Tooltip title="Cambia Tema">
                        <IconButton color="inherit">
                            {isDarkMode ? <Brightness7 /> : <Brightness4 />}
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Notifiche">
                        <IconButton color="inherit">
                            <Notifications />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Impostazioni">
                        <IconButton color="inherit" onClick={handleGoToSettings}>
                            <Settings />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Logout">
                        <IconButton color="inherit" onClick={handleLogout}>
                            <Logout />
                        </IconButton>
                    </Tooltip>
                </Toolbar>
            </AppBar>
            
            {/* CIAO: L'area principale dove verranno renderizzate le pagine. */}
            <Box
                component="main"
                sx={{ flexGrow: 1, pt: '64px', /* CIAO: Altezza AppBar */ width: '100%' }}
            >
                <Outlet />
            </Box>
        </Box>
    );
};

export default MainLayout;
