import { useEffect, useCallback, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks'; // RIPRISTINATO
import { db } from '@/db/local-db';
import { syncAllAnagrafiche, syncUserRapportini, processSyncQueue } from '@/services/offlineSync'; // processSyncQueue RIPRISTINATO
import { useSnackbar } from '@/contexts/SnackbarContext';
import { useAuth } from './useAuth';
import { useOnlineStatus } from './useOnlineStatus';
import { hasInitialSyncBeenTriggered, markInitialSyncAsTriggered } from '@/services/syncV2/syncState';

export const useSyncManager = () => {
    const { showSnackbar } = useSnackbar();
    const { userProfile } = useAuth();
    const isSyncing = useRef(false);
    const isOnline = useOnlineStatus();

    const tecnicoIdRef = useRef(userProfile?.tecnicoId);
    useEffect(() => {
        tecnicoIdRef.current = userProfile?.tecnicoId;
    }, [userProfile?.tecnicoId]);

    const runFullSync = useCallback(async (syncType: 'Iniziale' | 'Manuale') => {
        if (isSyncing.current) {
            if (syncType === 'Manuale') showSnackbar("Sincronizzazione già in corso.", "info");
            return;
        }
        
        const tecnicoId = tecnicoIdRef.current;
        if (!tecnicoId) {
             console.error("SYNC ABORTED: ID Tecnico non disponibile.");
             return;
        }

        isSyncing.current = true;
        console.log(`Orchestratore (AVVIO): Sincronizzazione ${syncType} per utente ${tecnicoId}.`);

        try {
            await processSyncQueue(); // --- RIPRISTINATO ---
            console.log("SYNC ACTION (Upload): Coda locale processata.");
            console.log("SYNC ACTION (Download): Avvio download Anagrafiche...");
            await syncAllAnagrafiche();
            console.log("SYNC ACTION (Download): Anagrafiche aggiornate.");
            console.log("SYNC ACTION (Download): Avvio download Rapportini Utente...");
            await syncUserRapportini(tecnicoId);
            console.log("SYNC ACTION (Download): Rapportini Utente aggiornati.");
            
            if (syncType === 'Manuale') {
                showSnackbar('Sincronizzazione completata! I tuoi dati sono allineati.', 'success');
            }
            console.log(`SYNC ACTION: Completata con successo (${syncType}).`);

        } catch (error) {
            console.error(`Errore critico durante la sincronizzazione ${syncType}.`, error);
            if (syncType === 'Manuale') showSnackbar("Errore durante la sincronizzazione.", "error");

        } finally {
            isSyncing.current = false;
        }
    }, [showSnackbar, isOnline]);

    useEffect(() => {
        const tecnicoId = tecnicoIdRef.current;
        if (isOnline && tecnicoId && !hasInitialSyncBeenTriggered()) {
            markInitialSyncAsTriggered();
            console.log("TRIGGER: Avvio sincronizzazione iniziale.");
            runFullSync('Iniziale');
        }
    }, [isOnline, runFullSync]);

    const requestManualSync = useCallback(() => {
        if (!isOnline) {
            showSnackbar('Sei offline. Le modifiche verranno sincronizzate appena tornerai online.', 'warning');
            return;
        }
        runFullSync('Manuale');
    }, [isOnline, runFullSync]);

    // --- RIPRISTINATO --- La query live originale che legge dalla syncQueue.
    const pendingSyncItems = useLiveQuery(() => db.syncQueue.where('syncStatus').equals('pending').count(), []);

    return { requestManualSync, isSyncing: isSyncing.current, pendingSyncItems, error: null };
};