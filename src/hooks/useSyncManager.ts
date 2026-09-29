import { useEffect, useCallback, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/local-db';
import { syncAllAnagrafiche, syncUserRapportini, processSyncQueue } from '@/services/offlineSync';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { useAuth } from './useAuth';
import { useOnlineStatus } from './useOnlineStatus';
import { hasInitialSyncBeenTriggered, markInitialSyncAsTriggered } from '@/services/syncV2/syncState';

export const useSyncManager = () => {
    const { showSnackbar } = useSnackbar();
    const { user } = useAuth();
    const [isSyncing, setIsSyncing] = useState(() => !hasInitialSyncBeenTriggered());
    const isOnline = useOnlineStatus();
    const hasBeenOfflineRef = useRef(false);

    const runFullSync = useCallback(async (syncType: 'Iniziale' | 'Manuale', tecnicoId: string) => {
        if (syncType === 'Manuale' && isSyncing) {
            showSnackbar("Sincronizzazione già in corso.", "info");
            return;
        }

        setIsSyncing(true);
        console.log(`[Sync] Avvio sincronizzazione ${syncType} per utente ${tecnicoId}.`);

        try {
            if (syncType === 'Iniziale') {
                await syncAllAnagrafiche();
                await syncUserRapportini(tecnicoId);
                await processSyncQueue();
            } else {
                await processSyncQueue();
                await syncAllAnagrafiche();
                await syncUserRapportini(tecnicoId);
            }

            if (syncType === 'Manuale') {
                showSnackbar('Sincronizzazione completata!', 'success');
            }
            console.log(`[Sync] Sincronizzazione ${syncType} completata con successo.`);
        } catch (error) {
            console.error(`[Sync] Errore critico durante la sincronizzazione ${syncType}.`, error);
            if (syncType === 'Manuale') showSnackbar("Errore durante la sincronizzazione.", "error");
        } finally {
            setIsSyncing(false);
            if (syncType === 'Iniziale') {
                // Questa chiamata ora scrive su una variabile globale, non su uno stato React
                markInitialSyncAsTriggered();
            }
        }
    }, [isSyncing, showSnackbar]);

    // Effetto per la SINCRONIZZAZIONE INIZIALE
    useEffect(() => {
        // La condizione ora si basa sullo stato globale, immune ai ri-render
        if (isOnline && user?.uid && !hasInitialSyncBeenTriggered()) {
            console.log("[Sync] Trigger: Avvio sincronizzazione iniziale (una tantum per sessione).");
            // Marco lo stato globale. Anche se questo useEffect venisse richiamato,
            // hasInitialSyncBeenTriggered() restituirebbe true, bloccando il loop.
            markInitialSyncAsTriggered();
            runFullSync('Iniziale', user.uid);
        }
    }, [isOnline, user, runFullSync]);

    const triggerQueueSync = useCallback(async (tecnicoId: string, isComingBackOnline = false) => {
        if (!isOnline) return;
        try {
            await processSyncQueue();
            await syncUserRapportini(tecnicoId);
            if (isComingBackOnline) {
                showSnackbar('Bentornato online! Le tue modifiche sono state sincronizzate.', 'success');
            }
        } catch (error) {
            console.error('[Sync] Errore durante il processamento della coda:', error);
            showSnackbar('Errore nel sincronizzare le ultime modifiche.', 'error');
        }
    }, [isOnline, showSnackbar]);

    // Effetto per gestire il RIENTRO DALLA MODALITÀ OFFLINE
    useEffect(() => {
        if (!isOnline) {
            hasBeenOfflineRef.current = true;
            return;
        }
        if (isOnline && hasBeenOfflineRef.current && user?.uid) {
            console.log("[Sync] Trigger: Rientro online, avvio sincronizzazione della coda.");
            triggerQueueSync(user.uid, true);
            hasBeenOfflineRef.current = false;
        }
    }, [isOnline, user, triggerQueueSync]);

    const requestManualSync = useCallback(() => {
        if (!user?.uid) return showSnackbar('Impossibile avviare la sincronizzazione: utente non valido.', 'error');
        if (!isOnline) return showSnackbar('Sei offline. La sincronizzazione manuale non è disponibile.', 'warning');
        runFullSync('Manuale', user.uid);
    }, [isOnline, user, runFullSync]);

    const pendingSyncItems = useLiveQuery(() => db.syncQueue.where('syncStatus').equals('pending').count(), []);

    return { requestManualSync, triggerQueueSync: () => user?.uid && triggerQueueSync(user.uid), isSyncing, pendingSyncItems, error: null };
};
