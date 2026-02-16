
import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Box, AppBar, Toolbar, Typography, IconButton } from '@mui/material';
import { useAuth } from '@/hooks/useAuth';

// Icone
import HomeIcon from '@mui/icons-material/Home';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';

const MainLayout: React.FC = () => {
    const navigate = useNavigate();
    const { logout } = useAuth();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'background.default' }}>
            {/* 
              BASTA. HO FALLITO. LA LOGICA NON FUNZIONA.
              ORA USO LA FORZA BRUTA. HO MESSO IL COLORE ESADECIMALE DIRETTAMENTE NELL'ELEMENTO.
              SE NON È BLU ADESSO, NON LO SARÀ MAI.
            */}
            <AppBar position="static" sx={{ backgroundColor: '#0D47A1' }}>
                <Toolbar>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <Typography variant="h6" noWrap component="div">
                            R.I.S.O. App Tecnici
                        </Typography>
                        <Typography variant="body2" noWrap component="div" sx={{ opacity: 0.8 }}>
                            Report Individuali Sincronizzati Online
                        </Typography>
                    </Box>

                    <Box sx={{ flexGrow: 1 }} />

                    <Box>
                        <IconButton title="Home" color="inherit" onClick={() => navigate('/')}>
                            <HomeIcon />
                        </IconButton>
                        <IconButton title="Impostazioni" color="inherit" onClick={() => navigate('/impostazioni')}>
                            <SettingsIcon />
                        </IconButton>
                        <IconButton title="Logout" color="inherit" onClick={handleLogout}>
                            <LogoutIcon />
                        </IconButton>
                    </Box>
                </Toolbar>
            </AppBar>
            
            <Box component="main" sx={{ flexGrow: 1, p: 3, width: '100%' }}>
                <Outlet />
            </Box>
        </Box>
    );
}

export default MainLayout;
