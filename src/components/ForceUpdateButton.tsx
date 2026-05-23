
import React, { useState } from 'react';
import { Button, CircularProgress } from '@mui/material';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { localDB } from '@/db/local-db';

export const ForceUpdateButton = () => {
    const [updating, setUpdating] = useState(false);
    const { showSnackbar } = useSnackbar();

    const handleForceUpdate = async () => {
        setUpdating(true);
        showSnackbar("Forzando l'aggiornamento dell'app...", 'info');
        try {
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (const registration of registrations) {
                    await registration.unregister();
                }
            }
            if ('caches' in window) {
                const keys = await caches.keys();
                await Promise.all(keys.map(key => caches.delete(key)));
            }
            await localDB.delete();
            setTimeout(() => { window.location.reload(); }, 2000);
        } catch (error) {
            console.error("Errore durante l'aggiornamento forzato:", error);
            showSnackbar("Errore durante l'aggiornamento forzato. Prova a pulire la cache del browser manualmente.", 'error');
            setUpdating(false);
        }
    };

    return (
        <Button variant="contained" color="warning" onClick={handleForceUpdate} disabled={updating}>
            {updating ? <CircularProgress size={24} /> : 'Forza Aggiornamento App'}
        </Button>
    );
};
