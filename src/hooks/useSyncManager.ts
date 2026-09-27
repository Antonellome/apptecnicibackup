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
    const { userProfile } = useAuth();
    // Lo stato di sincronizzazione è vero solo se la sincronizzazione iniziale NON è ancora avvenuta.
    const [isSyncing, setIsSyncing] = useState(() => !hasInitialSyncBeenTriggered());
    const isOnline = useOnlineStatus();
    const hasBeenOfflineRef = useRef(false);

    // Usiamo una ref per avere sempre l'ID più aggiornato nelle callback senza causare re-render
    const tecnicoIdRef = useRef(userProfile?.tecnicoId);
    useEffect(() => {
        tecnicoIdRef.current = userProfile?.tecnicoId;
    }, [userProfile?.tecnicoId]);

    // Sincronizza la coda di upload (operazioni offline)
    const triggerQueueSync = useCallback(async (isComingBackOnline = false) => {
        if (!isOnline) {
            console.log("[Sync] Trigger per la coda ignorato: offline.");
            return;
        }
        try {
            await processSyncQueue();
            if (isComingBackOnline) {
                showSnackbar('Bentornato online! Le tue modifiche sono state sincronizzate.', 'success');
            }
            console.log("[Sync] Coda di upload processata con successo.");
        } catch (error) {
            console.error('[Sync] Errore durante il processamento della coda:', error);
            showSnackbar('Errore nel sincronizzare le ultime modifiche.', 'error');
        }
    }, [isOnline, showSnackbar]);

    // Esegue una sincronizzazione completa (upload + download)
    const runFullSync = useCallback(async (syncType: 'Iniziale' | 'Manuale') => {
        // Per le richieste manuali, impedisce doppie sincronizzazioni.
        // Per quella iniziale, questo controllo viene bypassato.
        if (syncType === 'Manuale' && isSyncing) {
            showSnackbar("Sincronizzazione già in corso.", "info");
            return;
        }

        const tecnicoId = tecnicoIdRef.current;
        if (!tecnicoId) {
             console.error("[Sync] Sincronizzazione abortita: ID Tecnico non disponibile.");
             // Se è l'iniziale, dobbiamo sbloccare l'UI per evitare caricamenti infiniti
             if (syncType === 'Iniziale') setIsSyncing(false);
             return;
        }

        setIsSyncing(true);
        console.log(`[Sync] Avvio sincronizzazione ${syncType} per utente ${tecnicoId}.`);

        try {
            await processSyncQueue();
            await syncAllAnagrafiche();
            await syncUserRapportini(tecnicoId);
            
            if (syncType === 'Manuale') {
                showSnackbar('Sincronizzazione completata!', 'success');
            }
            console.log(`[Sync] Sincronizzazione ${syncType} completata con successo.`);

        } catch (error) {
            console.error(`[Sync] Errore critico durante la sincronizzazione ${syncType}.`, error);
            if (syncType === 'Manuale') showSnackbar("Errore durante la sincronizzazione.", "error");

        } finally {
            // Fondamentale: sblocca l'UI solo alla fine di tutto il processo.
            setIsSyncing(false);
        }
    }, [showSnackbar, isOnline, isSyncing]); // Aggiunto isSyncing per avere sempre il valore corretto

    // Effetto per la SINCRONIZZAZIONE INIZIALE
    useEffect(() => {
        // La sincronizzazione iniziale parte solo se:
        // 1. Siamo online
        // 2. Il profilo utente è stato caricato (abbiamo un tecnicoId)
        // 3. Non è mai stata avviata prima in questa sessione
        if (isOnline && userProfile?.tecnicoId && !hasInitialSyncBeenTriggered()) {
            console.log("[Sync] Trigger: Avvio sincronizzazione iniziale.");
            markInitialSyncAsTriggered();
            runFullSync('Iniziale');
        }
    }, [isOnline, userProfile, runFullSync]);

    // Effetto per il RIENTRO ONLINE
    useEffect(() => {
        if (!isOnline) {
            hasBeenOfflineRef.current = true;
            return;
        }
        if (isOnline && hasBeenOfflineRef.current) {
            console.log("[Sync] Trigger: Rientro online, avvio sincronizzazione della coda.");
            triggerQueueSync(true);
            hasBeenOfflineRef.current = false;
        }
    }, [isOnline, triggerQueueSync]);

    const requestManualSync = useCallback(() => {
        if (!isOnline) {
            showSnackbar('Sei offline. Le modifiche verranno sincronizzate appena tornerai online.', 'warning');
            return;
        }
        runFullSync('Manuale');
    }, [isOnline, runFullSync]);

    const pendingSyncItems = useLiveQuery(() => db.syncQueue.where('syncStatus').equals('pending').count(), []);

    return { requestManualSync, triggerQueueSync, isSyncing, pendingSyncItems, error: null };
};
