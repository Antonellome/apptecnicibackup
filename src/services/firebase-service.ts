import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db as firestoreDb } from '@/firebase';
import { db as localDb } from '@/db/local-db';
import { rapportinoConverter } from '@/utils/converters';

/**
 * Sincronizza i rapportini e le anagrafiche da Firestore al database locale (Dexie).
 * Scarica solo i dati modificati dopo l'ultimo timestamp di sincronizzazione.
 */
export const syncAnagraficheAndRapportiniFromRemote = async (): Promise<void> => {
    try {
        console.log('SYNC_DOWNLOAD: Avvio sincronizzazione dati da Firestore.');

        const lastSyncEntry = await localDb.syncState.get('lastSync');
        const lastSyncTimestamp = lastSyncEntry ? lastSyncEntry.timestamp : new Date(0);
        console.log(`SYNC_DOWNLOAD: Ultima sincronizzazione avvenuta il: ${lastSyncTimestamp.toISOString()}`);

        const now = new Date();

        const rapportiniRef = collection(firestoreDb, 'rapportini').withConverter(rapportinoConverter);
        const rapportiniQuery = query(
            rapportiniRef,
            where('updatedAt', '>', Timestamp.fromDate(lastSyncTimestamp))
        );

        const rapportiniSnapshot = await getDocs(rapportiniQuery);
        const rapportiniRemoti = rapportiniSnapshot.docs.map(doc => doc.data());

        if (rapportiniRemoti.length > 0) {
            console.log(`SYNC_DOWNLOAD: Scaricati ${rapportiniRemoti.length} rapportini aggiornati.`);
            await localDb.rapportini.bulkPut(rapportiniRemoti);
            console.log('SYNC_DOWNLOAD: Rapportini salvati nel database locale.');
            
            // **CORREZIONE CRITICA:** Aggiorna il timestamp SOLO se il download ha avuto successo.
            await localDb.syncState.put({ id: 'lastSync', timestamp: now });
            console.log(`SYNC_DOWNLOAD: Timestamp di sincronizzazione aggiornato a: ${now.toISOString()}`);
        } else {
            console.log('SYNC_DOWNLOAD: Nessun nuovo rapportino da scaricare.');
            // Non aggiornare il timestamp se non c'è nulla di nuovo, 
            // ma considera la sincronizzazione riuscita se non ci sono errori.
        }

    } catch (error) {
        console.error("SYNC_DOWNLOAD: Errore durante la sincronizzazione da Firestore:", error);
    }
};
