import { atom } from 'jotai';

export interface SyncState {
    status: 'idle' | 'syncing-anagrafiche' | 'syncing-queue' | 'offline' | 'error';
    message: string | null;
    lastFullSync: Date | null;
    lastQueueSync: Date | null;
}

export const syncStateAtom = atom<SyncState>({
    status: 'idle',
    message: null,
    lastFullSync: null,
    lastQueueSync: null,
});
