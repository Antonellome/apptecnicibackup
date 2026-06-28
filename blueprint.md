
# Blueprint: Applicazione Gestione Rapportini Tecnici

## 1. Panoramica e Filosofia del Progetto

L'applicazione è progettata come uno strumento **offline-first** per la gestione dei rapportini di lavoro dei tecnici. L'obiettivo primario è garantire la piena funzionalità (creazione, visualizzazione, modifica, condivisione) anche in assenza di connessione internet.

### **Principio Fondamentale: Il Dominio del Database Locale**

**Tutte le operazioni di lettura, visualizzazione, calcolo e generazione di report devono OBBLIGATORIAMENTE avvenire interrogando il database locale (IndexedDB tramite Dexie.js).**

L'interazione con **Firebase Firestore** è limitata a due scenari specifici e controllati:

1.  **UPLOAD (Sincronizzazione in Uscita):** Quando un utente crea o modifica un rapportino, il dato viene salvato sul database locale e immediatamente accodato per la sincronizzazione verso Firestore. Questo garantisce che il dato non vada perso e sia condiviso con il backend.
2.  **DOWNLOAD (Sincronizzazione in Entrata):** L'applicazione contatta periodicamente o su richiesta Firestore per scaricare *solo* i rapportini nuovi o aggiornati che altri tecnici hanno condiviso e in cui l'utente attuale è presente. Questi dati vengono immediatamente salvati nel database locale.

**Qualsiasi altra interrogazione a Firestore per operazioni di lettura è considerata un bug architetturale**, in quanto aumenta i costi, riduce le performance e viola il principio offline-first dell'applicazione.

---

## 2. Architettura e Flusso Dati

*   **UI (React con Material-UI):** Interfaccia utente costruita per essere reattiva e funzionale.
*   **State Management & Data Hooks:** Utilizzo di `dexie-react-hooks` (`useLiveQuery`) per collegare l'interfaccia direttamente al database locale, garantendo aggiornamenti in tempo reale e performance ottimali.
*   **Database Locale (IndexedDB via `db.ts`):** È la fonte di verità (`Single Source of Truth`) per l'interfaccia utente. Contiene tutti i dati necessari all'operatività: rapportini, anagrafiche (tecnici, navi, luoghi), etc.
*   **Servizio di Sincronizzazione:** Un meccanismo (es. `useSync` hook, `syncService.ts`) gestisce la comunicazione bidirezionale con Firestore in background.

---

## 3. Log delle Modifiche e Soluzioni Implementate

### Versione Recente

*   **BUG RISOLTO (Salvataggio Tariffe):**
    *   **Problema:** Dalla pagina Impostazioni, era impossibile salvare le nuove tariffe orarie. L'operazione falliva con un errore "Funzione non disponibile".
    *   **Causa Radice:** Il gestore dell'evento `onClick` nel componente chiamava una funzione inesistente (`updateRate`) invece di quella corretta per aggiornare le impostazioni generiche (`updateSetting`).
    *   **Soluzione:** È stata corretta la chiamata alla funzione, risolvendo il problema e ripristinando la capacità di aggiornare le tariffe dal pannello delle impostazioni.

*   **UI/UX & BUGFIX (Pop-up di Aggiornamento PWA):**
    *   **Problema:** Il pop-up di notifica per gli aggiornamenti dell'app (componente `ReloadPrompt.tsx`) presentava gravi problemi di stile, apparendo come un box bianco illeggibile, specialmente su dispositivi mobili. Inoltre, conteneva errori di tipo e importazioni non utilizzate che bloccavano la build di produzione.
    *   **Soluzione:**
        *   Il componente `ReloadPrompt.tsx` è stato completamente ridisegnato utilizzando Material-UI (`Paper`, `Snackbar`, `Box`) per garantire uno stile coerente, moderno e leggibile su tutti i dispositivi.
        *   Sono stati risolti tutti gli errori di tipo e di linting, rimuovendo le importazioni superflue e correggendo il codice.
        *   I pulsanti "Aggiorna" e "Chiudi" sono stati resi più chiari ed evidenti.

*   **FIX (Processo di Deploy):**
    *   **Problema:** Nonostante il file `firebase.json` specificasse `"site": "tecnici"`, i deploy venivano erroneamente inviati al sito di default del progetto (`riso-project-app`).
    *   **Causa Radice:** Veniva utilizzato uno strumento di deploy (`classic_firebase_hosting_deploy`) non adatto a gestire configurazioni multi-sito.
    *   **Soluzione:** Il processo di deploy è stato corretto utilizzando il comando `firebase_deploy(only="hosting")`, che interpreta correttamente la configurazione in `firebase.json` e assicura che il deploy venga sempre effettuato sul sito corretto (`tecnici.web.app`).

### Versioni Precedenti

*   **BUG RISOLTO (Condivisione Report Mensili):**
    *   **Problema:** La condivisione di un report PDF (generato dalla pagina "Report Mensili") funzionava solo la prima volta. I tentativi successivi fallivano senza errori apparenti, richiedendo un riavvio dell'app.
    *   **Causa Radice (Corretta):** È stato identificato un **memory leak** nel componente modale `PdfPreviewModal.tsx`. A ogni apertura, veniva creato un URL per il PDF (`URL.createObjectURL`) senza che questo venisse mai revocato alla chiusura del dialogo. L'accumulo di questi URL non revocati esauriva le risorse del browser, mandando in crash la funzionalità `navigator.share`.
    *   **Soluzione:** Il componente `PdfPreviewModal.tsx` è stato refattorizzato utilizzando `useState` e `useEffect`. La funzione di cleanup di `useEffect` garantisce ora che `URL.revokeObjectURL` venga chiamato ogni volta che il componente viene smontato (chiuso) o aggiornato, prevenendo il memory leak.

*   **CONFERMA ARCHITETTURA `MonthlyReportPage.tsx`:**
    *   È stato verificato che la pagina dei report mensili aderisce già alla filosofia offline-first, basando tutti i suoi calcoli e le sue visualizzazioni sui dati provenienti dal database locale tramite `useLiveQuery`.

---

## 4. Piano di Sviluppo e Azioni Future

*   **Obiettivo:** Mantenere e rafforzare l'architettura offline-first.
*   **Azioni Immediate:** Nessuna. I bug critici sono stati risolti e l'architettura principale è stata validata.
*   **Prossimi Passi:**
    1.  **Audit del Codice:** Effettuare una revisione completa di tutti i componenti che eseguono letture di dati per assicurarsi che non ci siano altre query non necessarie a Firestore, in linea con la filosofia definita in questo blueprint.
    2.  **Ottimizzazione Sincronizzazione:** Migliorare la logica di sincronizzazione in background per renderla più efficiente e meno impattante sulle performance.
    3.  **UI/UX:** Continuare a migliorare l'esperienza utente, con un focus sulla chiarezza dello stato di sincronizzazione (online/offline, dati in coda, etc.).
