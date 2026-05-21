# Piano di Build, Debug e Log Modifiche

Questo documento unificato traccia lo stato del processo di build, il piano per la risoluzione degli errori e un log storico di tutte le modifiche apportate al codice.

---

## REGOLE OPERATIVE FONDAMENTALI (DA NON MODIFICARE)

### 1. Regola del "CIAO"
Ogni mia singola risposta **DEVE** iniziare con la parola `CIAO.`. Non ci sono eccezioni.

### 2. Regola della Stabilità Visiva (Divieto Assoluto di Modifiche Estetiche)
- Mi è **SEVERAMENTE E CATEGORICAMENTE VIETATO** cambiare, alterare o modificare qualsiasi parte visiva o strutturale dell'applicazione.
- Posso modificare **SOLO** le logiche interne (funzioni, gestione dati, algoritmi).

### 3. PROTOCOLLO DI AZIONE RIGIDO (NUOVO)
Ogni modifica, senza eccezioni, segue questo ciclo:
1.  **IDENTIFICA:** Isola un singolo errore dalla lista `eslint`.
2.  **LEGGI E VERIFICA:** Usa `read_file` e `grep` per analizzare il codice sorgente attuale del file problematico.
3.  **AGISCI:** Applica la correzione con `write_file`.
4.  **VERIFICA POST-MODIFICA:** Esegui `eslint` sul singolo file modificato per confermare che l'errore specifico è stato risolto.
5.  **LOG:** Aggiorna il log delle modifiche solo dopo che la verifica ha avuto successo.

---

## Stato Attuale e Piano di Azione

### **STATO ATTUALE: FALLIMENTO CRITICO DELLA BUILD**

La codebase è in uno stato inaccettabile, con **51 problemi** rilevati da `eslint`. Questo è il risultato diretto della mia negligenza e del mancato rispetto dei protocolli di verifica. La priorità assoluta è la bonifica totale di questi problemi. Nessuna nuova funzionalità verrà implementata fino a quando la build non sarà stabile e tutti i problemi `eslint` risolti.

### **Piano di Bonifica Totale - Basato su `eslint`**

L'attacco sarà sistematico, seguendo il protocollo rigido. La lista è lunga, quindi procedo per fasi, partendo dagli errori più gravi.

**FASE 1: Errori Bloccanti e di Logica**

1.  **[FATTO] Ignorare File Compilati (`.eslintignore`)**
    *   **Problema:** `eslint` analizzava codice JS compilato in `functions/lib`.
    *   **Azione:** Creare `.eslintignore` per escludere la directory.

2.  **`src/components/Rapportini/PdfPreviewDialog.tsx` (Errore di Hoisting)**
    *   **Problema:** `generatePdf` viene chiamata prima della sua dichiarazione.
    *   **Azione:** Ristrutturare il componente, spostando la dichiarazione della funzione prima del suo utilizzo e avvolgendola in `useCallback` per ottimizzazione e per risolvere le dipendenze mancanti.

3.  **Multipli File: `react-hooks/set-state-in-effect` (Errore Critico di Performance)**
    *   **Problema:** Chiamate `setState` sincrone all'interno di `useEffect`, causando render a cascata.
    *   **Files Coinvolti:** `MasterDataProvider.tsx`, `NotificationContext.tsx`, `useAnagrafiche.ts`, `useCollectionData.tsx`, `useFirestoreData.ts`, `useGlobalData.tsx`, `MonthlyReportPage.tsx`, `PresenzePage.tsx`, `ReportListPage.tsx`, `SettingsPage.tsx`.
    *   **Azione:** Analizzare e refattorizzare ogni `useEffect` caso per caso, spostando la logica di `setState` in callback asincrone o gestori di eventi appropriati.

**FASE 2: Errori di Tipo e del Compilatore React**

*   `models/definitions.ts`: Risolvere interfacce vuote.
*   `components/MonthlyReportGrid.tsx`: Rimuovere `useMemo` manuale per permettere l'ottimizzazione del React Compiler.
*   ...e tutti gli altri errori rilevati.

---

## Log Errori `eslint` (Fonte di Verità - 02/08/2024)

Il riferimento completo è l'output del comando `npx eslint . --ext .ts,.tsx` che ha prodotto **51 problemi (31 errori, 20 warning)**. Questa lista guiderà tutte le prossime azioni.

---

## Log Modifiche

- **2024-08-02 - INIZIO OPERAZIONE DI BONIFICA TOTALE:**
    - Riconosciuto fallimento sistemico nella gestione degli errori di build.
    - Aggiornato questo blueprint con un nuovo protocollo operativo rigido e non negoziabile.
    - **Azione 1:** Creato file `.eslintignore` per escludere la directory `functions/lib` dall'analisi, risolvendo 5 errori.

- **2024-08-01 (Correzione Build):** Corretto l'errore di build in `src/pages/ReportFormPage.tsx`... *(Log precedente archiviato)*
