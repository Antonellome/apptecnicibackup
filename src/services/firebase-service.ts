import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db as firestoreDb } from '@/firebase';
import { db as localDb } from '@/db/local-db';
import { rapportinoConverter } from '@/utils/converters';

/**
 * Sincronizza i rapportini da Firestore al database locale (Dexie).
 * Gestisce aggiunte, modifiche e CANCELLAZIONI (soft delete).
 */
export const syncAnagraficheAndRapportiniFromRemote = async (): Promise<void> => {
    try {
        const auth = getAuth();
        const currentUser = auth.currentUser;

        if (!currentUser) {
            console.error("SYNC_DOWNLOAD: Utente non autenticato. Sincronizzazione interrotta.");
            return;
        }

        console.log('SYNC_DOWNLOAD: Avvio sincronizzazione dati da Firestore.');

        const lastSyncEntry = await localDb.syncState.get('lastSync');
        const lastSyncTimestamp = lastSyncEntry ? lastSyncEntry.timestamp : new Date(0);
        console.log(`SYNC_DOWNLOAD: Ultima sincronizzazione avvenuta il: ${lastSyncTimestamp.toISOString()}`);

        const now = new Date();
        const firestoreTimestamp = Timestamp.fromDate(lastSyncTimestamp);

        const rapportiniRef = collection(firestoreDb, 'rapportini').withConverter(rapportinoConverter);

        // --- GESTIONE AGGIUNTE/MODIFICHE ---
        // Query 1: Rapportini ATTIVI creati dall'utente
        const query1 = query(
            rapportiniRef,
            where('uid', '==', currentUser.uid),
            where('updatedAt', '>', firestoreTimestamp),
            where('isDeleted', '!=', true) // Ignora i cancellati
        );

        // Query 2: Rapportini ATTIVI in cui l'utente è tecnico selezionato
        const query2 = query(
            rapportiniRef,
            where('tecniciSelezionati', 'array-contains', currentUser.uid),
            where('updatedAt', '>', firestoreTimestamp),
            where('isDeleted', '!=', true) // Ignora i cancellati
        );
        
        // --- GESTIONE CANCELLAZIONI ---
        // Query 3: Rapportini CANCELLATI pertinenti per l'utente
        // Nota: Dobbiamo fare due query anche qui perché Firestore non supporta OR logici complessi
        const queryDeleted1 = query(
            rapportiniRef,
            where('uid', '==', currentUser.uid),
            where('isDeleted', '==', true),
            where('updatedAt', '>', firestoreTimestamp)
        );
        const queryDeleted2 = query(
            rapportiniRef,
            where('tecniciSelezionati', 'array-contains', currentUser.uid),
            where('isDeleted', '==', true),
            where('updatedAt', '>', firestoreTimestamp)
        );

        // Esegui tutte le query in parallelo per massima efficienza
        const [snapshot1, snapshot2, deletedSnapshot1, deletedSnapshot2] = await Promise.all([
            getDocs(query1),
            getDocs(query2),
            getDocs(queryDeleted1),
            getDocs(queryDeleted2),
        ]);

        // Unisci i risultati attivi (con de-duplicazione)
        const activeRapportiniMap = new Map();
        snapshot1.docs.forEach(doc => activeRapportiniMap.set(doc.id, doc.data()));
        snapshot2.docs.forEach(doc => activeRapportiniMap.set(doc.id, doc.data()));
        const rapportiniDaSalvare = Array.from(activeRapportiniMap.values());
        
        // Unisci gli ID dei rapportini da cancellare (con de-duplicazione)
        const deletedIdsSet = new Set<string>();
        deletedSnapshot1.docs.forEach(doc => deletedIdsSet.add(doc.id));
        deletedSnapshot2.docs.forEach(doc => deletedIdsSet.add(doc.id));
        const rapportiniDaCancellare = Array.from(deletedIdsSet);

        // --- APPLICA LE MODIFICHE AL DATABASE LOCALE ---
        let hasChanges = false;

        if (rapportiniDaCancellare.length > 0) {
            console.log(`SYNC_DOWNLOAD: Trovati ${rapportiniDaCancellare.length} rapportini da CANCELLARE.`);
            await localDb.rapportini.bulkDelete(rapportiniDaCancellare);
            console.log('SYNC_DOWNLOAD: Rapportini cancellati dal database locale.');
            hasChanges = true;
        }

        if (rapportiniDaSalvare.length > 0) {
            console.log(`SYNC_DOWNLOAD: Trovati ${rapportiniDaSalvare.length} rapportini da AGGIUNGERE/MODIFICARE.`);
            await localDb.rapportini.bulkPut(rapportiniDaSalvare);
            console.log('SYNC_DOWNLOAD: Rapportini salvati nel database locale.');
            hasChanges = true;
        }

        if (hasChanges) {
             // Aggiorna il timestamp di sincronizzazione SOLO se ci sono state modifiche
            await localDb.syncState.put({ id: 'lastSync', timestamp: now });
            console.log(`SYNC_DOWNLOAD: Timestamp di sincronizzazione aggiornato a: ${now.toISOString()}`);
        } else {
            console.log('SYNC_DOWNLOAD: Nessuna modifica da sincronizzare.');
        }

    } catch (error) {
        console.error("SYNC_DOWNLOAD: Errore grave durante la sincronizzazione da Firestore:", error);
    }
};
