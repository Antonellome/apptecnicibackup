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

Il processo di bonifica è attivo. Il numero di problemi è **29 (15 errori, 14 avvisi)**, dato confermato da una scansione completa. Si prosegue con l'applicazione sistematica del protocollo di correzione.

### **Piano di Bonifica Totale - Basato su `eslint`**

**FASE 1: Errori Bloccanti e Refactoring Strutturali**

1.  **[FATTO] Ignorare File Compilati (`.eslintignore`)**
2.  **[FATTO] Configurazione Moduli ES per Cloud Functions (`functions/tsconfig.json`)**
3.  **[FATTO] `src/components/AppBar.tsx` (`@typescript-eslint/no-unused-vars`)**
4.  **[FATTO] `src/components/MonthlyReportGrid.tsx` (`react-hooks/preserve-manual-memoization`)**
5.  **[FATTO] `src/components/pdf/PdfPreviewDialog.tsx` (`react/no-unescaped-entities`)**
6.  **[FATTO] `src/components/ui/button.tsx` (`react-refresh/only-export-components`)**
7.  **[FATTO] `src/contexts/AuthContext.tsx` (`react-refresh/only-export-components`)**

**FASE 2: Errori Critici di Logica e Stabilità degli Hook (useReducer Campaign)**

*   **[FATTO] `src/contexts/NotificationContext.tsx`:** Sostituito `useState` con `useReducer`.
*   **[FATTO] `src/hooks/useAnagrafiche.ts`:** Applicato il pattern `useReducer` per stabilizzare l'hook.
*   **[FATTO] `src/hooks/useCollectionData.tsx`:** Risolto aggiornamento di stato sincrono con `useReducer`.
*   **[FATTO] `src/hooks/useFirestoreData.ts`:** Risolto aggiornamento di stato sincrono con `useReducer`.
*   **[FATTO] `src/hooks/useRapportini.ts`:** Risolto aggiornamento di stato sincrono con `useReducer`.
*   **[FATTO] `src/hooks/useFirestoreCollection.ts`:** Risolto aggiornamento di stato sincrono con `useReducer`.
*   **[FATTO] `src/hooks/useFirestoreQuery.ts`:** Risolto aggiornamento di stato sincrono con `useReducer`. **Errori rimanenti: 29**.
*   **[IN CORSO] `src/hooks/useGlobalData.tsx`:** Ultimo hook con aggiornamenti di stato sincroni. **Azione Strategica:** Refactoring con `useReducer`.

**FASE 3: Bonifica Errori Residui**

*   `src/pages/MonthlyReportPage.tsx`, `src/pages/PresenzePage.tsx`, `src/pages/ReportListPage.tsx`, `src/pages/SettingsPage.tsx`: Errori `set-state-in-effect` nei componenti.
*   `src/models/definitions.ts`: Errori `no-empty-object-type`.
*   Altri avvisi e errori minori sparsi.

---

## Log Modifiche

- **2024-08-03 - **STABILIZZAZIONE HOOKS E CONTESTI**:
    - **`NotificationContext.tsx`:** Completato refactoring con `useReducer`.
    - **`useAnagrafiche.ts`:** Completato refactoring con `useReducer`.
    - **`useCollectionData.tsx`:** Completato refactoring con `useReducer`.
    - **`useFirestoreData.ts`:** Completato refactoring con `useReducer`.
    - **`useRapportini.ts`:** Completato refactoring con `useReducer`.
    - **`useFirestoreCollection.ts`:** Completato refactoring con `useReducer`.
    - **`useFirestoreQuery.ts`:** Completato refactoring con `useReducer`.