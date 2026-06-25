import { db } from '@/db/local-db';
import { Notifica } from '@/models/definitions';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db as firestore } from '@/firebase';
import { getTecnico } from './user-service'; // CORREZIONE: Importazione dal nuovo servizio corretto

const NOTIFICHE_SYNC_STATE_ID = 'notifiche';

/**
 * Sincronizza le notifiche dal server al database locale.
 * 
 * @returns true se la sincronizzazione ha avuto successo, false altrimenti.
 */
export const syncNotifiche = async (): Promise<boolean> => {
    console.log("Inizio sincronizzazione notifiche...");
    // La funzione getTecnico ora è indipendente da React e può essere usata qui
    const tecnico = await getTecnico(); 
    if (!tecnico || !tecnico.tecnicoId) { // Controlla tecnicoId invece di id
        console.error("ID Tecnico non disponibile. Impossibile sincronizzare le notifiche.");
        return false;
    }

    try {
        const lastSyncState = await db.syncState.get(NOTIFICHE_SYNC_STATE_ID);
        const lastSyncTimestamp = lastSyncState ? lastSyncState.timestamp : new Date(0);

        console.log(`Ultima sincronizzazione notifiche: ${lastSyncTimestamp.toISOString()}`);

        const q = query(
            collection(firestore, "notifiche"),
            where("tecnicoId", "==", tecnico.tecnicoId), // Usa tecnico.tecnicoId
            where("createdAt", ">", Timestamp.fromDate(lastSyncTimestamp))
        );

        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.log("Nessuna nuova notifica da sincronizzare.");
            await db.syncState.put({ id: NOTIFICHE_SYNC_STATE_ID, timestamp: new Date() });
            return true;
        }

        const nuoveNotifiche = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                title: data.title,
                body: data.body,
                createdAt: (data.createdAt as Timestamp).toDate(),
                isRead: false,
                tecnicoId: data.tecnicoId,
                link: data.link
            } as Notifica;
        });

        await db.transaction('rw', db.notifiche, db.syncState, async () => {
            await db.notifiche.bulkPut(nuoveNotifiche);
            await db.syncState.put({ id: NOTIFICHE_SYNC_STATE_ID, timestamp: new Date() });
        });

        console.log(`${nuoveNotifiche.length} nuove notifiche sincronizzate.`);
        return true;

    } catch (error) {
        console.error("Errore durante la sincronizzazione delle notifiche:", error);
        return false;
    }
};

/**
 * Recupera tutte le notifiche dal database locale, ordinate dalla più recente.
 * @returns Un array di notifiche.
 */
export const getNotificheLocali = async (): Promise<Notifica[]> => {
    return db.notifiche.orderBy('createdAt').reverse().toArray();
};

/**
 * Marca una notifica specifica come letta nel database locale.
 * @param id L'ID della notifica da marcare come letta.
 */
export const marcaNotificaComeLetta = async (id: string): Promise<void> => {
    await db.notifiche.update(id, { isRead: true });
    console.log(`Notifica ${id} marcata come letta.`);
};

/**
 * Conta le notifiche non lette nel database locale.
 * @returns Il numero di notifiche non lette.
 */
export const countNotificheNonLette = async (): Promise<number> => {
    return db.notifiche.where('isRead').equals(0).count();
};
