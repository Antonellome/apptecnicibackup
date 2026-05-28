
import React, { useEffect, useCallback, useRef } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Box, AppBar, Toolbar, Typography, IconButton } from '@mui/material';
import { useAuth } from '@/hooks/useAuth';

// Servizi, DB e Context
import { db } from '@/db/local-db'; // Percorso corretto
import { sincronizzaConFirebase } from '@/services/offlineSync';
import { useSnackbar } from '@/contexts/SnackbarContext';

// Icone
import HomeIcon from '@mui/icons-material/Home';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';

const MainLayout: React.FC = () => {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const { showSnackbar } = useSnackbar();
    const isSyncing = useRef(false);

    const handleSync = useCallback(async (isManualTrigger = false) => {
        if (isSyncing.current) {
            if (isManualTrigger) showSnackbar("Sincronizzazione già in corso.", "info");
            return;
        }
        if (!navigator.onLine) {
            if (isManualTrigger) showSnackbar('Impossibile sincronizzare: sei offline.', 'warning');
            return;
        }
        
        const count = await db.syncQueue.count();
        if (count === 0) {
            if (isManualTrigger) showSnackbar('Nessun dato da sincronizzare.', 'success');
            return;
        }

        isSyncing.current = true;
        if (isManualTrigger) showSnackbar('Sincronizzazione avviata...', 'info');
        
        try {
            await sincronizzaConFirebase();
            if (isManualTrigger) showSnackbar(`Sincronizzazione completata! ${count} record inviati.`, 'success');
        } catch (error) { 
            showSnackbar('Errore durante la sincronizzazione.', 'error');
            console.error("Errore di sincronizzazione:", error);
        } finally {
            isSyncing.current = false;
        }
    }, [showSnackbar]);

    // Effetto per la sincronizzazione automatica al ritorno online
    useEffect(() => {
        const onOnline = () => handleSync(false);
        onOnline(); // Tenta una sincronizzazione all'avvio del componente se online
        window.addEventListener('online', onOnline);
        return () => {
            window.removeEventListener('online', onOnline);
        };
    }, [handleSync]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'background.default' }}>
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

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
