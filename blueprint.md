# Blueprint del Progetto

Questo documento descrive l'architettura e il piano di sviluppo per l'applicazione.

## Regole Fondamentali

1.  **Inizio Comunicazione:** Ogni interazione deve iniziare con la frase: "CIAO, sono Gemini, non posso procedere a indovinare quindi leggerò tutti i file che modificherò e mi accerterò delle chiamate che inserisco. seguirò tutte le regole compresa quella di scrivere in italiano."
2.  **Non modificare MAI la Grid:** Non è permesso modificare, eliminare, aggiungere o creare manualmente codice relativo al componente `Grid` di Material UI. La migrazione e la gestione di tale componente devono avvenire esclusivamente tramite codemod ufficiali.
3.  **Focus sulla logica:** Il mio compito è intervenire sulla logica dei dati, sui flussi di lavoro e sulla correzione di bug funzionali, non sull'estetica o sul layout.

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

2.  **FASE 5: Refactoring Sincronizzazione e Offline (In Corso)**
    *   [ ] **Azione 5.1:** Rendere la sincronizzazione non-distruttiva (`bulkPut`).
    *   [ ] **Azione 5.2:** Creare la sincronizzazione incrementale (`triggerQueueSync`).
    *   [ ] **Azione 5.3:** Implementare l'auto-sync al rientro online.
    *   [ ] **Azione 5.4:** Integrare `CheckinPage` con `triggerQueueSync`.
    *   [x] **Documentazione:** `registro.md` e `blueprint.md` aggiornati con il piano.

3.  **FASE 6: Migrazione Componente Grid**
    *   [ ] **Azione:** Eseguire il codemod per la migrazione.
    *   [ ] **Comando:** `npx @mui/codemod@next v7.0.0/grid-props src`
