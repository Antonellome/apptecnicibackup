# Blueprint: R.I.S.O. - App Tecnici

## Panoramica

Quest'applicazione, denominata R.I.S.O. (Report Individuali Sincronizzati Online), è l'applicazione **client** per tecnici. È progettata per interagire con un sistema di configurazione centralizzato ("RISO Master") tramite Firebase. L'obiettivo è fornire ai tecnici uno strumento mobile e desktop per creare e gestire i loro report di lavoro giornalieri.

## Documentazione del Progetto e Funzionalità Implementate

### 1. Stack Tecnologico e Dipendenze Chiave
- **Framework:** React (con Vite)
- **Componenti UI:** Material-UI (MUI)
- **Icone:** `@mui/icons-material`
- **Routing:** `react-router-dom`

### 2. Funzionalità Pre-esistenti
- **Pagine Iniziali:** `HomePage`, `LoginPage`, `NewReportPage`, `ReportListPage`, `MonthlyReportPage`, `AttendancesPage`.
- **Componente `MenuBar`:** Un componente base `MenuBar.tsx` esiste in `src/components`.
- **Routing:** La navigazione di base tra le pagine è configurata in `App.tsx`.

---

## **SVOLTA CRITICA E NUOVO PIANO STRATEGICO (Diagnosi Problema di Autenticazione)**

### Analisi e Causa Radice

Dopo un'approfondita investigazione, è stato identificato un **blocco architetturale critico** che impediva qualsiasi progresso. L'errore di autenticazione (`auth/invalid-credential`) non era un bug nell'app 'tecnici', ma un sintomo di una profonda incoerenza nel modo in cui l'applicazione 'master' crea e gestisce i profili utente.

**Problema:** L'app 'master' creava i documenti dei tecnici in Firestore con un ID documento casuale, mentre le regole di sicurezza di Firestore richiedono che l'ID del documento corrisponda all'UID dell'utente autenticato per consentire l'accesso. Questo conflitto rendeva impossibile per l'app 'tecnici' leggere i dati del profilo utente dopo il login.

### Soluzione Architetturale Definitiva

È stata definita una soluzione definitiva che deve essere implementata nell'applicazione **'master'**. Questa soluzione risolve il problema alla radice per tutti gli utenti.

1.  **Implementazione di una Cloud Function (`provisionTecnico`):** L'app 'master' utilizzerà una Cloud Function sicura per creare/abilitare i tecnici. Questa funzione garantirà che l'utente venga creato prima in Firebase Authentication per ottenere un `UID`, e che questo `UID` venga poi usato come **ID del documento** in Firestore.
2.  **Modifica del Frontend 'master':** Il form di creazione dei tecnici nell'app 'master' chiamerà questa Cloud Function, eliminando il processo manuale e il rischio di errori.
3.  **Bonifica dei Dati Esistenti:** Tutti i profili dei tecnici esistenti nell'app 'master' dovranno essere ricreati con il nuovo processo per allineare i loro dati alla nuova architettura.

---

## **ANALISI COSTI E PIANO DI OTTIMIZZAZIONE OBBLIGATORIO**

### Diagnosi: Costi Insostenibili e Causa Radice

È emerso un secondo blocco critico, questa volta di natura economica. Una spesa di ~100€ in una fase di sviluppo con utilizzo minimo è un segnale di allarme che indica un'architettura di lettura dati inefficiente e non scalabile.

**Causa:** La pagina `PresenzePage.tsx` dell'app 'master' scarica l'intera lista di tecnici e l'intera collezione di rapportini del mese selezionato per effettuare calcoli e aggregazioni **lato client (nel browser)**. Questo genera un numero spropositato di letture (centinaia per ogni visualizzazione di pagina), che è la causa diretta dei costi elevati. Se non corretto, con 30+ tecnici attivi, la spesa mensile esploderebbe a cifre insostenibili (migliaia di euro).

### Soluzione Strategica: Aggregazione Dati Lato Server

Per ridurre i costi a un livello nominale (stimato < 10€/mese anche con 60 tecnici), è obbligatorio spostare l'elaborazione dal client al server.

1.  **Creazione di una Collezione Aggregata:** Verrà creata una nuova collezione in Firestore, `reportMensiliAggregati`. Ogni documento rappresenterà un mese (es. ID `2024-10`) e conterrà i dati sulle presenze già pre-calcolati e pronti per la visualizzazione.
2.  **Implementazione di una Cloud Function di Aggregazione:** Una Cloud Function si attiverà alla creazione/modifica/eliminazione di un rapportino e aggiornerà in tempo reale il documento aggregato corrispondente. Questa operazione ha un costo marginale.
3.  **Refactoring della `PresenzePage.tsx`:** La pagina nell'app 'master' verrà modificata per leggere **un solo documento** (`reportMensiliAggregati/<mese-anno>`) invece di centinaia. Questo ridurrà il costo di lettura della pagina di oltre il 99%.

---

## Piano Attuale

**STATO: BLOCCATO**

Lo sviluppo sull'applicazione 'tecnici' è **attualmente bloccato** in attesa del completamento delle modifiche architetturali sull'app 'master' per risolvere il problema di autenticazione.

### Prossimi Passi (Post-Sblocco)

1.  **Verifica dell'Architettura Corretta:** Una volta che l'app 'master' è stata aggiornata, il primo passo sarà verificare che il login funzioni e che l'app 'tecnici' possa leggere correttamente i dati del profilo utente (`/tecnici/<user_uid>`).
2.  **Ottimizzazione Costi (Massima Priorità):** Subito dopo la verifica del login, il primo task di sviluppo sarà l'implementazione della strategia di aggregazione dei dati per la pagina delle presenze, come descritto sopra.
3.  **Ripresa dello Sviluppo UI:** Solo dopo aver completato l'ottimizzazione dei costi, si riprenderà il piano di sviluppo originale, a partire da:
    *   Completamento del componente `MenuBar` con la funzionalità di Logout.
    *   Integrazione della `MenuBar` nelle pagine secondarie.
