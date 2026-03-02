import React, { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Box, AppBar, Toolbar, Typography, IconButton, Chip } from '@mui/material';
import { useAuth } from '@/hooks/useAuth';
import { useLiveQuery } from 'dexie-react-hooks';

// Servizi e DB
import { db } from '@/db/db';
import { sincronizzaConFirebase } from '@/services/offlineSync';
import { useSnackbar } from '@/contexts/SnackbarContext';

// Icone
import HomeIcon from '@mui/icons-material/Home';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import SyncIcon from '@mui/icons-material/Sync';

const MainLayout: React.FC = () => {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const { showSnackbar } = useSnackbar();

    // Hook di Dexie per sapere in tempo reale quanti rapportini sono in coda
    const rapportiniInSospeso = useLiveQuery(() => db.rapportiniInSospeso.count(), []);

    // Effetto per la sincronizzazione automatica
    useEffect(() => {
        const handleOnline = () => {
            showSnackbar('Sei di nuovo online. Provo a sincronizzare i dati...', 'info');
            sincronizzaConFirebase();
        };

        // Aggiungi listener per l'evento 'online'
        window.addEventListener('online', handleOnline);

        // Esegui la sincronizzazione al primo caricamento dell'app se si è online
        if (navigator.onLine) {
            sincronizzaConFirebase();
        }

        // Cleanup: rimuovi il listener quando il componente viene smontato
        return () => {
            window.removeEventListener('online', handleOnline);
        };
    }, [showSnackbar]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleForceSync = () => {
        if (navigator.onLine) {
            showSnackbar('Sincronizzazione manuale avviata...', 'info');
            sincronizzaConFirebase();
        } else {
            showSnackbar('Impossibile sincronizzare. Controlla la tua connessione.', 'warning');
        }
    }

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
                        {/* Mostra questo Chip solo se ci sono rapportini in attesa */}
                        {rapportiniInSospeso !== undefined && rapportiniInSospeso > 0 && (
                            <Chip 
                                icon={<CloudOffIcon />}
                                label={`${rapportiniInSospeso} in attesa`}
                                color="warning"
                                onClick={handleForceSync}
                                clickable
                                size="small"
                                onMouseEnter={() => (document.body.style.cursor = 'pointer')}
                                onMouseLeave={() => (document.body.style.cursor = 'default')}
                                deleteIcon={<SyncIcon />}
                                onDelete={handleForceSync} // Permette di cliccare anche sull'icona di sync
                                title="Ci sono rapportini salvati localmente. Clicca per provare a sincronizzare."
                            />
                        )}

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
