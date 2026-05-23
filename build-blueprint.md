# Piano di Build, Debug e Log Modifiche

Questo documento unificato traccia lo stato del processo di build, il piano per la risoluzione degli errori e un log storico di tutte le modifiche apportate al codice.

---

## REGOLE OPERATIVE FONDAMENTALI (DA NON MODIFICARE)

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

Il processo di bonifica è attivo. Il numero di problemi è sceso a **31 (17 errori, 14 avvisi)**. Si prosegue con l'applicazione sistematica del protocollo di correzione.

### **Piano di Bonifica Totale - Basato su `eslint`**

**FASE 1: Errori Bloccanti e Refactoring Strutturali**

1.  **[FATTO] Ignorare File Compilati (`.eslintignore`)**
2.  **[FATTO] Configurazione Moduli ES per Cloud Functions (`functions/tsconfig.json`)**
3.  **[FATTO] `src/components/AppBar.tsx` (`@typescript-eslint/no-unused-vars`)**
4.  **[FATTO] `src/components/MonthlyReportGrid.tsx` (`react-hooks/preserve-manual-memoization`)**
5.  **[FATTO] `src/components/pdf/PdfPreviewDialog.tsx` (`react/no-unescaped-entities`)**
6.  **[FATTO] `src/components/ui/button.tsx` (`react-refresh/only-export-components`)**
7.  **[FATTO] `src/contexts/AuthContext.tsx` (`react-refresh/only-export-components`)**

**FASE 2: Errori Critici di Logica e Stabilità degli Hook**

*   **[FATTO] `src/contexts/NotificationContext.tsx`:** Sostituito `useState` con `useReducer`.
*   **[FATTO] `src/hooks/useAnagrafiche.ts`:** Applicato il pattern `useReducer` per stabilizzare l'hook.
*   **[IN CORSO] `src/hooks/useCollectionData.tsx`:** Aggiornamenti di stato sincroni nel render. **Azione Strategica:** Refactoring con `useReducer`.
*   ... e altri 6 file con lo stesso problema critico.

---

## Log Modifiche

- **2024-08-03 - **STABILIZZAZIONE HOOKS E CONTESTI**:
    - **`NotificationContext.tsx`:** Completato refactoring con `useReducer`.
    - **`useAnagrafiche.ts`:** Completato refactoring con `useReducer`. Eseguito commit `9a589eb` come da protocollo. **Errori rimanenti: 31**.
