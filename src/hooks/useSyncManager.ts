import { useEffect, useCallback, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/local-db';
import { syncAllAnagrafiche, syncUserRapportini, processSyncQueue } from '@/services/offlineSync';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { useAuth } from './useAuth';
import { useOnlineStatus } from './useOnlineStatus';
import { hasInitialSyncBeenTriggered, markInitialSyncAsTriggered } from '@/services/syncV2/syncState';

export const useSyncManager = () => {
    const { showSnackbar } = useSnackbar();
    const { userProfile } = useAuth();
    const isSyncing = useRef(false);
    const isOnline = useOnlineStatus();

    // Usiamo un ref per l'ID del tecnico per stabilizzare le callback
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
            await processSyncQueue();
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
    }, [showSnackbar, isOnline]); // Rimosso tecnicoId dalle dipendenze, usiamo il ref

    useEffect(() => {
        // Leggiamo il valore corrente dal ref all'interno dell'effetto
        const tecnicoId = tecnicoIdRef.current;
        if (isOnline && tecnicoId && !hasInitialSyncBeenTriggered()) {
            markInitialSyncAsTriggered();
            console.log("TRIGGER: Avvio sincronizzazione iniziale.");
            runFullSync('Iniziale');
        }
    }, [isOnline, runFullSync]); // L'ID del tecnico non è più una dipendenza diretta

    const requestManualSync = useCallback(() => {
        if (!isOnline) {
            showSnackbar('Sei offline. Le modifiche verranno sincronizzate appena tornerai online.', 'warning');
            return;
        }
        runFullSync('Manuale');
    }, [isOnline, runFullSync]);

    const pendingSyncItems = useLiveQuery(() => db.syncQueue.where('syncStatus').equals('pending').count(), []);

    return { requestManualSync, isSyncing: isSyncing.current, pendingSyncItems, error: null };
};