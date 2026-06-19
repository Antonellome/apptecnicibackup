import { createContext, useContext } from 'react';

// --- TIPI E INTERFACCE ---
export interface SyncManifest {
  [collectionName: string]: number;
}

export interface SyncCollectionStatus {
  isSyncing: boolean;
  needsUpdate: boolean;
  lastChecked: number | null;
}

export interface SyncStatus {
  [collectionName: string]: SyncCollectionStatus;
}

export interface SyncContextType {
  syncStatus: SyncStatus;
  manifest: SyncManifest;
  checkForUpdates: (collectionName: string) => Promise<void>;
  updateLocalSyncTimestamp: (collectionName: string, version: number) => void;
}

export const SyncContext = createContext<SyncContextType | undefined>(undefined);

// --- CUSTOM HOOK ---
export const useSync = () => {
  const context = useContext(SyncContext);
  if (context === undefined) {
    throw new Error('useSync deve essere utilizzato all\'interno di un SyncProvider');
  }
  return context;
};
