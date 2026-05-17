
import React, { useEffect, useCallback, useRef } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Box, AppBar, Toolbar, Typography, IconButton, Chip, Badge } from '@mui/material';
import { useAuth } from '@/hooks/useAuth';
import { useLiveQuery } from 'dexie-react-hooks';

// Servizi, DB e Context
import { db } from '@/db/db';
import { sincronizzaConFirebase } from '@/services/offlineSync';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { useGlobalData } from '@/contexts/GlobalDataProvider'; // 1. Importato GlobalData

// Icone
import HomeIcon from '@mui/icons-material/Home';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import SyncIcon from '@mui/icons-material/Sync';
import NotificationsIcon from '@mui/icons-material/Notifications'; // 2. Importata icona Notifiche

const MainLayout: React.FC = () => {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const { showSnackbar } = useSnackbar();
    const isSyncing = useRef(false);

    // 3. Recupero del contatore notifiche dal contesto globale
    const { unreadNotificationsCount } = useGlobalData();

    const rapportiniInSospeso = useLiveQuery(() => db.rapportiniInSospeso.count(), []);

    const handleSync = useCallback(async (isManualTrigger = false) => {
        if (isSyncing.current) {
            if (isManualTrigger) showSnackbar("Sincronizzazione già in corso.", "info");
            return;
        }
        if (!navigator.onLine) {
            if (isManualTrigger) showSnackbar('Impossibile sincronizzare: sei offline.', 'warning');
            return;
        }
        
        const count = await db.rapportiniInSospeso.count();
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

    useEffect(() => {
        const onOnline = () => handleSync(false);
        onOnline();
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
                        {rapportiniInSospeso !== undefined && rapportiniInSospeso > 0 && (
                            <Chip 
                                icon={<SyncIcon />} 
                                label={`${rapportiniInSospeso} in coda`}
                                color="warning"
                                onClick={() => handleSync(true)} 
                                clickable
                                size="small"
                                title="Ci sono rapportini salvati localmente. Clicca per forzare la sincronizzazione."
                            />
                        )}

                        <IconButton title="Home" color="inherit" onClick={() => navigate('/')}>
                            <HomeIcon />
                        </IconButton>

                        {/* 4 & 5. Aggiunto IconButton con Badge per le notifiche */}
                        <IconButton title="Notifiche" color="inherit" onClick={() => navigate('/notifiche')}>
                            <Badge badgeContent={unreadNotificationsCount} color="error">
                                <NotificationsIcon />
                            </Badge>
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
