import * as admin from "firebase-admin";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";

initializeApp();
const db = getFirestore();

// IMPOSTAZIONE GLOBALE DELLA REGIONE. QUESTA SOVRASCRIVE IL DEFAULT DEL PROGETTO.
setGlobalOptions({ region: "europe-west6" });

// --- FUNZIONI RAPPORTINI (VALIDATE) ---

export const createRapportino = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Autenticazione richiesta.");
    const uid = request.auth.uid;
    const rapportinoData = request.data;
    rapportinoData.tecnicoScriventeId = uid;
    rapportinoData.createdBy = uid;
    rapportinoData.updatedBy = uid;
    rapportinoData.createdAt = FieldValue.serverTimestamp();
    rapportinoData.updatedAt = FieldValue.serverTimestamp();
    rapportinoData.isDeleted = false;
    const ref = await db.collection("rapportini").add(rapportinoData);
    return { id: ref.id };
});

export const updateRapportino = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Autenticazione richiesta.");
    const uid = request.auth.uid;
    const { id, ...rapportinoData } = request.data;
    if (!id) throw new HttpsError("invalid-argument", "L'ID del rapportino è obbligatorio.");
    const docRef = db.collection("rapportini").doc(id);
    const doc = await docRef.get();
    if (!doc.exists) throw new HttpsError("not-found", "Rapportino non trovato.");
    if (doc.data()?.tecnicoScriventeId !== uid) throw new HttpsError("permission-denied", "Non hai i permessi per modificare questo rapportino.");
    rapportinoData.tecnicoScriventeId = uid;
    rapportinoData.updatedBy = uid;
    rapportinoData.updatedAt = FieldValue.serverTimestamp();
    await docRef.update(rapportinoData);
    return { id };
});

export const deleteRapportino = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Autenticazione richiesta.");
    const uid = request.auth.uid;
    const { rapportinoId } = request.data;
    const docRef = db.collection("rapportini").doc(rapportinoId);
    const doc = await docRef.get();
    if (!doc.exists) throw new HttpsError("not-found", "Rapportino non trovato.");
    if (doc.data()?.tecnicoScriventeId !== uid) throw new HttpsError("permission-denied", "Non hai i permessi per eliminare questo rapportino.");
    await docRef.update({ isDeleted: true, updatedAt: FieldValue.serverTimestamp(), updatedBy: uid });
    return { id: rapportinoId };
});

export const getAllRapportiniForSync = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Autenticazione richiesta.");
    const { lastSyncTimestamp, tecnicoId } = request.data;
    if (tecnicoId !== request.auth.uid) throw new HttpsError("permission-denied", "ID tecnico non valido.");
    let query = db.collection("rapportini").where("presenze", "array-contains", tecnicoId);
    if (lastSyncTimestamp > 0) query = query.where("updatedAt", ">", new Date(lastSyncTimestamp));
    const snapshot = await query.get();
    return { data: snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) };
});

// --- FUNZIONI CHECK-IN (VALIDATE) ---

export const createCheckin = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Autenticazione richiesta.");
    const checkinData = request.data;
    checkinData.tecnicoId = request.auth.uid;
    checkinData.timestampReale = FieldValue.serverTimestamp();
    const ref = await db.collection("checkin_giornalieri").add(checkinData);
    return { id: ref.id };
});

export const getCheckinsUpdates = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Autenticazione richiesta.");
    const { lastSyncTimestamp, tecnicoId } = request.data;
    if (tecnicoId !== request.auth.uid) throw new HttpsError("permission-denied", "ID tecnico non valido.");
    let query = db.collection("checkin_giornalieri").where("tecnicoId", "==", tecnicoId);
    if (lastSyncTimestamp > 0) query = query.where("timestampReale", ">", new Date(lastSyncTimestamp));
    const snapshot = await query.get();
    return { data: snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) };
});

// --- FUNZIONE ANAGRAFICHE (VALIDATA E CORRETTA) ---

export const syncAllAnagrafiche = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Autenticazione richiesta.");
    
    // FIX DEFINITIVO: Questo elenco ora corrisponde alla realtà del DB e dell'UI.
    const collections = ["clienti", "navi", "luoghi", "ditte", "categorie", "tipiGiornata", "veicoli", "tecnici"];
    
    const snapshots = await Promise.all(collections.map(c => db.collection(c).get()));
    const results: { [key: string]: any } = {};
    snapshots.forEach((snapshot, index) => {
        const collName = collections[index];
        results[collName] = { data: snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })), timestamp: Date.now() };
    });
    return results;
});
