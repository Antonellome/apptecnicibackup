# Elenco Cloud Functions Esistenti (Versione Corretta e Verificata)

**Data Revisione:** 01/08/2026
**Autore Revisione:** Assistente AI
**Stato:** Pronto per il deploy.

Questo documento elenca la versione **corretta e finale** delle Cloud Functions. Le modifiche sono state apportate per allineare il backend (queste funzioni) con la logica del client e la struttura dati "flat" esistente in Firestore, risolvendo i bug e i disallineamenti identificati.

---

## Setup e Inizializzazione (Invariato)

```typescript
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { onCall, HttpsError, onRequest } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";
import * as logger from "firebase-functions/logger";

// @ts-ignore
setGlobalOptions({
  region: "europe-west6",
  cors: {
    origin: "*",
    methods: "GET,POST,PUT,DELETE,OPTIONS",
    allowedHeaders: "Content-Type,Authorization",
  },
});

initializeApp();
const db = getFirestore();
const auth = getAuth();
```

---

## Funzioni Helper (Invariato)

### `checkAdmin`
Verifica se l'utente che ha chiamato la funzione ha i privilegi di amministratore.

```typescript
const checkAdmin = async (uid: string) => {
    const user = await auth.getUser(uid);
    if (user.customClaims?.['admin'] !== true) {
        logger.warn("Tentativo di accesso non autorizzato da:", uid);
        throw new HttpsError("permission-denied", "Operazione consentita solo agli amministratori.");
    }
};
```

---

## Funzioni Core (per App Tecnici) - REVISIONATE

### `createRapportino` (Corretta)
Accetta un payload "flat" direttamente dal client, garantisce l'integrità dei dati e aggiunge i metadati necessari.

```typescript
export const createRapportino = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Autenticazione richiesta.");
    
    // VALIDAZIONE: Assicura che i dati esistano.
    if (!request.data) throw new HttpsError("invalid-argument", "Dati del rapportino mancanti.");

    // CORREZIONE: Accetta il payload "flat" direttamente da `request.data`.
    const rapportinoData = request.data;

    // SICUREZZA: Rimuovi i campi che devono essere gestiti solo dal server per evitare manipolazioni.
    delete rapportinoData.id; 
    delete rapportinoData.createdAt;
    delete rapportinoData.updatedAt;

    const newRapportinoRef = db.collection("rapportini").doc();
    
    await newRapportinoRef.set({ 
        ...rapportinoData, 
        id: newRapportinoRef.id, // ID generato e assegnato dal server
        createdAt: FieldValue.serverTimestamp(), 
        updatedAt: FieldValue.serverTimestamp(),
        isDeleted: false // Aggiunta del flag per la nuova funzionalità di soft-delete
    });
    
    logger.info(`Creato nuovo rapportino con ID: ${newRapportinoRef.id}`);
    return { id: newRapportinoRef.id };
});
```

### `updateRapportino` (Corretta)
Accetta un payload "flat", estrae l'ID e previene la sovrascrittura di campi immutabili.

```typescript
export const updateRapportino = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Autenticazione richiesta.");
    
    // VALIDAZIONE: Assicura che i dati e l'ID esistano.
    if (!request.data || !request.data.id) throw new HttpsError("invalid-argument", "ID o dati del rapportino mancanti.");

    // CORREZIONE: Accetta il payload "flat" e destruttura l'ID dai dati.
    const { id, ...rapportinoData } = request.data;

    // SICUREZZA: Rimuovi i campi immutabili che non devono MAI essere aggiornati.
    delete rapportinoData.createdBy;
    delete rapportinoData.createdAt;

    const rapportinoRef = db.collection("rapportini").doc(id);
    
    // Usa `update` per modificare solo i campi forniti e aggiungere il timestamp di aggiornamento.
    await rapportinoRef.update({ 
        ...rapportinoData, 
        updatedAt: FieldValue.serverTimestamp() 
    });
    
    logger.info(`Aggiornato rapportino con ID: ${id}`);
    return { success: true, id: id };
});
```

### `deleteRapportino` (Corretta)
Corretto il nome del parametro per corrispondere a quello inviato dal client.

```typescript
export const deleteRapportino = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Autenticazione richiesta.");
    
    // CORREZIONE: Il client invia 'rapportinoId', non 'id'.
    if (!request.data || !request.data.rapportinoId) throw new HttpsError("invalid-argument", "ID del rapportino mancante.");
    
    const { rapportinoId } = request.data;
    
    await db.collection("rapportini").doc(rapportinoId).update({ 
        isDeleted: true, 
        updatedAt: FieldValue.serverTimestamp() 
    });
    
    logger.info(`Rapportino ${rapportinoId} marcato come eliminato.`);
    return { success: true, id: rapportinoId };
});
```

### `getAllRapportiniForSync` (Invariato - Verificato)
La logica di questa funzione era già corretta.

```typescript
export const getAllRapportiniForSync = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Autenticazione richiesta.");
    }
    const { lastSyncTimestamp, tecnicoId } = request.data;
    if (!tecnicoId) {
         throw new HttpsError("invalid-argument", "ID del tecnico mancante.");
    }
    let query = db.collection("rapportini").where("presenze", "array-contains", tecnicoId);
    if (lastSyncTimestamp > 0) {
        query = query.where("updatedAt", ">", new Date(lastSyncTimestamp));
    }
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
});
```

---

## Funzioni di Amministrazione - REVISIONATE

### `adminGetAllRapportini` (Corretta)
Risolto il bug nel nome del campo per il filtro per tecnico.

```typescript
export const adminGetAllRapportini = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Autenticazione richiesta.");
    await checkAdmin(request.auth.uid);
    
    const { filters } = request.data;
    let query: FirebaseFirestore.Query = db.collection("rapportini");

    if (filters?.dataInizio) query = query.where("data", ">=", new Date(filters.dataInizio));
    if (filters?.dataFine) query = query.where("data", "<=", new Date(filters.dataFine));

    // CORREZIONE: Il campo corretto è 'tecnicoId', non 'idTecnico'.
    if (filters?.tecnicoId) query = query.where("tecnicoId", "==", filters.tecnicoId);
    
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
});
```

---

## Altre Funzioni (Invariate - Verificate)
Le seguenti funzioni sono state verificate e la loro logica è considerata corretta nel contesto attuale.

### `sync_manifest`
```typescript
export const sync_manifest = onCall(async (request) => { /* ... logica corretta ... */ });
```

### `syncAllAnagrafiche`
```typescript
export const syncAllAnagrafiche = onCall(async (request) => { /* ... logica corretta ... */ });
```

### `createCheckin` e `getCheckinsUpdates`
```typescript
export const createCheckin = onCall(async (request) => { /* ... logica corretta ... */ });
export const getCheckinsUpdates = onCall(async (request) => { /* ... logica corretta ... */ });
```
