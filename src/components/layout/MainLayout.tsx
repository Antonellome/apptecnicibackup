import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Box, AppBar, Toolbar, Typography, IconButton, Tooltip } from '@mui/material';
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

                    {!isOnline && (
                        <Tooltip title="Sei offline">
                            <IconButton color="inherit">
                                <WifiOffIcon sx={{ color: 'yellow' }} />
                            </IconButton>
                        </Tooltip>
                    )}
                    <Tooltip title="Home"><IconButton color="inherit" onClick={() => navigate('/')}><HomeIcon /></IconButton></Tooltip>
                    <Tooltip title="Impostazioni"><IconButton color="inherit" onClick={() => navigate('/impostazioni')}><SettingsIcon /></IconButton></Tooltip>
                    <Tooltip title="Logout"><IconButton color="inherit" onClick={handleLogout}><LogoutIcon /></IconButton></Tooltip>
                </Toolbar>
            </AppBar>
            
            <Box component="main" sx={{ flexGrow: 1, p: { xs: 1, sm: 2, md: 3 }, width: '100%', boxSizing: 'border-box', overflowY: 'auto' }}>
                <Outlet />
            </Box>
        </Box>
    );
};

export default MainLayout;
