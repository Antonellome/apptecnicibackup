# Piano di Build, Debug e Log Modifiche

Questo documento unificato traccia lo stato del processo di build, il piano per la risoluzione degli errori e un log storico di tutte le modifiche apportate al codice.

---

## REGOLE OPERATIVE FONDAMENTALI (DA NON MODIFICare)

### 1. Regola del "CIAO"
Ogni mia singola risposta **DEVE** iniziare con la parola `CIAO.`. Non ci sono eccezioni.

### 2. Regola della Stabilità Visiva (Divieto Assoluto di Modifiche Estetiche)
- Mi è **SEVERAMENTE E CATEGORICAMENTE VIETATO** cambiare, alterare o modificare qualsiasi parte visiva o strutturale dell'applicazione.
- Posso modificare **SOLO** le logiche interne (funzioni, gestione dati, algoritmi).
- L'app Tecnici scambia dati con un'app Master. Le modifiche devono essere chirurgiche per non rompere l'integrazione.

### 3. PROTOCOLLO DI AZIONE RIGIDO (NUOVO)
Ogni modifica, senza eccezioni, segue questo ciclo:
1.  **IDENTIFICA:** Isola un singolo errore dalla lista `eslint`.
2.  **LEGGI E VERIFICA:** Usa `read_file` per analizzare il codice sorgente attuale del file problematico.
3.  **AGISCI:** Applica la correzione con `write_file`.
4.  **VERIFICA POST-MODIFICA:** Esegui `eslint` sul singolo file modificato per confermare che l'errore specifico è stato risolto.
5.  **LOG:** Aggiorna questo blueprint.
6.  **COMMIT & PUSH:** Salva in Git con un messaggio di commit che includa il numero di errori rimanenti.

---

## Stato Attuale e Piano di Azione

### **STATO ATTUALE: BONIFICA IN CORSO**

Il processo di bonifica è attivo. Il numero di problemi è **28 (15 errori, 13 avvisi)**, ma il numero di errori bloccanti sta diminuendo rapidamente.

### **Piano di Bonifica Totale - Basato su `eslint`**

**FASE 1: Errori Bloccanti e Refactoring Strutturali**

- **[COMPLETATI]** Vari file.

**FASE 2: Errori Critici di Logica e Stabilità degli Hook (useReducer Campaign)**

- **[COMPLETATA]** La campagna `useReducer` ha bonificato con successo tutti gli hook e i contesti critici.

**FASE 3: Bonifica Errori Residui (Pagine e Modelli)**

*   **[FATTO] `src/pages/MonthlyReportPage.tsx`:** Risolto l'errore `set-state-in-effect` tramite refactoring con `useReducer`. **Il file è ora PULITO.**
*   **[FATTO] `src/pages/PresenzePage.tsx`:** Risolto l'errore `set-state-in-effect` e gli avvisi `exhaustive-deps` tramite refactoring con `useReducer` e `useMemo`. **Il file è ora PULITO.**
*   **[FATTO] `src/pages/ReportListPage.tsx`:** Risolto l'errore `set-state-in-effect` tramite refactoring con `useReducer`. **Il file è ora PULITO.**
*   **[PROSSIMO OBIETTIVO] `src/pages/SettingsPage.tsx`:** Probabile errore `set-state-in-effect` o gestione dello stato inefficiente.
*   **[IN CODA] `src/models/definitions.ts`:** Errori `no-empty-object-type`.
*   **[IN CODA]** Altri avvisi e errori minori sparsi in vari file.

---

## Log Modifiche

- **2024-08-03 - **AVANZAMENTO FASE 3**:
    - **`ReportListPage.tsx`**: Risolto errore `set-state-in-effect` con `useReducer`. File PULITO.
    - **`PresenzePage.tsx`:** Risolto errore `set-state-in-effect` e avvisi `exhaustive-deps` con `useReducer` e `useMemo`. File PULITO.
    - **`MonthlyReportPage.tsx`:** Eseguito refactoring della gestione dello stato con `useReducer` per risolvere l'errore `set-state-in-effect`. File PULITO.

- **2024-08-03 - **VITTORIA SUL BUG DEL PARSER**:
    - **`useGlobalData.tsx`:** Risolto bug critico del parser di `eslint` sostituendo le arrow function con dichiarazioni di funzione classiche. **FASE 2 CONCLUSA.**

- **2024-08-03 - **STABILIZZAZIONE HOOKS E CONTESTI (CAMPAGNA `useReducer`)**:
    - Refactoring completato per `NotificationContext.tsx`, `useAnagrafiche.ts`, `useCollectionData.tsx`, `useFirestoreData.ts`, `useRapportini.ts`, `useFirestoreCollection.ts`, `useFirestoreQuery.ts`.