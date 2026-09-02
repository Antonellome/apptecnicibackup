# REGISTRO ANALISI DETTAGLIATA (Archivio Storico)

---

## Architettura Dati e Permessi (Analisi Precedente)

Questa sezione documenta l'architettura che era stata definita prima della validazione finale. È mantenuta per scopi storici.

*   **Struttura del Documento `rapportino`:**
    *   `tecnicoScriventeId` (String): "Padrone" del report.
    *   `presenze` (Array<String>): Visibilità.
    *   `isDeleted` (Boolean): Cancellazione logica.
    *   `updatedAt` (Timestamp): Cursore per la sincronizzazione.
*   **Logica Cloud Functions (Precedente):**
    *   `saveRapportino`: Creazione/aggiornamento con controllo del padrone.
    *   `softDeleteRapportino`: Cancellazione logica con controllo del padrone.
    *   `getAllRapportiniForSync`: Query di visibilità basata su `presenze`.
*   **Indice Firestore Richiesto (Precedente):**
    *   Collezione: `rapportini`, Campi: `presenze` (Array), `updatedAt` (Decrescente).

---
---

# CONFIGURAZIONE DI DEPLOY FINALE (V16) - LA VERITÀ ASSOLUTA

Questa sezione contiene il pacchetto di deploy completo e validato per il backend Firebase.
Queste configurazioni sono state verificate con dati reali e risolvono gli errori `internal` e `Missing or insufficient permissions`. **Usare solo questa configurazione.**

---

## 1. Cloud Functions (`functions/src/index.ts`) - VALIDATO

Questo codice corregge l'elenco delle collezioni nella funzione `syncAllAnagrafiche` per rispecchiare ESATTAMENTE le anagrafiche presenti nell'app.

```typescript
import * as admin from "firebase-admin";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

initializeApp();
const db = getFirestore();

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
```

---

## 2. Regole Firestore (`firestore.rules`) - VALIDATE

Queste regole supportano l'accesso `isAdmin` e risolvono l'errore di permessi su `sync_manifest`.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAdmin() {
      return exists(/databases/$(database)/documents/utenti_master/$(request.auth.uid));
    }
    function isTecnico() {
      return exists(/databases/$(database)/documents/tecnici/$(request.auth.uid));
    }
    function isSignedIn() {
      return request.auth != null;
    }
    function isOwner(resource) {
      return request.auth.uid == resource.data.tecnicoId;
    }
    function isParticipant(resource) {
      // La chiave 'presenze' deve esistere ed essere una lista che contiene l'uid dell'utente.
      return 'presenze' in resource.data && request.auth.uid in resource.data.presenze;
    }

    match /utenti_master/{userId} { allow read: if isSignedIn() && request.auth.uid == userId; allow write: if isAdmin(); }
    match /tecnici/{userId} { allow read: if isSignedIn() && request.auth.uid == userId; allow write: if isAdmin(); }
    match /utenti/{userId} { allow read: if isSignedIn() && request.auth.uid == userId; allow write: if isAdmin(); }

    // REGOLE ANAGRAFICHE
    match /clienti/{d} { allow read: if isAdmin() || isTecnico(); allow write: if isAdmin(); }
    match /ditte/{d} { allow read: if isAdmin() || isTecnico(); allow write: if isAdmin(); }
    match /luoghi/{d} { allow read: if isAdmin() || isTecnico(); allow write: if isAdmin(); }
    match /navi/{d} { allow read: if isAdmin() || isTecnico(); allow write: if isAdmin(); }
    match /categorie/{d} { allow read: if isAdmin() || isTecnico(); allow write: if isAdmin(); }
    match /tipiGiornata/{d} { allow read: if isAdmin() || isTecnico(); allow write: if isAdmin(); }
    match /veicoli/{d} { allow read: if isAdmin() || isTecnico(); allow write: if isAdmin(); }
    
    // FIX DEFINITIVO: Permetti a qualsiasi utente loggato di leggere il manifest per la sincronizzazione.
    match /sync_manifest/{d} { allow read: if isSignedIn(); allow write: if isAdmin(); }

    // REGOLE OPERATIVE
    match /checkin_giornalieri/{docId} {
      allow create: if isTecnico() && request.resource.data.tecnicoId == request.auth.uid;
      allow read, update, delete: if isOwner(resource) || isAdmin();
    }
    match /rapportini/{id} {
      allow list: if isAdmin() || isTecnico();
      allow get: if isAdmin() || isOwner(resource) || isParticipant(resource);
      allow create: if isTecnico() && request.resource.data.tecnicoId == request.auth.uid;
      allow update, delete: if isOwner(resource) || isAdmin();
    }

    // REGOLE DI FALLBACK PER ADMIN
    match /{path=**}/{doc} {
        allow read, write: if isAdmin();
    }
  }
}
```

---

## 3. Indici Firestore (`firestore.indexes.json`) - VALIDATI

Questi indici sono indispensabili per le query di sincronizzazione e sono stati validati.

```json
{
  "indexes": [
    {
      "collectionGroup": "rapportini",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "presenze",
          "arrayConfig": "CONTAINS"
        },
        {
          "fieldPath": "updatedAt",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "checkin_giornalieri",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "tecnicoId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "timestampReale",
          "order": "DESCENDING"
        }
      ]
    }
  ],
  "fieldOverrides": []
}
```
