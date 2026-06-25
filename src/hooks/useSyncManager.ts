
import { useEffect, useCallback, useRef, useState } from 'react';
import { db } from '@/db/local-db';
import { sincronizzaTutto } from '@/services/offlineSync';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { useAuth } from './useAuth';

export const useSyncManager = () => {
    const { showSnackbar } = useSnackbar();
    const { user } = useAuth(); // Aggiunto per ottenere l'utente autenticato
    const isSyncing = useRef(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    // Monitora lo stato della connessione
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

    // Funzione core per la sincronizzazione, ora centralizzata
    const handleSync = useCallback(async (isManualTrigger = false) => {
        if (!user) { // Controllo per assicurarsi che l'utente sia loggato
            if(isManualTrigger) showSnackbar("Utente non autenticato. Impossibile sincronizzare.", "error");
            return;
        }

        if (isSyncing.current) {
            if (isManualTrigger) showSnackbar("Sincronizzazione già in corso.", "info");
            return;
        }
        if (!isOnline) {
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
            await sincronizzaTutto(user.uid); // Corretto: chiamata a sincronizzaTutto con l'ID utente
            if (isManualTrigger) showSnackbar(`Sincronizzazione completata! ${count} record inviati.`, 'success');
        } catch (error) { 
            showSnackbar('Errore durante la sincronizzazione.', 'error');
            console.error("Errore di sincronizzazione:", error);
        } finally {
            isSyncing.current = false;
        }
    }, [showSnackbar, isOnline, user]);

    // Trigger automatico della sincronizzazione quando si torna online
    useEffect(() => {
        if (isOnline) {
            console.log("SyncManager: Rilevato stato online, avvio sincronizzazione automatica.");
            handleSync(false);
        }
    }, [isOnline, handleSync]);

    // Esponiamo la funzione per trigger manuali futuri, se necessario
    return { requestManualSync: () => handleSync(true) };
};
