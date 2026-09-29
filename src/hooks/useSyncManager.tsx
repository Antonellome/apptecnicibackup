import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { syncAllAnagrafiche, syncUserRapportini, processSyncQueue } from '@/services/offlineSync';
import { useAtom } from 'jotai';
import { syncStateAtom } from '@/state/syncState';

let initialSyncTriggered = false;

export const useSyncManager = () => {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncState, setSyncState] = useAtom(syncStateAtom);

  const handleOnline = () => setIsOnline(true);
  const handleOffline = () => setIsOnline(false);

  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const triggerFullSync = useCallback(async () => {
    if (!user?.uid || syncState.status === 'syncing-anagrafiche') return;

    console.log("[Sync] Avvio Sincronizzazione Completa Manuale...");
    setSyncState({ status: 'syncing-anagrafiche', message: 'Sincronizzazione anagrafiche in corso...', lastFullSync: syncState.lastFullSync, lastQueueSync: syncState.lastQueueSync });
    try {
      await syncAllAnagrafiche();
      await syncUserRapportini(user.uid);
      await processSyncQueue(); // Svuota la coda dopo una sinc completa
      setSyncState(prev => ({ ...prev, status: 'idle', message: 'Sincronizzazione completa terminata.', lastFullSync: new Date() }));
    } catch (error) {
      console.error("Errore Sincronizzazione Completa:", error);
      setSyncState(prev => ({ ...prev, status: 'error', message: `Errore in sinc. completa: ${error.message}` }));
    }
  }, [user, setSyncState, syncState.status]);

  useEffect(() => {
    if (isOnline && user && !initialSyncTriggered) {
      console.log("[Sync] Trigger: Avvio sincronizzazione iniziale (una tantum per sessione).");
      initialSyncTriggered = true; // Previene riesecuzioni nella stessa sessione
      triggerFullSync();
    }
  }, [isOnline, user, triggerFullSync]);

  return { requestManualSync: triggerFullSync, syncState };
};