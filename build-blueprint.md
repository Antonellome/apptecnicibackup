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

Il processo di bonifica è attivo. Il numero di problemi è sceso a **32 (18 errori, 14 avvisi)**. Si prosegue con l'applicazione sistematica del protocollo di correzione.

### **Piano di Bonifica Totale - Basato su `eslint`**

**FASE 1: Errori Bloccanti e Refactoring Strutturali**

1.  **[FATTO] Ignorare File Compilati (`.eslintignore`)**
2.  **[FATTO] Configurazione Moduli ES per Cloud Functions (`functions/tsconfig.json`)**
3.  **[FATTO] `src/components/AppBar.tsx` (`@typescript-eslint/no-unused-vars`)**
4.  **[FATTO] `src/components/MonthlyReportGrid.tsx` (`react-hooks/preserve-manual-memoization`)**
5.  **[FATTO] `src/components/pdf/PdfPreviewDialog.tsx` (`react/no-unescaped-entities`)**
6.  **[FATTO] `src/components/ui/button.tsx` (`react-refresh/only-export-components`)**
7.  **[FATTO] `src/contexts/AuthContext.tsx` (`react-refresh/only-export-components`)**

**FASE 2: Errori Critici di Logica (`react-hooks/set-state-in-effect`)**

*   **[FATTO] `src/contexts/NotificationContext.tsx`:** Causa render a cascata e loop di dipendenze. **Azione Correttiva:** Sostituito `useState` con `useReducer`, risolvendo tutti i problemi.
*   **[IN CORSO] `src/hooks/useAnagrafiche.ts`:** Chiamata di fetch in `useEffect`. **Azione Strategica:** Applicare il pattern `useReducer` per stabilizzare l'hook.
*   ... e altri 7 file con lo stesso problema critico.

---

## Log Modifiche

- **2024-08-02 - INIZIO OPERAZIONE DI BONIFICA TOTALE:**
    - **Azioni 1-2:** Setup iniziale (`.eslintignore`, `tsconfig.json`).

- **2024-08-02 - Continuazione Bonifica:**
    - **Azioni 3-6:** Correzioni minori e refactoring HMR.

- **2024-08-03 - Refactoring Contesti e Risoluzione Incidente:**
    - **Azione 7:** Refactoring `src/contexts/AuthContext.tsx`.

- **2024-08-03 - **VITTORIA STRATEGICA: `NotificationContext.tsx`**:
    - **Decisione Strategica:** Implementazione di `useReducer`.
    - **Stato:** **COMPLETATO**. Il file è ora stabile e privo di errori `eslint`.
