# Blueprint dell'Applicazione

## Panoramica

Questa applicazione è un sistema di gestione dei rapportini di lavoro per tecnici. Consente ai tecnici di creare, visualizzare, e gestire i loro report giornalieri in modo efficiente. L'applicazione è progettata per essere utilizzata sia su dispositivi mobili che desktop, con un'interfaccia moderna e intuitiva.

## Funzionalità Implementate

*   **Autenticazione:** Sistema di login sicuro per l'accesso dei tecnici.
*   **Dashboard Principale (`HomePage.tsx`):** Pagina di benvenuto personalizzata che funge da hub centrale per la navigazione. Include un'azione rapida per la creazione di un nuovo report e un menu per accedere alle funzionalità principali.
*   **Gestione Rapportini:**
    *   **Creazione (`RapportinoNew.tsx`):** Modulo per l'inserimento di un nuovo rapportino di lavoro.
    *   **Visualizzazione (`RapportiniList.tsx`):** Elenco completo dei rapportini con funzionalità di filtro per data, tecnico, nave, luogo e cliente.
    *   **Modifica (`RapportinoEdit.tsx`):** Modulo per la modifica di un rapportino esistente.
*   **Riepilogo Mensile (`MonthlyReportPage.tsx`):** Pagina per la visualizzazione di un riepilogo mensile delle attività.
*   **Gestione Presenze (`AttendancesPage.tsx`):** Pagina per la gestione delle presenze.
*   **Impostazioni (`SettingsPage.tsx`):** Pagina per le impostazioni dell'utente.
*   **Tema Scuro/Chiaro:** Possibilità di cambiare tema per una migliore esperienza utente in diverse condizioni di luce.

## Struttura delle Rotte

L'applicazione utilizza `react-router-dom` per la navigazione, con le seguenti rotte protette:

*   `/`: HomePage (Dashboard)
*   `/rapportini`: Lista dei rapportini
*   `/rapportini/nuovo`: Creazione di un nuovo rapportino
*   `/rapportini/:id`: Modifica di un rapportino esistente
*   `/monthly-report`: Riepilogo mensile
*   `/attendances`: Gestione presenze
*   `/settings`: Impostazioni

La rotta `/login` è pubblica e gestisce l'autenticazione.

## Modifiche Recenti (Sessione Corrente)

*   **Pulizia del Progetto:** Sono stati rimossi numerosi file e componenti inutilizzati, tra cui `Dashboard.tsx`, `GestioneRapportini.tsx`, `NotificationsPage.tsx`, e altri, per ridurre la complessità del codice.
*   **Riorganizzazione delle Rotte:** Le rotte sono state standardizzate secondo un approccio RESTful. Le funzionalità relative ai rapportini sono state raggruppate sotto il percorso `/rapportini`.
*   **Correzione Link:** Tutti i percorsi di navigazione all'interno dei componenti sono stati aggiornati per riflettere la nuova struttura delle rotte.
*   **Risoluzione Dipendenze:** È stato aggiunto il pacchetto `dayjs` per risolvere un errore di compilazione e garantire il corretto funzionamento delle funzionalità di data.
