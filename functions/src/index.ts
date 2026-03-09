import * as admin from "firebase-admin";
import * as functions from "firebase-functions";

admin.initializeApp();

const db = admin.firestore();

/**
 * Cloud Function that handles sending push notifications via FCM.
 * It is triggered on the creation of a new document in the 'notificheRichieste' collection.
 * It resolves category IDs and user IDs into FCM tokens for targeted delivery.
 */
export const sendPushNotifications = functions.region('europe-west1').firestore
    .document('notificheRichieste/{notificaId}')
    .onCreate(async (snapshot, context) => {
        const data = snapshot.data();
        if (!data) {
            functions.logger.error("No data found in the trigger document.", { notificaId: context.params.notificaId });
            return null;
        }

        const { title, body, to_ids = [], to_categories = [] } = data;

        if (!title || !body) {
            functions.logger.warn("Notification is missing title or body.", { notificaId: context.params.notificaId });
            await snapshot.ref.update({ status: 'error', error: 'Missing title or body' });
            return null;
        }

        const tokens: Set<string> = new Set();
        
        functions.logger.info(`Processing notification request ${context.params.notificaId}`, { title, to_ids, to_categories });

        try {
            // 1. Get tokens from direct user IDs
            if (to_ids.length > 0) {
                const userTokensPromises = to_ids.map(async (uid: string) => {
                    try {
                        const userDoc = await db.collection('tecnici').doc(uid).get();
                        const userData = userDoc.data();
                        if (userData && userData.fcmToken) {
                            return userData.fcmToken;
                        }
                        functions.logger.warn(`No FCM token found for user ID: ${uid}`);
                        return null;
                    } catch (error) {
                        functions.logger.error(`Error fetching user document for ID: ${uid}`, error);
                        return null;
                    }
                });
                const resolvedUserTokens = await Promise.all(userTokensPromises);
                resolvedUserTokens.forEach((token: string | null) => token && tokens.add(token));
            }

            // 2. Get tokens from category IDs
            if (to_categories.length > 0) {
                const categoryTokensPromises = to_categories.map(async (categoryId: string) => {
                    try {
                        // CORREZIONE ASSOLUTA: Utilizzo del campo 'categoriaId' corretto, come scoperto da ispezione Firestore.
                        const querySnapshot = await db.collection('tecnici').where('categoriaId', '==', categoryId).get();
                        if (querySnapshot.empty) {
                            functions.logger.info(`No technicians found for category ID: ${categoryId}`);
                            return [];
                        }
                        const categoryTokens = querySnapshot.docs
                            .map(doc => doc.data().fcmToken)
                            .filter((token): token is string => !!token);
                        return categoryTokens;
                    } catch (error) {
                        functions.logger.error(`Error querying technicians for category ID: ${categoryId}`, error);
                        return [];
                    }
                });
                const resolvedCategoryTokensArrays = await Promise.all(categoryTokensPromises);
                resolvedCategoryTokensArrays.forEach(arr => arr.forEach((token: string) => tokens.add(token)));
            }

            const uniqueTokens = Array.from(tokens);

            if (uniqueTokens.length === 0) {
                functions.logger.warn("No valid FCM tokens found for the specified recipients.", { notificaId: context.params.notificaId });
                await snapshot.ref.update({ status: 'completed_no_tokens' });
                return null;
            }

            // 3. Send multicast message
            const message = {
                notification: { title, body },
                tokens: uniqueTokens,
            };

            functions.logger.info(`Sending notification to ${uniqueTokens.length} tokens.`, { notificaId: context.params.notificaId });

            const response = await admin.messaging().sendEachForMulticast(message);

            functions.logger.info(`FCM multicast response: ${response.successCount} successful, ${response.failureCount} failed.`, { notificaId: context.params.notificaId });

            if (response.failureCount > 0) {
                const failedTokens: string[] = [];
                response.responses.forEach((resp, idx) => {
                    if (!resp.success) {
                        failedTokens.push(uniqueTokens[idx]);
                    }
                });
                functions.logger.error("Failed to send to some tokens.", { failedTokens });
            }
            
            await snapshot.ref.update({ status: 'completed', sentAt: admin.firestore.FieldValue.serverTimestamp() });

        } catch (error) {
            functions.logger.error("An unexpected error occurred while sending notifications:", error, { notificaId: context.params.notificaId });
            await snapshot.ref.update({ status: 'error', error: (error as Error).message });
        }

        return null;
    });


/**
 * Cloud Function schedulata per controllare le assenze ingiustificate dei tecnici.
 * Si attiva ogni giorno feriale (lunedì-venerdì) alle 9:00.
 */
export const checkAbsences = functions.region('europe-west1').pubsub
    .schedule('every mon,tue,wed,thu,fri 09:00')
    .timeZone('Europe/Rome')
    .onRun(async () => {
        functions.logger.info("Esecuzione controllo assenze ingiustificate.");

        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);

        if (today.getDay() === 1) { 
            functions.logger.info("Oggi è lunedì, il controllo per domenica viene saltato.");
            return null;
        }
        if (today.getDay() === 6 || today.getDay() === 0) {
            functions.logger.info("Il controllo non viene eseguito nel weekend.");
            return null;
        }

        const yesterdayString = yesterday.toISOString().split('T')[0];

        try {
            const tecniciSnapshot = await db.collection('tecnici').where('attivo', '==', true).get();
            if (tecniciSnapshot.empty) {
                functions.logger.info("Nessun tecnico attivo trovato.");
                return null;
            }

            const promises = tecniciSnapshot.docs.map(async (tecnicoDoc) => {
                const tecnico = tecnicoDoc.data();
                const tecnicoId = tecnicoDoc.id;

                const rapportinoId = `${yesterdayString}_${tecnicoId}`;
                const rapportinoRef = db.collection('rapportini').doc(rapportinoId);
                const rapportinoDoc = await rapportinoRef.get();

                if (!rapportinoDoc.exists) {
                    functions.logger.warn(`Assenza ingiustificata per ${tecnico.nome} ${tecnico.cognome} (ID: ${tecnicoId}) per il giorno ${yesterdayString}.`);

                    const notification = {
                        title: "Assenza Ingiustificata Rilevata",
                        body: `Il tecnico ${tecnico.nome} ${tecnico.cognome} non ha compilato il rapportino per il giorno ${yesterdayString}.`,
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        to_categories: ['admin'],
                        readBy: {}
                    };

                    await db.collection('notifiche').add(notification);
                }
            });

            await Promise.all(promises);
            functions.logger.info("Controllo assenze completato.");

        } catch (error) {
            functions.logger.error("Errore durante il controllo delle assenze:", error);
        }

        return null;
    });
