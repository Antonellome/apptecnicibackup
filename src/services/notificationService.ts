
import { writeBatch, collection, doc } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Segna un elenco di notifiche come lette direttamente nel database.
 * Utilizza un batch per garantire che l'operazione sia atomica e per ridurre le scritture.
 * 
 * @param notificaIds - Un array di ID delle notifiche da aggiornare.
 */
export const markNotificheAsRead = async (notificaIds: string[]): Promise<void> => {
    if (notificaIds.length === 0) {
        return;
    }

    const batch = writeBatch(db);
    const notificheCollectionRef = collection(db, 'notifiche');

    notificaIds.forEach(id => {
        const notificaRef = doc(notificheCollectionRef, id);
        batch.update(notificaRef, { letta: true });
    });

    try {
        await batch.commit();
    } catch (error) {
        console.error("Errore durante l'aggiornamento delle notifiche come lette:", error);
        // In un'applicazione reale, qui potresti voler gestire l'errore in modo più specifico,
        // ad esempio mostrando un messaggio all'utente.
        throw new Error("Impossibile segnare le notifiche come lette.");
    }
};
