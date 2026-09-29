import { useState } from 'react';
import { Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import { useSnackbar } from '@/contexts/SnackbarContext';

export const ForceUpdateButton = () => {
    const [updating, setUpdating] = useState(false);
    const [open, setOpen] = useState(false);
    const { showSnackbar } = useSnackbar();

    const handleClickOpen = () => {
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
    };
    
    const handleConfirm = () => {
        setOpen(false);
        handleForceUpdate();
    }

    const handleForceUpdate = async () => {
        setUpdating(true);
        showSnackbar("Procedura di aggiornamento forzato avviata... Non chiudere la pagina.", 'info');

        try {
            // 1. Deregistra tutti i Service Worker
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                if (registrations.length) {
                    showSnackbar(`Trovati ${registrations.length} service worker da rimuovere...`, 'info');
                    await Promise.all(registrations.map(reg => reg.unregister()));
                    console.log('Service Workers deregistrati.');
                }
            }

            // 2. Cancella tutte le cache
            if ('caches' in window) {
                const keys = await caches.keys();
                if (keys.length) {
                    showSnackbar(`Trovate ${keys.length} cache da eliminare...`, 'info');
                    await Promise.all(keys.map(key => caches.delete(key)));
                    console.log('Cache eliminate.');
                }
            }

            // 3. Cancella il database IndexedDB
            try {
                showSnackbar('Tentativo di eliminazione del database locale...', 'info');
                await new Promise((resolve, reject) => {
                    const deleteRequest = indexedDB.deleteDatabase('RisoWebAppDB');
                    deleteRequest.onsuccess = () => {
                        console.log('Database IndexedDB eliminato con successo.');
                        resolve(true);
                    };
                    deleteRequest.onerror = (event) => {
                        console.error('Errore eliminazione database:', event);
                        reject('Errore durante l\'eliminazione del database IndexedDB.');
                    };
                    deleteRequest.onblocked = () => {
                        console.warn('Eliminazione database bloccata. Chiudere altre schede dell\'app.');
                        reject('Eliminazione bloccata. Assicurati di non avere altre schede dell\'app aperte.');
                    };
                });
            } catch (error) {
                 console.error('Errore durante la cancellazione del DB:', error);
                 showSnackbar(`Errore minore nell\'eliminazione del DB: ${error}`, 'warning');
            }


            // 4. Ricarica la pagina
            showSnackbar('Pulizia completata. Ricaricamento dell\'app in corso...', 'success');
            
            setTimeout(() => {
                window.location.reload();
            }, 1500);

        } catch (error) {
            console.error("Errore critico durante l'aggiornamento forzato:", error);
            showSnackbar(`ERRORE CRITICO: ${error}. Prova a pulire la cache del browser manualmente.`, 'error');
            setUpdating(false);
        }
    };

    return (
        <>
            <Button variant="contained" color="error" onClick={handleClickOpen} disabled={updating} fullWidth>
                {updating ? <CircularProgress size={24} color="inherit" /> : 'Forza Aggiornamento e Reset App'}
            </Button>
            <Dialog
                open={open}
                onClose={handleClose}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
            >
                <DialogTitle id="alert-dialog-title">
                    {"ATTENZIONE: RESET TOTALE DELL'APP!"}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="alert-dialog-description">
                        Stai per cancellare tutti i dati locali, compresi i report non sincronizzati, e forzare il download della versione più recente.
                        <br/><br/>
                        <strong>L'operazione è IRREVERSIBILE.</strong>
                        <br/><br/>
                        Sei assolutamente sicuro di voler procedere?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>Annulla</Button>
                    <Button onClick={handleConfirm} autoFocus color="error">
                        Sì, sono sicuro
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};
