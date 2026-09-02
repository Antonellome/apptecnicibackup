"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncAllAnagrafiche = exports.getCheckinsUpdates = exports.createCheckin = exports.getAllRapportiniForSync = exports.deleteRapportino = exports.updateRapportino = exports.createRapportino = void 0;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
(0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
// --- FUNZIONI RAPPORTINI (VALIDATE) ---
exports.createRapportino = (0, https_1.onCall)(async (request) => {
    logger.info("Inizio esecuzione: createRapportino", { auth: request.auth?.uid });
    try {
        if (!request.auth)
            throw new https_1.HttpsError("unauthenticated", "Autenticazione richiesta.");
        const uid = request.auth.uid;
        const rapportinoData = request.data;
        rapportinoData.tecnicoScriventeId = uid;
        rapportinoData.createdBy = uid;
        rapportinoData.updatedBy = uid;
        rapportinoData.createdAt = firestore_1.FieldValue.serverTimestamp();
        rapportinoData.updatedAt = firestore_1.FieldValue.serverTimestamp();
        rapportinoData.isDeleted = false;
        const ref = await db.collection("rapportini").add(rapportinoData);
        logger.info(`Rapportino creato con successo: ${ref.id}`);
        return { id: ref.id };
    }
    catch (error) {
        logger.error("Errore in createRapportino:", error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError("internal", "Errore interno durante la creazione del rapportino.", { error });
    }
});
exports.updateRapportino = (0, https_1.onCall)(async (request) => {
    logger.info("Inizio esecuzione: updateRapportino", { auth: request.auth?.uid, data: request.data });
    try {
        if (!request.auth)
            throw new https_1.HttpsError("unauthenticated", "Autenticazione richiesta.");
        const uid = request.auth.uid;
        const { id, ...rapportinoData } = request.data;
        if (!id)
            throw new https_1.HttpsError("invalid-argument", "L'ID del rapportino è obbligatorio.");
        const docRef = db.collection("rapportini").doc(id);
        const doc = await docRef.get();
        if (!doc.exists)
            throw new https_1.HttpsError("not-found", "Rapportino non trovato.");
        if (doc.data()?.tecnicoScriventeId !== uid)
            throw new https_1.HttpsError("permission-denied", "Non hai i permessi per modificare questo rapportino.");
        rapportinoData.tecnicoScriventeId = uid;
        rapportinoData.updatedBy = uid;
        rapportinoData.updatedAt = firestore_1.FieldValue.serverTimestamp();
        await docRef.update(rapportinoData);
        logger.info(`Rapportino aggiornato con successo: ${id}`);
        return { id };
    }
    catch (error) {
        logger.error("Errore in updateRapportino:", error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError("internal", "Errore interno durante l'aggiornamento del rapportino.", { error });
    }
});
exports.deleteRapportino = (0, https_1.onCall)(async (request) => {
    logger.info("Inizio esecuzione: deleteRapportino", { auth: request.auth?.uid, data: request.data });
    try {
        if (!request.auth)
            throw new https_1.HttpsError("unauthenticated", "Autenticazione richiesta.");
        const uid = request.auth.uid;
        const { rapportinoId } = request.data;
        const docRef = db.collection("rapportini").doc(rapportinoId);
        const doc = await docRef.get();
        if (!doc.exists)
            throw new https_1.HttpsError("not-found", "Rapportino non trovato.");
        if (doc.data()?.tecnicoScriventeId !== uid)
            throw new https_1.HttpsError("permission-denied", "Non hai i permessi per eliminare questo rapportino.");
        await docRef.update({ isDeleted: true, updatedAt: firestore_1.FieldValue.serverTimestamp(), updatedBy: uid });
        logger.info(`Rapportino eliminato (soft delete) con successo: ${rapportinoId}`);
        return { id: rapportinoId };
    }
    catch (error) {
        logger.error("Errore in deleteRapportino:", error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError("internal", "Errore interno durante l'eliminazione del rapportino.", { error });
    }
});
exports.getAllRapportiniForSync = (0, https_1.onCall)(async (request) => {
    logger.info("Inizio esecuzione: getAllRapportiniForSync", { auth: request.auth?.uid, data: request.data });
    try {
        if (!request.auth)
            throw new https_1.HttpsError("unauthenticated", "Autenticazione richiesta.");
        const { lastSyncTimestamp, tecnicoId } = request.data;
        if (tecnicoId !== request.auth.uid)
            throw new https_1.HttpsError("permission-denied", "ID tecnico non valido.");
        let query = db.collection("rapportini").where("presenze", "array-contains", tecnicoId);
        if (lastSyncTimestamp > 0)
            query = query.where("updatedAt", ">", new Date(lastSyncTimestamp));
        const snapshot = await query.get();
        logger.info(`Trovati ${snapshot.docs.length} rapportini da sincronizzare.`);
        return { data: snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) };
    }
    catch (error) {
        logger.error("Errore in getAllRapportiniForSync:", error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError("internal", "Errore interno durante la sincronizzazione dei rapportini.", { error });
    }
});
// --- FUNZIONI CHECK-IN (VALIDATE) ---
exports.createCheckin = (0, https_1.onCall)(async (request) => {
    logger.info("Inizio esecuzione: createCheckin", { auth: request.auth?.uid, data: request.data });
    try {
        if (!request.auth)
            throw new https_1.HttpsError("unauthenticated", "Autenticazione richiesta.");
        const checkinData = request.data;
        checkinData.tecnicoId = request.auth.uid;
        checkinData.timestampReale = firestore_1.FieldValue.serverTimestamp();
        const ref = await db.collection("checkin_giornalieri").add(checkinData);
        logger.info(`Check-in creato con successo: ${ref.id}`);
        return { id: ref.id };
    }
    catch (error) {
        logger.error("Errore in createCheckin:", error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError("internal", "Errore interno durante la creazione del check-in.", { error });
    }
});
exports.getCheckinsUpdates = (0, https_1.onCall)(async (request) => {
    logger.info("Inizio esecuzione: getCheckinsUpdates", { auth: request.auth?.uid, data: request.data });
    try {
        if (!request.auth)
            throw new https_1.HttpsError("unauthenticated", "Autenticazione richiesta.");
        const { lastSyncTimestamp, tecnicoId } = request.data;
        if (tecnicoId !== request.auth.uid)
            throw new https_1.HttpsError("permission-denied", "ID tecnico non valido.");
        let query = db.collection("checkin_giornalieri").where("tecnicoId", "==", tecnicoId);
        if (lastSyncTimestamp > 0)
            query = query.where("timestampReale", ">", new Date(lastSyncTimestamp));
        const snapshot = await query.get();
        logger.info(`Trovati ${snapshot.docs.length} check-in da sincronizzare.`);
        return { data: snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) };
    }
    catch (error) {
        logger.error("Errore in getCheckinsUpdates:", error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError("internal", "Errore interno durante la sincronizzazione dei check-in.", { error });
    }
});
// --- FUNZIONE ANAGRAFICHE (VALIDATA E CORRETTA) ---
exports.syncAllAnagrafiche = (0, https_1.onCall)(async (request) => {
    logger.info("Inizio esecuzione: syncAllAnagrafiche", { auth: request.auth?.uid });
    try {
        if (!request.auth)
            throw new https_1.HttpsError("unauthenticated", "Autenticazione richiesta.");
        const collections = ["clienti", "navi", "luoghi", "ditte", "categorie", "tipiGiornata", "veicoli", "tecnici"];
        const snapshots = await Promise.all(collections.map(c => db.collection(c).get()));
        const results = {};
        snapshots.forEach((snapshot, index) => {
            const collName = collections[index];
            results[collName] = { data: snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })), timestamp: Date.now() };
        });
        logger.info(`Sincronizzate ${collections.length} collezioni anagrafiche.`);
        return results;
    }
    catch (error) {
        logger.error("Errore in syncAllAnagrafiche:", error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError("internal", "Errore interno durante la sincronizzazione delle anagrafiche.", { error });
    }
});
//# sourceMappingURL=index.js.map