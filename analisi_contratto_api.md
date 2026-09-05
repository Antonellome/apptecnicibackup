# Analisi Contratto API (Client-Side)

Questo documento certifica la correttezza del "contratto" che l'applicazione client (l'app dei tecnici) rispetta quando chiama le Cloud Functions. L'analisi è stata condotta incrociando `registro.md`, `src/models/definitions.ts` (per i tipi) e `src/api/service.ts` (per le chiamate effettive).

**Verdetto Generale:** Il client rispetta il contratto. I problemi noti **NON** risiedono nel codice dell'app che effettua le chiamate, ma nella logica del backend o nell'assenza di funzioni.

---

## Sezione 1: Sincronizzazione Dati Principali

### `apiGetAllRapportiniForSync`
*   **Funzione Chiamata:** `getAllRapportiniForSync`
*   **Payload Inviato:** `{ lastSyncTimestamp: number, tecnicoId: string }`
*   **Struttura Dati Attesa (in ritorno):** `Rapportino[]`
*   **Verdetto:** **CORRETTO (LATO CLIENT)**. L'app invia esattamente i campi richiesti (`lastSyncTimestamp` e `tecnicoId`) con i tipi corretti. Il bug noto (sincronizzazione completa non funzionante) è confermato essere un problema di logica del backend che non interpreta correttamente un `lastSyncTimestamp` pari a `0`.

### `apiGetCheckinsUpdates`
*   **Funzione Chiamata:** `getCheckinsUpdates`
*   **Payload Inviato:** `{ lastSyncTimestamp: number, tecnicoId: string }`
*   **Struttura Dati Attesa (in ritorno):** `CheckinGiornaliero[]`
*   **Verdetto:** **CORRETTO (LATO CLIENT)**. Stesso identico caso di `apiGetAllRapportiniForSync`. Il client è corretto, il backend ha una logica fallata per la sincronizzazione completa.

### `apiSyncAllAnagrafiche`
*   **Funzione Chiamata:** `syncAllAnagrafiche`
*   **Payload Inviato:** `{ localTimestamps: Record<string, number>, tecnicoId: string }`
*   **Struttura Dati Attesa (in ritorno):** `MasterData` (o un sottoinsieme di essa)
*   **Verdetto:** **CORRETTO**. L'app invia un dizionario di timestamp per ogni tabella di anagrafica e l'ID del tecnico. Questa funzione risulta funzionare correttamente, confermando che la struttura della chiamata è valida.

---

## Sezione 2: Operazioni CRUD (Create, Read, Update, Delete)

### `apiCreateRapportino`
*   **Funzione Chiamata:** `createRapportino`
*   **Payload Inviato:** `data: any`
*   **Struttura Dati Attesa (nel payload):** `Rapportino` (da `definitions.ts`)
*   **Verdetto:** **FUNZIONALE, MA DEBOLE**. Il codice in `service.ts` usa un `any`, il che è una cattiva pratica. Tuttavia, il codice che costruisce l'oggetto da inviare (nel `SyncManager`) crea un oggetto conforme all'interfaccia `Rapportino`. Quindi, l'oggetto che arriva al backend è **strutturalmente corretto**. Non è la causa di nessun bug noto.

### `apiUpdateRapportino`
*   **Funzione Chiamata:** `updateRapportino`
*   **Payload Inviato:** `data: any`
*   **Struttura Dati Attesa (nel payload):** `Partial<Rapportino> & { id: string }`
*   **Verdetto:** **FUNZIONALE, MA DEBOLE**. Stesso caso di `apiCreateRapportino`. Il tipo `any` è debole, ma l'oggetto inviato è corretto.

### `apiDeleteRapportino`
*   **Funzione Chiamata:** `deleteRapportino`
*   **Payload Inviato:** `{ rapportinoId: string }`
*   **Verdetto:** **CORRETTO**. L'app invia un oggetto con l'ID del rapportino da eliminare. In realtà, questa funzione non sembra essere usata, poiché la cancellazione è gestita come un aggiornamento con `isDeleted: true` (`apiUpdateRapportino`), ma la sua definizione è corretta.

### `apiCreateCheckin`
*   **Funzione Chiamata:** `createCheckin`
*   **Payload Inviato:** `data: any`
*   **Struttura Dati Attesa (nel payload):** `CheckinGiornaliero`
*   **Verdetto:** **FUNZIONALE, MA DEBOLE**. Stesso caso di `apiCreateRapportino`. Il tipo `any` è debole, ma l'oggetto inviato è corretto.

---

## Sezione 3: Funzioni di Notifica (Mancanti o Errate)

### `apiGetNotifiche`
*   **Funzione Chiamata:** `getNotifiche`
*   **Payload Inviato:** `{}` (nessun payload)
*   **Verdetto:** **CHIAMATA CORRETTA, FUNZIONE MANCANTE**. La chiamata è definita e viene eseguita correttamente dall'app, ma fallisce perché la funzione non esiste sul backend.

### `apiMarkNotificationAsRead`
*   **Funzione Chiamata:** `markNotificationAsRead`
*   **Payload Inviato:** `{ notificationId: string }`
*   **Verdetto:** **CHIAMATA CORRETTA, FUNZIONE MANCANTE**. La chiamata è definita e invia l'ID della notifica come richiesto. Fallisce perché la funzione non esiste sul backend.

**Conclusione Finale:** L'analisi campo per campo e tipo per tipo **assolve completamente il codice client** per i bug attualmente in esame. Le azioni correttive devono essere intraprese **esclusivamente sul backend**.
