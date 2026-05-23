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
2.  **LEGGI E VERIFICA:** Usa `read_file` per analizzare il codice sorgente attuale del file problematico.
3.  **AGISCI:** Applica la correzione con `write_file`.
4.  **VERIFICA POST-MODIFICA:** Esegui `eslint` sul singolo file modificato per confermare che l'errore specifico è stato risolto.
5.  **LOG:** Aggiorna il log delle modifiche solo dopo che la verifica ha avuto successo.

---

## Stato Attuale e Piano di Azione

### **STATO ATTUALE: BONIFICA IN CORSO**

Il processo di bonifica è attivo. Il numero di problemi è stato ridotto da 51 a **36 (20 errori, 16 warning)**. Si prosegue con l'applicazione sistematica del protocollo di correzione. La priorità assoluta rimane la bonifica totale di questi problemi.

### **Piano di Bonifica Totale - Basato su `eslint`**

L'attacco sistematico prosegue, seguendo il protocollo rigido.

**FASE 1: Errori Bloccanti e di Logica**

1.  **[FATTO] Ignorare File Compilati (`.eslintignore`)**
2.  **[FATTO] Configurazione Moduli ES per Cloud Functions (`functions/tsconfig.json`)**
3.  **[FATTO] `src/components/AppBar.tsx` (`@typescript-eslint/no-unused-vars`)**
    *   **Azione:** Rimossa la variabile `theme` inutilizzata.
4.  **[FATTO] `src/components/MonthlyReportGrid.tsx` (`react-hooks/preserve-manual-memoization`)**
    *   **Azione:** Rimossi i `useMemo` manuali per consentire l'ottimizzazione del React Compiler.
5.  **[FATTO] `src/components/pdf/PdfPreviewDialog.tsx` (`react/no-unescaped-entities`)**
    *   **Azione:** Sostituito l'apostrofo con l'entità HTML `&apos;`.
6.  **[FATTO] `src/components/ui/button.tsx` (`react-refresh/only-export-components`)**
    *   **Azione:** Separata la costante `buttonVariants` in un file dedicato per rispettare la regola di HMR.

**FASE 2: Avvisi e Refactoring Minori**

*   `src/contexts/AuthContext.tsx`: Avviso `react-refresh/only-export-components`. Verrà risolto spostando il contesto in un file separato.
*   ...e tutti gli altri problemi rimanenti.

---

## Log Errori `eslint` (Fonte di Verità - 02/08/2024)

Il riferimento completo è l'output del comando `npx eslint . --ext .ts,.tsx` che ora riporta **36 problemi (20 errori, 16 warning)**. Questa lista guida tutte le prossime azioni.

---

## Log Modifiche

- **2024-08-02 - INIZIO OPERAZIONE DI BONIFICA TOTALE:**
    - Riconosciuto fallimento sistemico nella gestione degli errori di build.
    - Aggiornato questo blueprint con un nuovo protocollo operativo rigido e non negoziabile.
    - **Azione 1:** Creato file `.eslintignore` per escludere la directory `functions/lib`.
    - **Azione 2:** Modificato `functions/tsconfig.json` per usare `module: NodeNext`.

- **2024-08-02 - Continuazione Bonifica:**
    - **Azione 3:** Corretto `no-unused-vars` in `src/components/AppBar.tsx`.
    - **Azione 4:** Rimossi `useMemo` manuali in `src/components/MonthlyReportGrid.tsx`.
    - **Azione 5:** Corretto `no-unescaped-entities` in `src/components/pdf/PdfPreviewDialog.tsx`.
    - **Azione 6:** Refattorizzato `src/components/ui/button.tsx` spostando `buttonVariants` in `src/components/ui/button-variants.ts`.
