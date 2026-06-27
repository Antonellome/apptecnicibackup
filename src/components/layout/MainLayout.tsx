import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Box, AppBar, Toolbar, Typography, IconButton, Alert, Tooltip } from '@mui/material';
import { useAuth } from '@/hooks/useAuth';

// Icone
import HomeIcon from '@mui/icons-material/Home';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import WifiOffIcon from '@mui/icons-material/WifiOff';

const MainLayout: React.FC = () => {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    // Monitora lo stato della connessione per visualizzare il banner
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error("Errore durante il logout:", error);
        }
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
            <AppBar position="static" sx={{ backgroundColor: '#0D47A1' }}>
                <Toolbar>
                    <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" component="div">R.I.S.O. App Tecnici</Typography>
                        <Typography variant="caption">Report Individuali Sincronizzati Online</Typography>
                    </Box>

                    <Tooltip title="Home"><IconButton color="inherit" onClick={() => navigate('/')}><HomeIcon /></IconButton></Tooltip>
                    <Tooltip title="Impostazioni"><IconButton color="inherit" onClick={() => navigate('/impostazioni')}><SettingsIcon /></IconButton></Tooltip>
                    <Tooltip title="Logout"><IconButton color="inherit" onClick={handleLogout}><LogoutIcon /></IconButton></Tooltip>
                </Toolbar>
            </AppBar>

            {!isOnline && (
                <Alert
                    severity="warning"
                    iconMapping={{ warning: <WifiOffIcon fontSize="inherit" /> }}
                    sx={{ 
                        borderRadius: 0, 
                        justifyContent: 'center', 
                        backgroundColor: 'warning.dark',
                        color: 'common.white',
                        fontWeight: 'bold'
                    }}
                >
                    Sei offline. Le funzionalità potrebbero essere limitate.
                </Alert>
            )}
            
            <Box component="main" sx={{ flexGrow: 1, p: { xs: 1, sm: 2, md: 3 }, width: '100%', boxSizing: 'border-box', overflowY: 'auto' }}>
                <Outlet />
            </Box>
        </Box>
    );
};

export default MainLayout;
