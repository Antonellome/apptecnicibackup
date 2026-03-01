import * as admin from "firebase-admin";
import * as functions from "firebase-functions";

admin.initializeApp();

const db = admin.firestore();

/**
 * Cloud Function schedulata per controllare le assenze ingiustificate dei tecnici.
 * Si attiva ogni giorno feriale (lunedì-venerdì) alle 9:00.
 * Controlla se per ogni tecnico è stato compilato il rapportino del giorno lavorativo precedente.
 * Se un rapportino manca, crea una notifica per gli amministratori.
 */
export const checkAbsences = functions.region('europe-west1').pubsub
    .schedule('every mon,tue,wed,thu,fri 09:00')
    .timeZone('Europe/Rome')
    .onRun(async (context) => {
        functions.logger.info("Esecuzione controllo assenze ingiustificate.", { structuredData: true });

        // Calcola la data del giorno lavorativo precedente
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);

        // Salta il controllo se oggi è lunedì (il giorno prima era domenica)
        if (today.getDay() === 1) { 
            functions.logger.info("Oggi è lunedì, il controllo per domenica viene saltato.");
            return null;
        }
        // Salta il controllo se oggi è sabato o domenica
        if (today.getDay() === 6 || today.getDay() === 0) {
            functions.logger.info("Il controllo non viene eseguito nel weekend.");
            return null;
        }

        const yesterdayString = yesterday.toISOString().split('T')[0]; // Formato YYYY-MM-DD

        try {
            // 1. Recupera tutti i tecnici attivi
            const tecniciSnapshot = await db.collection('tecnici').where('attivo', '==', true).get();
            if (tecniciSnapshot.empty) {
                functions.logger.info("Nessun tecnico attivo trovato. Termino la funzione.");
                return null;
            }

            const promises = tecniciSnapshot.docs.map(async (tecnicoDoc) => {
                const tecnico = tecnicoDoc.data();
                const tecnicoId = tecnicoDoc.id;

                // 2. Controlla se esiste un rapportino per il giorno precedente
                const rapportinoId = `${yesterdayString}_${tecnicoId}`;
                const rapportinoRef = db.collection('rapportini').doc(rapportinoId);
                const rapportinoDoc = await rapportinoRef.get();

                // 3. Se il rapportino non esiste, crea la notifica
                if (!rapportinoDoc.exists) {
                    functions.logger.warn(`Assenza ingiustificata per ${tecnico.nome} ${tecnico.cognome} (ID: ${tecnicoId}) per il giorno ${yesterdayString}.`);

                    const notification = {
                        title: "Assenza Ingiustificata Rilevata",
                        body: `Il tecnico ${tecnico.nome} ${tecnico.cognome} non ha compilato il rapportino per il giorno ${yesterdayString}.`,
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        to_categories: ['admin'], // Invia a tutti gli admin
                        readBy: {}
                    };

                    await db.collection('notifiche').add(notification);
                }
            });

            await Promise.all(promises);
            functions.logger.info("Controllo assenze completato con successo.");

        } catch (error) {
            functions.logger.error("Errore durante il controllo delle assenze:", error);
        }

        return null;
    });
