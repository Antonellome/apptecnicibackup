import { useEffect, useCallback, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/local-db';
import { sincronizzaTutto } from '@/services/offlineSync';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { useAuth } from './useAuth';
import { useOnlineStatus } from './useOnlineStatus';
import { hasInitialSyncBeenTriggered, markInitialSyncAsTriggered } from '@/services/syncV2/syncState';

/**
 * Hook per gestire la logica di sincronizzazione offline-first.
 * Utilizza un gestore di stato esterno per garantire che la sincronizzazione iniziale avvenga una sola volta per sessione.
 */
export const useSyncManager = () => {
    const { showSnackbar } = useSnackbar();
    const { userProfile } = useAuth();
    const isOnline = useOnlineStatus();
    const isSyncing = useRef(false);

    const pendingSyncCount = useLiveQuery(() => db.syncQueue.where({ syncStatus: 'pending' }).count(), [], 0);

    // EFFETTO 1: Esegue la sincronizzazione UNA SOLA VOLTA all'avvio dell'app, usando lo stato esterno.
    useEffect(() => {
        const runInitialSync = async () => {
            if (isSyncing.current) return;

            isSyncing.current = true;
            console.log("Orchestratore (AVVIO): Prima sincronizzazione automatica.");

            try {
                await sincronizzaTutto(userProfile!.tecnicoId);
                console.log("SYNC ACTION: Completata con successo (Iniziale).");
            } catch (error) {
                showSnackbar('Errore di sincronizzazione in background.', 'error');
                console.error(`Errore critico during initial sync:`, error);
            } finally {
                isSyncing.current = false;
            }
        };

        // CONDIZIONE DI INNESCO: utente, online e flag esterno non ancora impostato.
        if (isOnline && userProfile?.tecnicoId && !hasInitialSyncBeenTriggered()) {
            // Il flag viene impostato immediatamente per prevenire qualsiasi riesecuzione
            // causata da rapidi re-render.
            markInitialSyncAsTriggered();
            runInitialSync();
        }
    // Le dipendenze sono stabili e reagiscono ai cambi di stato necessari.
    }, [isOnline, userProfile, showSnackbar]);

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
        if (isSyncing.current) {
            showSnackbar("Sincronizzazione già in corso.", "info");
            return;
        }

        isSyncing.current = true;
        const count = await db.syncQueue.where({ syncStatus: 'pending' }).count();
        const msg = count === 0 
            ? 'Nessun dato locale da inviare. Controllo novità dal server...' 
            : `Sincronizzazione manuale avviata per ${count} record...`;
        showSnackbar(msg, 'info');
        console.log(`SYNC ACTION: Avviata (Manuale) con ${count} elementi in coda.`);

        try {
            await sincronizzaTutto(userProfile.tecnicoId);
            showSnackbar('Sincronizzazione completata! I dati sono allineati.', 'success');
            console.log("SYNC ACTION: Completata con successo (Manuale).");
        } catch (error) {
            showSnackbar('Errore critico durante la sincronizzazione manuale.', 'error');
            console.error(`Errore critico during manual sync:`, error);
        } finally {
            isSyncing.current = false;
        }
    }, [isOnline, userProfile, showSnackbar]);

    return {
        requestManualSync,
        pendingSyncCount
    };
};
