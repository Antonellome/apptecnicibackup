import { useEffect, useCallback, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/local-db';
import { syncAllAnagrafiche, processSyncQueue } from '@/services/offlineSync';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { useAuth } from './useAuth';
import { useOnlineStatus } from './useOnlineStatus';
import { hasInitialSyncBeenTriggered, markInitialSyncAsTriggered } from '@/services/syncV2/syncState';

/**
 * Hook per gestire la logica di sincronizzazione offline-first.
 */
export const useSyncManager = () => {
    const { showSnackbar } = useSnackbar();
    const { userProfile } = useAuth();
    const isOnline = useOnlineStatus();
    const isSyncing = useRef(false);

    const pendingSyncCount = useLiveQuery(() => db.syncQueue.where('syncStatus').equals('pending').count(), [], 0);

    const runFullSync = useCallback(async (syncType: 'Iniziale' | 'Manuale') => {
        if (isSyncing.current) {
            console.log(`SYNC SKIPPED: Sincronizzazione già in corso.`);
            if (syncType === 'Manuale') showSnackbar("Sincronizzazione già in corso.", "info");
            return;
        }

        isSyncing.current = true;
        console.log(`Orchestratore (AVVIO): Sincronizzazione ${syncType}.`);

        try {
            // FASE 0: RIPRISTINO AUTOMATICO
            // "Perdona" gli errori precedenti e rimette gli elementi in coda per un nuovo tentativo.
            const failedItems = await db.syncQueue.where('syncStatus').equals('error').toArray();
            if (failedItems.length > 0) {
                console.log(`SYNC ACTION: Trovati ${failedItems.length} elementi falliti. Tentativo di ripristino...`);
                await db.transaction('rw', db.syncQueue, async () => {
                    const updates = failedItems.map(item => 
                        db.syncQueue.update(item.id!, { syncStatus: 'pending', error: undefined, lastAttempt: undefined })
                    );
                    await Promise.all(updates);
                });
                showSnackbar(`Verrà ritentata la sincronizzazione per ${failedItems.length} operazioni fallite.`, 'info');
            }

            // FASE 1: UPLOAD - Processa la coda di elementi pendenti
            await processSyncQueue();
            console.log("SYNC ACTION (Upload): Coda locale processata.");

            // FASE 2: DOWNLOAD - Scarica le anagrafiche aggiornate
            await syncAllAnagrafiche();
            console.log("SYNC ACTION (Download): Anagrafiche aggiornate.");
            
            if (syncType === 'Manuale') {
                showSnackbar('Sincronizzazione completata! I dati sono allineati.', 'success');
            }
            console.log(`SYNC ACTION: Completata con successo (${syncType}).`);

        } catch (error) {
            const errorMessage = `Errore critico durante la sincronizzazione ${syncType}.`;
            showSnackbar(errorMessage, 'error');
            console.error(errorMessage, error);
        } finally {
            isSyncing.current = false;
        }
    }, [showSnackbar]);

    // EFFETTO 1: Esegue la sincronizzazione UNA SOLA VOLTA all'avvio dell'app.
    useEffect(() => {
        if (isOnline && userProfile?.tecnicoId && !hasInitialSyncBeenTriggered()) {
            markInitialSyncAsTriggered();
            runFullSync('Iniziale');
        }
    }, [isOnline, userProfile, runFullSync]);

    // Funzione per la sincronizzazione manuale richiesta dall'utente.
    const requestManualSync = useCallback(async () => {
        if (!isOnline) {
            showSnackbar('Sei offline. Le modifiche verranno sincronizzate appena tornerai online.', 'warning');
            return;
        }
        if (!userProfile?.tecnicoId) {
            showSnackbar("Utente non configurato. Impossibile sincronizzare.", "error");
            return;
        }

        const count = await db.syncQueue.where({ syncStatus: 'pending' }).count();
        const msg = count === 0 
            ? 'Nessun dato locale da inviare. Controllo novità dal server...' 
            : `Sincronizzazione manuale avviata per ${count} record...`;
        showSnackbar(msg, 'info');

        await runFullSync('Manuale');
        
    }, [isOnline, userProfile, showSnackbar, runFullSync]);

    return {
        requestManualSync,
        pendingSyncCount
    };
};