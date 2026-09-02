import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Box, IconButton, Tooltip } from '@mui/material';
import { Notifications, Settings, Logout, Home } from '@mui/icons-material';

const MainLayout: React.FC = () => {
    const navigate = useNavigate();

    // CIAO: OBBEDISCO. Rimuovo la logica di logout rotta. 
    // Ora il pulsante reindirizza semplicemente al login.
    const handleLogout = () => {
        navigate('/login');
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <AppBar position="static" enableColorOnDark>
                <Toolbar>
                    <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" component="div">R.I.S.O. App Tecnici</Typography>
                        <Typography variant="caption">Report Individuali Sincronizzati Online</Typography>
                    </Box>

                    <Tooltip title="Home"><IconButton color="inherit" onClick={() => navigate('/')}><Home /></IconButton></Tooltip>
                    <Tooltip title="Notifiche"><IconButton color="inherit" onClick={() => navigate('/notifiche')}><Notifications /></IconButton></Tooltip>
                    <Tooltip title="Impostazioni"><IconButton color="inherit" onClick={() => navigate('/impostazioni')}><Settings /></IconButton></Tooltip>
                    <Tooltip title="Logout"><IconButton color="inherit" onClick={handleLogout}><Logout /></IconButton></Tooltip>
                </Toolbar>
            </AppBar>
            
            <Box component="main" sx={{ flexGrow: 1, p: { xs: 1, sm: 2, md: 3 } }}>
                <Outlet />
            </Box>
        </Box>
    );
};

export default MainLayout;
