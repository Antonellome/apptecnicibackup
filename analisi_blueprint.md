# Analisi e Blueprint del Progetto Tecnico

## 1. Overview

Questa applicazione è uno strumento di lavoro per tecnici sul campo. Il suo scopo principale è la creazione e la gestione dei rapportini di lavoro. L'applicazione è progettata con una filosofia "Local-First", per garantire la massima velocità e operatività anche in assenza di connessione a Internet.

## 2. Architettura

L'architettura del progetto si basa su due applicazioni distinte e separate:

*   **App Tecnici (Questo Progetto):** L'applicazione utilizzata dai tecnici. È responsabile della creazione, modifica e salvataggio dei rapportini. Il backend associato ha un ruolo di supporto limitato, principalmente per l'aggregazione di dati quantitativi (ore, giorni) per i report personali del tecnico.
*   **App Master (Progetto Separato):** L'applicazione utilizzata dal personale d'ufficio per la supervisione e la gestione. Il suo backend gestisce la logica di business principale, comprese le notifiche e le analisi avanzate.

### Flusso Dati del Rapportino

1.  **Creazione Locale:** Il tecnico crea un rapportino nel database locale (IndexedDB).
2.  **Sincronizzazione:** Un servizio di sincronizzazione carica il rapportino su Firestore quando l'applicazione è online.
3.  **Elaborazione Backend:** I backend di entrambe le applicazioni (Tecnici e Master) elaborano il nuovo rapportino per i rispettivi scopi.

## 3. Gestione Offline

L'applicazione implementa una robusta gestione offline:

*   **Coda di Sincronizzazione Dati:** I rapportini creati o modificati offline vengono salvati in una coda locale e sincronizzati con Firebase non appena la connessione viene ripristinata.
*   **Coda di Condivisione:** I tentativi di condivisione di PDF offline vengono accodati e eseguiti al ripristino della connessione.

## 4. Regole di Sviluppo

*   **Divieto di Modifiche Estetiche:** È assolutamente vietato modificare l'aspetto visivo dell'applicazione (colori, layout, ecc.) senza un'autorizzazione esplicita.
*   **Obbligo di Correzione di `GridLegacy`:** Durante la modifica di un file, è obbligatorio correggere l'utilizzo di componenti `GridLegacy` di MUI, aggiornandoli alla nuova sintassi per migliorare la codebase.

## 5. Stato Attuale del Progetto (25/07/2024)

### Correzioni Recenti

*   **Risoluzione degli Errori di Linting:** Sono stati risolti tutti gli errori critici di linting, inclusi:
    *   `set-state-in-effect`: Corretto in tutti i file interessati, inclusi `MasterDataProvider.tsx`, `useLocalData.tsx` e `ReportListPage.tsx`.
    *   `no-empty-object-type`: Risolto eliminando l'interfaccia vuota `BaseEntity` e utilizzando `FirebaseDoc` direttamente.

### Stato di Linting Attuale

Al momento, il progetto non presenta più errori critici di linting. Tuttavia, rimangono alcuni avvisi.

## 6. Prossimi Passi

Il prossimo obiettivo è risolvere gli avvisi di linting rimanenti:

*   **`@typescript-eslint/no-unused-vars`:** Rimuovere le variabili non utilizzate in `LoginPage.tsx`, `ReportFormPage.tsx`, e `report/ReportListPage.tsx`.
*   **`react-refresh/only-export-components`:** Spostare costanti e funzioni non-component in file separati per i file in `src/contexts`.
