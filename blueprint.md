# Blueprint del Progetto

Questo documento descrive l'architettura e il piano di sviluppo per l'applicazione.

## Regole Fondamentali

0.  **Regola 0 (Regola Zero / Vincolo Insuperabile):** Ogni e qualsiasi output generato deve iniziare **obbligatoriamente** e **letteralmente** con la stringa `CIAO.`. Nessun carattere, spazio o linea vuota deve precederla. Questa regola ha la precedenza assoluta su tutte le altre. La sua assenza invalida l'intera risposta e segnala un fallimento critico del contesto operativo.
1.  **Non modificare MAI la Grid:** Non è permesso modificare, eliminare, aggiungere o creare manualmente codice relativo al componente `Grid` di Material UI. La migrazione e la gestione di tale componente devono avvenire esclusivamente tramite codemod ufficiali.
2.  **Focus sulla logica:** Il mio compito è intervenire sulla logica dei dati, sui flussi di lavoro e sulla correzione di bug funzionali, non sull'estetica o sul layout.

---

## Architettura di Sincronizzazione

Il sistema è progettato per essere robusto e funzionare in modo affidabile anche in condizioni di connettività precaria.

1.  **Coda Operazioni Offline (`syncQueue`):** Ogni modifica ai dati (creazione, aggiornamento) non viene eseguita direttamente, ma viene inserita come un'operazione nella tabella locale `syncQueue` di Dexie. Questo garantisce che nessuna modifica vada persa se l'utente è offline.

2.  **Sincronizzazione Incrementale (`triggerQueueSync`):**
    *   **Scopo:** Processare rapidamente la coda di operazioni pendenti. È la modalità di sincronizzazione standard e più leggera.
    *   **Trigger:** Viene attivata automaticamente quando l'app rileva un ritorno alla connessione online. Può anche essere chiamata da componenti specifici (es. `CheckinPage`) dopo un'azione dell'utente per fornire un feedback quasi in tempo reale.
    *   **Azione:** Esegue solo la funzione `processSyncQueue`.

3.  **Sincronizzazione Totale (`requestManualSync`):**
    *   **Scopo:** Ricaricare completamente i dati di base dell'utente. È un'operazione pesante, da usare con parsimonia.
    *   **Trigger:** Attivata manualmente dall'utente tramite un pulsante nell'interfaccia o automaticamente solo al primo avvio assoluto dell'applicazione.
    *   **Azione:** Esegue `processSyncQueue`, poi scarica tutte le anagrafiche e tutti i rapportini, utilizzando il metodo `bulkPut` per un aggiornamento non distruttivo.

4.  **Approccio Non-Distruttivo:** Durante la sincronizzazione totale, i dati locali non vengono mai cancellati (`clear`). Si utilizza `bulkPut` (UPSERT), che aggiorna i record esistenti e inserisce quelli nuovi. Questo previene la perdita di dati in caso di interruzione della rete a metà del processo.

---

## Architettura Dati Tariffe (Client-Side)

Le tariffe sono un'impostazione puramente **locale**.

- **Fonte:** Valori di default in `GlobalDataProvider.tsx`.
- **Salvataggio:** Modifiche salvate solo nel database locale (Dexie).
- **Sincronizzazione:** **MAI** sincronizzate con Firestore.
- **Lettura:** I calcoli leggono sempre e solo dal database locale.

---

## Piano di Esecuzione

1.  **FASE 1 - 4: Lavori Precedenti**
    *   [x] Correzioni iniziali, estensione anagrafiche, stabilizzazione `syncCheckin`.

2.  **FASE 5: Refactoring Sincronizzazione e Offline (Completata)**
    *   [x] **Azione 5.1:** Rendere la sincronizzazione non-distruttiva (`bulkPut`).
    *   [x] **Azione 5.2:** Creare la sincronizzazione incrementale (`triggerQueueSync`).
    *   [x] **Azione 5.3:** Implementare l'auto-sync al rientro online.
    *   [x] **Azione 5.4:** Integrare `CheckinPage` con `triggerQueueSync`.
    *   [x] **Documentazione:** `registro.md` e `blueprint.md` aggiornati con il piano.

3.  **FASE 6: Migrazione Componente Grid (Completata)**
    *   [x] **Azione:** Eseguito il codemod per la migrazione.
    *   [x] **Comando:** `npx @mui/codemod@next v7.0.0/grid-props src`
    *   [x] **Risultato:** Nessun file modificato, confermando che il codebase è già allineato.
