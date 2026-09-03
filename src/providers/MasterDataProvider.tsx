import React, { useEffect } from 'react';
import { collection, getDocs, doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { db as firestoreDb } from '@/utils/firebase';
import type { MasterData, SyncManifest } from '@/models/definitions';
import { db } from '@/db/local-db';
import { useAuth } from '../hooks/useAuth';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

const ANAGRAFICA_COLLECTIONS: (keyof Omit<MasterData, 'impostazioni'>)[] = [
    'tecnici', 'tipiGiornata', 'veicoli', 'navi', 'luoghi', 'clienti', 'sedi', 'ditte', 'categorie', 'lavorazioni', 'sistemi'
];

// Funzione helper per scaricare una collezione da Firestore e salvarla in Dexie
async function fetchAndCacheCollection(collectionName: keyof Omit<MasterData, 'impostazioni'>) {
    console.log(`SYNC_ANAGRAFICHE_SERVICE: Sostituzione completa per la collezione '${collectionName}'.`);
    const querySnapshot = await getDocs(collection(firestoreDb, collectionName));
    const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    await db.anagrafiche.put({ id: collectionName, data, timestamp: new Date() });
}

// Funzione helper per gestire i formati dei timestamp
function rehydrateTimestamp(ts: any): Timestamp | undefined {
    if (!ts) return undefined;
    if (ts instanceof Timestamp) return ts;
    if (typeof ts === 'object' && typeof ts.seconds === 'number') {
        return new Timestamp(ts.seconds, ts.nanoseconds);
    }
    return undefined;
}

/**
 * Questo componente è un "servizio fantasma". Non renderizza nulla.
 * Il suo unico scopo è ascoltare le modifiche al `sync_manifest` in Firestore
 * e aggiornare silenziosamente le anagrafiche nel database locale (Dexie).
 * Non gestisce lo stato globale, non causa re-render e non interferisce con l'UI.
 */
export const MasterDataProvider: React.FC = () => {
    const { user } = useAuth();
    const isOnline = useOnlineStatus();

    useEffect(() => {
        if (!isOnline || !user) return;

        console.log("SYNC_ANAGRAFICHE_SERVICE: Inizializzazione listener per sync basato su manifest...");
        const manifestRef = doc(firestoreDb, 'versioning', 'sync_manifest');
        
        const unsubscribe = onSnapshot(manifestRef, async (snapshot) => {
            if (!snapshot.exists()) { 
                console.warn("SYNC_ANAGRAFICHE_SERVICE: Documento manifest non trovato."); 
                return; 
            }
            
            const remoteManifest = snapshot.data() as SyncManifest;
            const localManifestSync = await db.sync_manifest.get('main');
            const localManifest = localManifestSync?.data || {};

            const collectionsToUpdate = ANAGRAFICA_COLLECTIONS.filter(key => {
                const remoteTimestamp = rehydrateTimestamp(remoteManifest[key]);
                const localTimestamp = rehydrateTimestamp(localManifest[key]);
                return remoteTimestamp && (!localTimestamp || remoteTimestamp.toMillis() > localTimestamp.toMillis());
            });

            if (collectionsToUpdate.length > 0) {
                console.log(`SYNC_ANAGRAFICHE_SERVICE: Rilevate modifiche per: ${collectionsToUpdate.join(', ')}. Avvio aggiornamento silenzioso...`);
                try {
                    await Promise.all(collectionsToUpdate.map(collectionName => fetchAndCacheCollection(collectionName as any)));

                    const newLocalManifest = { ...localManifest };
                    collectionsToUpdate.forEach(key => { newLocalManifest[key] = remoteManifest[key]; });
                    await db.sync_manifest.put({ id: 'main', data: newLocalManifest });
                    
                    console.log("SYNC_ANAGRAFICHE_SERVICE: Cache locale aggiornata con successo.");

                } catch (syncError) {
                    console.error("SYNC_ANAGRAFICHE_SERVICE: Errore durante l'aggiornamento.", syncError);
                }
            } else {
                 console.log("SYNC_ANAGRAFICHE_SERVICE: Nessuna modifica rilevata nel manifest.");
            }
        }, (error) => {
            console.error("SYNC_ANAGRAFICHE_SERVICE: Errore critico nel listener del manifest.", error);
        });

        return () => {
            console.log("SYNC_ANAGRAFICHE_SERVICE: Pulizia listener.");
            unsubscribe();
        };
    }, [isOnline, user]);

    // Questo componente non renderizza nulla.
    return null;
};
