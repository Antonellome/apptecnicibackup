
# Analisi e Blueprint del Progetto Tecnico

## 0. Stato Attuale del Progetto (25/07/2024)

**OBIETTIVO**: Raggiungere zero errori di compilazione per preparare l'applicazione per il deploy in hosting.

**STATO**: **IN CORSO**. Il numero di errori è sceso da **51** a **50**.

### Correzioni Recenti

*   **Risoluzione Errore di Tipo in `ReportMensileDialog.tsx`**: Risolto l'errore `TS2358` utilizzando un cast sicuro `(error as any)` con un fallback `String(error)`. La modifica è stata validata e ha ridotto il numero totale di errori.
*   **Risoluzione Crash di Runtime**: Corretta una chiamata errata a `showSnackbar` in `ReportFormPage.tsx`.
*   **Stabilizzazione del Modello Dati**: Riscritto il file `src/models/definitions.ts`.

### Focus Attuale

L'errore corrente in analisi è `src/hooks/useCollectionData.tsx(55,37): error TS2322: Type 'T[]' is not assignable to type 'never[]'.` Questo errore suggerisce un problema con l'inferenza dei tipi generici all'interno dell'hook.

---

## 1. Architettura e Flusso Dati (Analisi Completata)

L'architettura è una PWA Offline-First con una chiara separazione tra la cache dei dati master e la coda di sincronizzazione. La logica di business è suddivisa tra la raccolta dati (`ReportFormPage`) e il calcolo economico (`MonthlyReportPage`).

---

## 2. Protocollo di Risoluzione Finale

1.  **Analisi dell'Errore**: Affrontare il primo errore nella lista di build.
2.  **Correzione Chirurgica**: Applicare una modifica mirata per risolvere quell'errore specifico.
3.  **Build di Verifica**: Eseguire `npm run build` dopo **ogni singola modifica**.
4.  **Validazione**: Se il numero totale di errori diminuisce, la modifica è **APPROVATA**.
5.  **Rollback**: Se il numero di errori non diminuisce, annullare la modifica e rianalizzare il problema.
6.  **Aggiornamento**: Aggiornare questo blueprint con il nuovo stato dopo ogni modifica approvata.

---

## 3. Lista Nemici Attuale: Errori di Build (50 Errori)

La lista completa degli errori è disponibile nell'output del comando `npm run build`. Il primo errore da affrontare è `src/hooks/useCollectionData.tsx(55,37): error TS2322`.
