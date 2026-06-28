import { db } from '@/db/local-db';
import { Notifica } from '@/models/definitions';
import { collection, getDocs, query, where, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { db as firestore } from '@/firebase';
import { getTecnico } from './user-service';

const NOTIFICHE_SYNC_STATE_ID = 'notifiche';

export const syncNotifiche = async (): Promise<boolean> => {
    const tecnico = await getTecnico();
    if (!tecnico || !tecnico.tecnicoId) {
        console.error("ID Tecnico non disponibile. Impossibile sincronizzare le notifiche.");
        return false;
    }
    try {
        const lastSyncState = await db.syncState.get(NOTIFICHE_SYNC_STATE_ID);
        const lastSyncTimestamp = lastSyncState ? lastSyncState.timestamp : new Date(0);
        const q = query(
            collection(firestore, "notifiche"),
            where("tecnicoId", "==", tecnico.tecnicoId),
            where("createdAt", ">", Timestamp.fromDate(lastSyncTimestamp))
        );
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
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
                isRead: !!data.isRead, 
                tecnicoId: data.tecnicoId,
                link: data.link
            } as Notifica;
        });

        await db.transaction('rw', db.notifiche, db.syncState, async () => {
            await db.notifiche.bulkPut(nuoveNotifiche);
            await db.syncState.put({ id: NOTIFICHE_SYNC_STATE_ID, timestamp: new Date() });
        });
        return true;
    } catch (error) {
        console.error("Errore durante la sincronizzazione delle notifiche:", error);
        return false;
    }
};

export const marcaNotificaComeLetta = async (id: string): Promise<void> => {
    await db.notifiche.update(id, { isRead: true });
    console.log(`Notifica locale ${id} marcata come letta.`);

    try {
        const notificaRef = doc(firestore, 'notifiche', id);
        await updateDoc(notificaRef, {
            isRead: true
        });
        console.log(`Stato di lettura per notifica ${id} sincronizzato con Firestore. CAMPO: isRead=true`);
    } catch (error) {
        console.error(`Errore durante la sincronizzazione dello stato di lettura per ${id}:`, error);
    }
};

export const eliminaNotifica = async (id: string): Promise<void> => {
    await db.notifiche.delete(id);
    console.log(`Notifica ${id} eliminata localmente.`);
};

export const countNotificheNonLette = async (): Promise<number> => {
    return db.notifiche.where('isRead').equals(0).count();
};

export const getNotificheLocali = async (): Promise<Notifica[]> => {
    return db.notifiche.orderBy('createdAt').reverse().toArray();
};
