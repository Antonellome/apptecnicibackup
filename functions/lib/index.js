"use strict";
// CIAO. QUESTA È LA VERSIONE RIFATTORIZZATA E STABILIZZATA CON TRANSAZIONI.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markNotificationAsRead = exports.checkInTrigger = exports.rapportiniTrigger = exports.generateMonthlySummary = exports.getMasterData = void 0;
const v2_1 = require("firebase-functions/v2");
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = __importStar(require("firebase-admin"));
const date_fns_1 = require("date-fns");
admin.initializeApp();
const db = admin.firestore();
(0, v2_1.setGlobalOptions)({ region: "europe-west1" });
// La funzione getMasterData rimane invariata
exports.getMasterData = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "L'utente deve essere autenticato.");
    }
    v2_1.logger.info(`Inizio recupero dati master per l'utente: ${request.auth.uid}`);
    try {
        const [clientiSnap, naviSnap, luoghiSnap, categorieSnap, ditteSnap, tecniciSnap, tipiGiornataSnap, veicoliSnap] = await Promise.all([
            db.collection("clienti").get(), db.collection("navi").get(), db.collection("luoghi").get(),
            db.collection("categorie").get(), db.collection("ditte").get(), db.collection("tecnici").get(),
            db.collection("tipiGiornata").get(), db.collection("veicoli").get(),
        ]);
        const masterData = {
            clienti: clientiSnap.docs.map((doc) => (Object.assign({ id: doc.id }, doc.data()))),
            navi: naviSnap.docs.map((doc) => (Object.assign({ id: doc.id }, doc.data()))),
            luoghi: luoghiSnap.docs.map((doc) => (Object.assign({ id: doc.id }, doc.data()))),
            categorie: categorieSnap.docs.map((doc) => (Object.assign({ id: doc.id }, doc.data()))),
            ditte: ditteSnap.docs.map((doc) => (Object.assign({ id: doc.id }, doc.data()))),
            tecnici: tecniciSnap.docs.map((doc) => (Object.assign({ id: doc.id }, doc.data()))),
            tipiGiornata: tipiGiornataSnap.docs.map((doc) => (Object.assign({ id: doc.id }, doc.data()))),
            veicoli: veicoliSnap.docs.map((doc) => (Object.assign({ id: doc.id }, doc.data()))),
        };
        v2_1.logger.info("Recupero dati master completato.");
        return masterData;
    }
    catch (error) {
        v2_1.logger.error("Errore recupero dati master:", error);
        throw new https_1.HttpsError("internal", "Impossibile recuperare i dati master.");
    }
});
// La funzione generateMonthlySummary rimane invariata
exports.generateMonthlySummary = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "L'utente deve essere autenticato per generare un riepilogo.");
    }
    const { year, month } = request.data;
    if (typeof year !== 'number' || typeof month !== 'number') {
        throw new https_1.HttpsError("invalid-argument", "I parametri 'year' e 'month' devono essere numeri.");
    }
    const tecnicoId = request.auth.uid;
    v2_1.logger.info(`Richiesta di generazione riepilogo per tecnico: ${tecnicoId}, Mese: ${month + 1}/${year}`);
    try {
        await recalculateAndSaveSummary(tecnicoId, year, month);
        v2_1.logger.info(`Riepilogo generato con successo per tecnico: ${tecnicoId}`);
        return { success: true, message: "Riepilogo generato e salvato correttamente." };
    }
    catch (error) {
        v2_1.logger.error(`Errore durante la generazione del riepilogo per ${tecnicoId}:`, error);
        throw new https_1.HttpsError("internal", "Si è verificato un errore interno durante la generazione del riepilogo.");
    }
});
// Il trigger rapportiniTrigger rimane invariato
exports.rapportiniTrigger = (0, firestore_1.onDocumentWritten)("rapportini/{rapportinoId}", async (event) => {
    var _a, _b, _c, _d;
    v2_1.logger.info(`Trigger attivato per rapportino: ${event.params.rapportinoId}`);
    const monthsToRecalculate = new Set();
    const beforeData = (_b = (_a = event.data) === null || _a === void 0 ? void 0 : _a.before) === null || _b === void 0 ? void 0 : _b.data();
    const afterData = (_d = (_c = event.data) === null || _c === void 0 ? void 0 : _c.after) === null || _d === void 0 ? void 0 : _d.data();
    if (beforeData) {
        const date = beforeData.data.toDate();
        monthsToRecalculate.add(`${date.getFullYear()}-${date.getMonth()}_${beforeData.tecnicoId}`);
        if (beforeData.dataInizio && beforeData.dataFine) {
            (0, date_fns_1.eachDayOfInterval)({ start: beforeData.dataInizio.toDate(), end: beforeData.dataFine.toDate() }).forEach(day => {
                monthsToRecalculate.add(`${day.getFullYear()}-${day.getMonth()}_${beforeData.tecnicoId}`);
            });
        }
    }
    if (afterData) {
        const date = afterData.data.toDate();
        monthsToRecalculate.add(`${date.getFullYear()}-${date.getMonth()}_${afterData.tecnicoId}`);
        if (afterData.dataInizio && afterData.dataFine) {
            (0, date_fns_1.eachDayOfInterval)({ start: afterData.dataInizio.toDate(), end: afterData.dataFine.toDate() }).forEach(day => {
                monthsToRecalculate.add(`${day.getFullYear()}-${day.getMonth()}_${afterData.tecnicoId}`);
            });
        }
    }
    const recalculationPromises = Array.from(monthsToRecalculate).map(key => {
        const [yearMonth, tecnicoId] = key.split("_");
        const [year, month] = yearMonth.split("-").map(Number);
        return recalculateAndSaveSummary(tecnicoId, year, month);
    });
    await Promise.all(recalculationPromises);
    v2_1.logger.info("Ricalcoli completati.");
});
async function recalculateAndSaveSummary(tecnicoId, year, month) {
    const summaryId = `${year}-${String(month + 1).padStart(2, "0")}_${tecnicoId}`;
    v2_1.logger.info(`Inizio ricalcolo per: ${summaryId}`);
    // Tutta la logica di lettura e calcolo rimane fuori dalla transazione per efficienza.
    const tipiGiornataSnap = await db.collection("tipiGiornata").get();
    const tipiGiornataNonLavorativi = new Map();
    tipiGiornataSnap.forEach(doc => {
        const tipo = doc.data();
        const lowerCaseName = tipo.nome.toLowerCase();
        if (["ferie", "malattia", "permesso", "legge 104"].some(kw => lowerCaseName.includes(kw))) {
            tipiGiornataNonLavorativi.set(doc.id, lowerCaseName.includes("ferie") ? "ferie" : "altro");
        }
    });
    const monthStartDate = new Date(year, month, 1);
    const monthEndDate = (0, date_fns_1.endOfMonth)(monthStartDate);
    const monthStartTimestamp = admin.firestore.Timestamp.fromDate(monthStartDate);
    const monthEndTimestamp = admin.firestore.Timestamp.fromDate(monthEndDate);
    const singleDayReportsSnap = await db.collection("rapportini").where("tecnicoId", "==", tecnicoId).where("dataInizio", "==", null).where("data", ">=", monthStartTimestamp).where("data", "<=", monthEndTimestamp).get();
    const periodReportsSnap = await db.collection("rapportini").where("tecnicoId", "==", tecnicoId).where("dataFine", "!=", null).where("dataInizio", "<=", monthEndTimestamp).where("dataFine", ">=", monthStartTimestamp).get();
    let totalOreLavoro = 0, totalGiorniFerie = 0, totalGiorniAltro = 0;
    singleDayReportsSnap.forEach(doc => {
        const r = doc.data();
        totalOreLavoro += r.oreLavoro || 0;
        if (tipiGiornataNonLavorativi.has(r.tipoGiornataId)) {
            const tipo = tipiGiornataNonLavorativi.get(r.tipoGiornataId);
            if (tipo === "ferie")
                totalGiorniFerie += 1;
            else
                totalGiorniAltro += 1;
        }
    });
    periodReportsSnap.forEach(doc => {
        const r = doc.data();
        if (!r.dataInizio || !r.dataFine)
            return;
        const tipoAssenza = tipiGiornataNonLavorativi.get(r.tipoGiornataId);
        if (!tipoAssenza)
            return;
        (0, date_fns_1.eachDayOfInterval)({ start: r.dataInizio.toDate(), end: r.dataFine.toDate() }).forEach(giorno => {
            if ((0, date_fns_1.isWithinInterval)(giorno, { start: monthStartDate, end: monthEndDate })) {
                if (tipoAssenza === "ferie")
                    totalGiorniFerie += 1;
                else
                    totalGiorniAltro += 1;
            }
        });
    });
    const summaryData = {
        tecnicoId, anno: year, mese: month + 1,
        totalOreLavoro: parseFloat(totalOreLavoro.toFixed(2)),
        totalGiorniFerie, totalGiorniAltro,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    const summaryRef = db.collection("riepiloghiMensili").doc(summaryId);
    try {
        await db.runTransaction(async (transaction) => {
            transaction.set(summaryRef, summaryData, { merge: true });
        });
        v2_1.logger.info(`Riepilogo salvato in TRANSAZIONE per ${summaryId}:`, summaryData);
    }
    catch (error) {
        v2_1.logger.error(`TRANSAZIONE FALLITA per il riepilogo ${summaryId}. L'operazione verrà ritentata automaticamente da Firestore.`, error);
        throw error;
    }
}
// Correzione: uso di onDocumentWritten e firma dell'evento corretta
exports.checkInTrigger = (0, firestore_1.onDocumentWritten)("checkin_giornalieri/{checkinId}", async (event) => {
    var _a, _b;
    // Il trigger si attiva solo alla creazione del documento
    if (!((_a = event.data) === null || _a === void 0 ? void 0 : _a.after) || ((_b = event.data) === null || _b === void 0 ? void 0 : _b.before)) {
        v2_1.logger.info(`Trigger ignorato per ${event.params.checkinId} (non è una creazione).`);
        return;
    }
    const snap = event.data.after;
    const checkinData = snap.data();
    if (!checkinData) {
        v2_1.logger.error("Evento di creazione check-in senza dati. Impossibile procedere.");
        return;
    }
    const checkinDate = checkinData.data.toDate();
    const expireAt = new Date(checkinDate.getTime());
    expireAt.setHours(expireAt.getHours() + 24);
    v2_1.logger.info(`Impostazione scadenza per check-in ${event.params.checkinId} a ${expireAt.toISOString()}`);
    return snap.ref.update({
        expireAt: admin.firestore.Timestamp.fromDate(expireAt)
    });
});
//------------------------------------------------------------------
// FUNZIONE PER MARCARE UNA NOTIFICA COME LETTA
//------------------------------------------------------------------
/**
 * Marca una notifica come letta nel database Firestore.
 *
 * Questa funzione è richiamabile direttamente dall'app client (App Master).
 * Richiede che l'utente sia autenticato e che venga passato l'ID della notifica.
 *
 * @param {CallableRequest<{notificationId: string}>} request - L'oggetto richiesta inviato dal client.
 *        Deve contenere `notificationId`.
 * @returns {Promise<{status: string, message: string}>} - Un oggetto che conferma il successo dell'operazione.
 */
exports.markNotificationAsRead = (0, https_1.onCall)(async (request) => {
    // 1. Controllo di Autenticazione: L'utente deve essere loggato.
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "È necessario essere autenticati per eseguire questa operazione.");
    }
    const uid = request.auth.uid;
    const { notificationId } = request.data;
    // 2. Validazione dell'Input: Dobbiamo avere l'ID della notifica.
    if (!notificationId || typeof notificationId !== "string") {
        throw new https_1.HttpsError("invalid-argument", "L'ID della notifica (notificationId) è obbligatorio e deve essere una stringa.");
    }
    v2_1.logger.info(`Richiesta di lettura per notifica ${notificationId} da utente ${uid}.`);
    // Riferimento al documento della notifica in Firestore
    const notificationRef = db.collection("notifications").doc(notificationId);
    try {
        await db.runTransaction(async (transaction) => {
            const doc = await transaction.get(notificationRef);
            // 3. Controllo Esistenza e Sicurezza
            if (!doc.exists) {
                throw new https_1.HttpsError("not-found", "Nessuna notifica trovata con questo ID.");
            }
            const notificationData = doc.data();
            // Verifica che l'utente sia il destinatario della notifica
            if ((notificationData === null || notificationData === void 0 ? void 0 : notificationData.recipientId) !== uid) {
                throw new https_1.HttpsError("permission-denied", "Non si dispone dei permessi per modificare questa notifica.");
            }
            // 4. Aggiornamento del documento all'interno della transazione
            transaction.update(notificationRef, {
                status: "read",
                readAt: admin.firestore.FieldValue.serverTimestamp(),
                readBy: uid, // Registra chi l'ha letta
            });
        });
        v2_1.logger.info(`TRANSAZIONE COMPLETATA: Notifica ${notificationId} marcata come letta dall'utente ${uid}.`);
        return {
            status: "success",
            message: "Notifica aggiornata con successo.",
        };
    }
    catch (error) {
        v2_1.logger.error(`Errore durante l'aggiornamento della notifica ${notificationId}:`, error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError("internal", "Si è verificato un errore interno durante l'aggiornamento della notifica.");
    }
});
//# sourceMappingURL=index.js.map