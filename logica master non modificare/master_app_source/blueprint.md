# Blueprint R.I.S.O. App Tecnici

## 1. Panoramica del Progetto

L'applicazione **R.I.S.O. App Tecnici** è una Progressive Web App (PWA) progettata per i tecnici, ottimizzata per l'uso su dispositivi mobili. L'app sarà sviluppata utilizzando React e Vite.

## 2. Architettura e Sincronizzazione

*   **Applicazione Client:** R.I.S.O. App Tecnici è l'applicazione client che i tecnici utilizzeranno sul campo.
*   **Logica di Business e Backend:** La logica di business, la gestione dei dati e la sincronizzazione sono governate dall'applicazione "Master Office", che funge da sistema di amministrazione e backend.
*   **Sincronizzazione:** L'app dei tecnici si sincronizzerà con l'app "Master Office" per inviare e ricevere dati, come rapportini, anagrafiche e altre informazioni operative.

## 3. Risorse di Sviluppo

*   **Repository di Riferimento:** La cartella `Riferimento App Git Non Modificare` contiene un'implementazione di esempio che verrà utilizzata come spunto per lo sviluppo dell'interfaccia utente e delle funzionalità.
*   **Logica "Master":** La cartella `logica master non modificare` contiene il codice sorgente e la documentazione dell'applicazione "Master Office", che definisce le regole di business e la struttura dei dati con cui l'app dei tecnici dovrà interfacciarsi.

## 4. Piano di Sviluppo

*   **Fase 1: Setup del Progetto e Struttura Iniziale.**
    *   Creare un nuovo progetto React + Vite.
    *   Configurare l'ambiente di sviluppo e le dipendenze necessarie.
    *   Definire la struttura delle cartelle e dei componenti principali dell'app.
*   **Fase 2: Sviluppo delle Funzionalità Core.**
    *   Implementare l'autenticazione degli utenti (tecnici).
    *   Sviluppare il modulo per la creazione e la gestione dei rapportini giornalieri.
    *   Creare le interfacce per la visualizzazione delle anagrafiche (clienti, luoghi, ecc.).
*   **Fase 3: Implementazione della Sincronizzazione.**
    *   Sviluppare la logica per sincronizzare i dati locali con il backend "Master Office" (tramite Firestore).
*   **Fase 4: Ottimizzazione e PWA.**
    *   Implementare le funzionalità di una PWA (Service Worker per l'uso offline, manifest dell'app).
    *   Ottimizzare le performance e la reattività dell'interfaccia per i dispositivi mobili.
