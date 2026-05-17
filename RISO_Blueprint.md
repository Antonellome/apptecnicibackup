# R.I.S.O. - Contratto Dati e Architettura

**Versione:** 4.0
**Ultimo Aggiornamento:** 25 Maggio 2024
**Scopo:** Questo documento è la **Fonte di Verità Assoluta** e il **contratto dati** ufficiale tra l'App Tecnici e l'App Master Office.

---

### **REGOLE DI INGAGGIO PER L'INTELLIGENZA ARTIFICIALE (AI)**

**(Contenuto invariato)**

---

## Capitolo 0: Piano di Lavoro Corrente e Stato Sistema

**Stato Attuale: COMPLETATO**
Tutte le funzionalità definite nelle versioni precedenti (Anagrafiche, Rapportini, Presenze) sono considerate **implementate, stabili e operative**.

**PROCEDIMENTO ATTUALE: Implementazione Sistema di Notifiche basato su Firestore**

**Obiettivo:** Sostituire il precedente concetto di notifiche push con un sistema più robusto, economico e tracciabile, interamente basato su Firestore. Questo sistema gestirà la comunicazione dall'App Master verso i tecnici.

**Fasi di Implementazione:**

1.  **Fase 1: Invio (App Master -> Cloud Function -> Firestore)**
    *   **Azione:** L'utente sull'App Master compila e invia una notifica.
    *   **Trigger:** L'App Master invoca la Cloud Function `sendNotification` passando `targetType`, `targetId`, `title`, `message`.
    *   **Logica:** La Cloud Function recupera gli UID dei destinatari e **crea** un documento per ciascuno nella collezione `notifications`.

2.  **Fase 2: Ricezione e Lettura (App Tecnici <-> Firestore)**
    *   **Azione:** L'App Tecnici riceve e visualizza le notifiche non lette.
    *   **Trigger:** L'App Tecnici usa `onSnapshot` per ascoltare i documenti nella collezione `notifications` con `recipientId` uguale all'UID del tecnico e `status === 'unread'`.
    *   **Logica di Lettura:** Al click su "Segna come letto", l'App Tecnici esegue una **scrittura diretta (`updateDoc`)** sul documento, cambiando lo `status` in `'read'` e popolando `readAt` e `readBy`. **Nessuna Cloud Function viene invocata in questa fase.**

---

## Capitolo 1: Schemi Dati Ufficiali (Fonte di Verità Assoluta)

**(Anagrafiche, Rapportini, Check-in... contenuto invariato)**

### **NUOVO: Notifiche (`/notifications`)**
*   **Scopo:** Collezione per la gestione delle notifiche inviate ai tecnici.
*   **Struttura del Documento `notifications/{notificationId}`:**
    ```json
    {
      "title": "Titolo della notifica",
      "message": "Corpo del messaggio...",
      "createdAt": "Timestamp",
      "recipientId": "UID del tecnico destinatario",
      "status": "'unread' | 'read'", 
      "readAt": "Timestamp | null",
      "readBy": "UID del tecnico | null"
    }
    ```

---

## Capitolo 2: App Tecnici - Interazioni con gli Schemi Dati

**(Contenuto su Rapportini e Check-in invariato)**

### **NUOVO: Gestione Notifiche**
- **LETTURA (Tempo Reale):** Utilizza `onSnapshot` sulla collezione `notifications` per i documenti dove `recipientId == currentUser.uid`. Mostra un contatore di notifiche con `status === 'unread'`.
- **SCRITTURA (Update):** Quando un utente legge una notifica, l'app esegue `updateDoc` direttamente sul documento `notifications/{notificationId}` per impostare `status: 'read'`, `readAt: serverTimestamp()`, e `readBy: currentUser.uid`.

---

## Capitolo 3: App Master Office - Interazioni con gli Schemi Dati

**(Contenuto su Anagrafiche, Rapportini, Presenze invariato)**

### **AGGIORNATO: 3.4. Invio e Monitoraggio Notifiche (`/notifiche`)**
- **Componente:** `GestioneNotifiche.tsx`.
- **Rotta:** `/notifiche`.
- **LETTURA:**
    - Legge la collezione `tecnici` per popolare la UI di selezione dei destinatari.
    - Legge (con `onSnapshot`) la collezione `notifications` per mostrare una tabella **storica** di tutte le notifiche inviate, con il loro stato di lettura (`status`).
- **SCRITTURA (Indiretta):**
    - **NON scrive direttamente su Firestore.**
    - Invoca la Cloud Function `sendNotification` con il payload corretto (`target`, `title`, `message`). La responsabilità di creare i documenti è **delegata** alla funzione, garantendo un punto di controllo centralizzato.

---

## Capitolo 4: Domande e Risposte (FAQ)

**(Contenuto invariato)**
