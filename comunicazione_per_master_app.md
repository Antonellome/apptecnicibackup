# Comunicazione Urgente per Backend Master

**Data:** 01/08/2026

**ATTENZIONE:** Le seguenti modifiche sono critiche e bloccanti per il funzionamento dell'app dei tecnici. È necessario applicarle e deployarle con la massima priorità.

---

## Parte 1: Correzione Bug Critico di Sincronizzazione

**Contesto:**
L'app dei tecnici non riesce a effettuare la prima sincronizzazione dei dati (rapportini e check-in) dopo un'installazione pulita o un reset dei dati. Questo accade perché il client invia un `lastSyncTimestamp` con valore `0` per richiedere tutti i dati, ma il backend non gestisce correttamente questo caso.

**Problema:**
Le Cloud Functions `getAllRapportiniForSync` e `getCheckinsUpdates` applicano un filtro temporale anche quando `lastSyncTimestamp` è `0`, non restituendo di fatto alcun dato e lasciando l'app in uno stato "offline" e vuoto.

**Azione Richiesta:**

Modificare la logica delle funzioni `getAllRapportiniForSync` e `getCheckinsUpdates` nel file `functions/src/index.ts` del progetto **MASTER**.

### Logica Corretta da Implementare:

Le funzioni devono essere modificate per non applicare il filtro temporale quando `lastSyncTimestamp` è `0`. Invece di una complessa logica `if/else`, è sufficiente rimuovere la condizione che avvolge la query.

**Sostituire le attuali implementazioni delle due funzioni con le seguenti:**

```typescript
export const getAllRapportiniForSync = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Autenticazione richiesta.");
    const { lastSyncTimestamp, tecnicoId } = request.data;
    if (tecnicoId !== request.auth.uid) throw new HttpsError("permission-denied", "ID tecnico non valido.");

    // CORREZIONE: La query ora funziona correttamente anche per la prima sincronizzazione (lastSyncTimestamp = 0).
    let query = db.collection("rapportini")
        .where("presenze", "array-contains", tecnicoId)
        .where("updatedAt", ">", new Date(lastSyncTimestamp));

    const snapshot = await query.get();
    return { data: snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) };
});

export const getCheckinsUpdates = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Autenticazione richiesta.");
    const { lastSyncTimestamp, tecnicoId } = request.data;
    if (tecnicoId !== request.auth.uid) throw new HttpsError("permission-denied", "ID tecnico non valido.");

    // CORREZIONE: La query ora funziona correttamente anche per la prima sincronizzazione (lastSyncTimestamp = 0).
    let query = db.collection("checkin_giornalieri")
        .where("tecnicoId", "==", tecnicoId)
        .where("timestampReale", ">", new Date(lastSyncTimestamp));

    const snapshot = await query.get();
    return { data: snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) };
});
```

## Richiesta di Verifica Dettagliata (FONDAMENTALE)

Una volta deployate le modifiche, è **obbligatorio** fornire una conferma esplicita e dettagliata. Non è sufficiente un semplice "OK".

**Chiediamo di verificare e confermare punto per punto:**

1.  **Conferma di Deploy:** Avete deployato con successo le nuove versioni delle funzioni `getAllRapportiniForSync` e `getCheckinsUpdates`?
2.  **Verifica del Codice Sorgente:** Potete confermare che il codice sorgente deployato per entrambe le funzioni **non contiene più la condizione `if (lastSyncTimestamp > 0)`** e che la query viene costruita direttamente come mostrato sopra?
3.  **Test di Chiamata (Raccomandato):** Se possibile, eseguire un test chiamando le funzioni con `lastSyncTimestamp: 0` e verificare che restituiscano il set di dati completo e non un array vuoto.

---

## Parte 2: Aggiunta Funzioni per Sistema di Notifiche (Mantenuto come da richiesta originale)

**Azione Richiesta:**

Aggiungere le quattro (4) nuove Cloud Functions per le notifiche al backend, come descritto nella comunicazione precedente. Si consiglia di creare un nuovo file `notifiche.ts`.

### Codice Sorgente per le Nuove Funzioni (`notifiche.ts`)

```typescript
import * as functions from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();

// 1. Funzione per recuperare le notifiche
export const getNotifiche = functions.onCall(
    { region: "europe-west6" },
    async (request) => {
        if (!request.auth) {
            throw new functions.HttpsError("unauthenticated", "Autenticazione richiesta.");
        }
        const tecnicoId = request.auth.token.tecnicoId;
        if (!tecnicoId) {
            throw new functions.HttpsError("failed-precondition", "Token utente incompleto.");
        }
        const snapshot = await db.collection("notifiche").where("tecnicoId", "==", tecnicoId).orderBy("createdAt", "desc").get();
        if (snapshot.empty) return [];
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    });

// 2. Funzione per segnare le notifiche come lette
export const markNotificheAsRead = functions.onCall(
    { region: "europe-west6" },
    async (request) => {
        if (!request.auth) {
            throw new functions.HttpsError("unauthenticated", "Autenticazione richiesta.");
        }
        const ids = request.data.notificationIds;
        if (!Array.isArray(ids) || ids.length === 0) {
            throw new functions.HttpsError("invalid-argument", "È richiesto un array di ID.");
        }
        const batch = db.batch();
        ids.forEach(id => {
            batch.update(db.collection("notifiche").doc(id), { isRead: true, letta: true });
        });
        await batch.commit();
        return { success: true };
    });

// 3. Funzione (Admin) per inviare una notifica
export const sendNotifica = functions.onCall(
    { region: "europe-west6" },
    async (request) => {
        // Aggiungere un controllo per soli admin
        const { tecnicoId, title, body, link } = request.data;
        if (!tecnicoId || !title || !body) {
            throw new functions.HttpsError("invalid-argument", "Campi obbligatori mancanti.");
        }
        await db.collection("notifiche").add({
            tecnicoId, title, body, link: link || null, isRead: false, letta: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { success: true };
    });

// 4. Funzione (Admin) per cancellare le notifiche
export const deleteNotifiche = functions.onCall(
    { region: "europe-west6" },
    async (request) => {
        // Aggiungere un controllo per soli admin
        const ids = request.data.notificationIds;
        if (!Array.isArray(ids) || ids.length === 0) {
            throw new functions.HttpsError("invalid-argument", "È richiesto un array di ID.");
        }
        const batch = db.batch();
        ids.forEach(id => {
            batch.delete(db.collection("notifiche").doc(id));
        });
        await batch.commit();
        return { success: true };
    });
```

### Integrazione nel file `index.ts`

Aggiungere quanto segue al file `index.ts` principale per esporre le nuove funzioni:

**Importazioni:**
```typescript
import { getNotifiche, markNotificheAsRead, sendNotifica, deleteNotifiche } from './notifiche';
```

**Esportazioni:**
```typescript
export { getNotifiche, markNotificheAsRead, sendNotifica, deleteNotifiche };
```

---

Questa comunicazione annulla e sostituisce tutte le precedenti. La risoluzione del bug di sincronizzazione (Parte 1) è la priorità assoluta.

Grazie per il supporto.
