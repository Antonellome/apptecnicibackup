import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase';
import { useAuth } from '@/hooks/useAuth'; // ++ CORREZIONE: L'import era sbagliato, puntava a ./AuthContext

// --- TIPI E INTERFACCE ---
export interface SyncManifest {
  [collectionName: string]: number;
}

export interface SyncCollectionStatus {
  isSyncing: boolean;
  needsUpdate: boolean;
  lastChecked: number | null;
}

interface SyncStatus {
  [collectionName: string]: SyncCollectionStatus;
}

interface SyncContextType {
  syncStatus: SyncStatus;
  manifest: SyncManifest;
  checkForUpdates: (collectionName: string) => Promise<void>;
  updateLocalSyncTimestamp: (collectionName: string, version: number) => void;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

// --- UTILS PER LOCAL STORAGE ---
const LOCAL_STORAGE_KEY = 'app_sync_timestamps';
const loadTimestampsFromStorage = (): Record<string, number> => {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (e) {
    console.error("Failed to parse sync timestamps from localStorage", e);
    return {};
  }
};
const saveTimestampToStorage = (timestamps: Record<string, number>) => {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(timestamps));
};

// --- PROVIDER COMPONENT ---
export const SyncProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({});
  const [manifest, setManifest] = useState<SyncManifest>({});
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const manifestRef = doc(db, 'sync_manifest', user.uid);
    const unsubscribe = onSnapshot(manifestRef, (docSnap) => {
      if (docSnap.exists()) {
        const remoteManifest = docSnap.data() as SyncManifest;
        setManifest(remoteManifest);
        console.log("Ricevuto aggiornamento del manifest remoto: ", remoteManifest);

        const localTimestamps = loadTimestampsFromStorage();
        const newStatus: SyncStatus = {};

        for (const collectionName in remoteManifest) {
          const remoteTimestamp = remoteManifest[collectionName] || 0;
          const localTimestamp = localTimestamps[collectionName] || 0;
          const needsUpdate = remoteTimestamp > localTimestamp;
          if (needsUpdate) {
            console.warn(`AGGIORNAMENTO NECESSARIO per la collezione: ${collectionName}`);
          }
          newStatus[collectionName] = {
            isSyncing: false,
            needsUpdate: needsUpdate,
            lastChecked: Date.now(),
          };
        }
        setSyncStatus(prev => ({ ...prev, ...newStatus }));
      } else {
        console.error(`Il documento sync_manifest/${user.uid} non esiste!`);
      }
    }, (error) => {
      console.error("Errore durante l'ascolto del sync_manifest:", error);
    });

    return () => unsubscribe();
  }, [user]);

  const checkForUpdates = useCallback(async (collectionName: string) => {
    console.log(`Controllo manuale per ${collectionName}...`);
  }, []);

  const updateLocalSyncTimestamp = useCallback((collectionName: string, version: number) => {
    const currentTimestamps = loadTimestampsFromStorage();
    const newTimestamps = { ...currentTimestamps, [collectionName]: version };
    saveTimestampToStorage(newTimestamps);

    setSyncStatus(prevStatus => ({
      ...prevStatus,
      [collectionName]: {
        ...prevStatus[collectionName],
        needsUpdate: false,
      }
    }));
    console.log(`Timestamp locale per ${collectionName} aggiornato alla versione ${version}.`);
  }, []);

  const value = { syncStatus, manifest, checkForUpdates, updateLocalSyncTimestamp };

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
};

// --- CUSTOM HOOK ---
export const useSync = () => {
  const context = useContext(SyncContext);
  if (context === undefined) {
    throw new Error('useSync deve essere utilizzato all\'interno di un SyncProvider');
  }
  return context;
};
