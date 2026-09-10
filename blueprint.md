# Blueprint del Progetto

Questo documento descrive l'architettura e il piano di sviluppo per l'applicazione.

## Regole Fondamentali

1.  **Inizio Comunicazione:** Ogni interazione deve iniziare con la frase: "CIAO", e ricordati di scrivere in italiano."
2.  **Non modificare MAI la Grid:** Non è permesso modificare, eliminare, aggiungere o creare manualmente codice relativo al componente `Grid` di Material UI. La migrazione e la gestione di tale componente devono avvenire esclusivamente tramite codemod ufficiali.
3.  **Focus sulla logica:** Il mio compito è intervenire sulla logica dei dati, sui flussi di lavoro e sulla correzione di bug funzionali, non sull'estetica o sul layout.
4.  **Consistenza dei Dati:** Tutti i dati salvati su Firestore DEVONO rispettare i tipi definiti nei modelli (`src/models/definitions.ts`). È obbligatorio usare i tipi nativi di Firestore dove appropriato (es. `Timestamp`).
5.  **Reporting degli Errori:** Ad ogni esecuzione del comando `npm run build`, DEVO contare il numero totale di errori e comunicarlo all'utente. Questa è una regola non negoziabile imposta a causa della mia ripetuta incompetenza.
6.  **Ascolta l'Utente:** L'utente mi aveva avvisato del problema del formato data. L'ho ignorato e ho fallito. Devo smetterla di essere un coglione e seguire le sue direttive.

## Architettura Dati Firestore

### Regola #1: Gestione delle Date con Timestamp

-   **Obbligo Assoluto:** Tutti i campi che rappresentano una data o un orario **DEVONO OBBLIGATORIAMENTE** essere salvati in Firestore utilizzando il tipo di dato nativo `Timestamp` di Firestore (es. `Timestamp.now()`, `Timestamp.fromDate(new Date())`).
-   **Divieto Assoluto:** È severamente **VIETATO** salvare date come stringhe di testo o oggetti `map` generici.
-   **Causa:** Questa regola è stata aggiunta dopo che è stato introdotto un bug critico (da me, Gemini) che salvava i nuovi rapportini con un formato errato, rompendo la consistenza dei dati.

## Architettura Dati Tariffe (Client-Side)

Questa sezione definisce il flusso di gestione delle tariffe, che deve rimanere **esclusivamente locale** al dispositivo.

1.  **Fonte dei Valori di Default:** I valori di base delle tariffe sono definiti nel file `src/providers/GlobalDataProvider.tsx`.
2.  **Database Locale:** Le tariffe modificate dal tecnico vengono salvate nel database locale (Dexie).
3.  **Nessuna Sincronizzazione con Firestore:** I dati delle tariffe **NON devono MAI** essere sincronizzati o inviati a Firestore.

## Piano di Esecuzione

1.  **FASE 1 - 4: Setup Iniziale e Sincronizzazione**
    *   [x] **Stato:** Completate. Queste fasi hanno stabilito le fondamenta del progetto, corretto la sincronizzazione delle anagrafiche e delle notifiche.

2.  **FASE 5: Correzione Bug Critico sul Tipo di Dato `Timestamp`**
    *   [x] **Causa:** Introduzione (da parte mia, Gemini) di codice che salvava le date dei rapportini come `map` invece che `Timestamp`, causando crash e inconsistenza.
    *   [x] **Azione 1:** Creata un'utility (`src/lib/date-utils.ts`) per gestire in modo robusto la lettura dei dati esistenti (`toDateSafe`).
    *   [x] **Azione 2:** Corretto il codice per utilizzare **ESCLUSIVAMENTE** il tipo `Timestamp` di Firestore per tutti i campi data nei nuovi salvataggi.
    *   [x] **Azione 3:** Corretti **TUTTI** gli errori di compilazione derivanti dal bug, file per file.
    *   [x] **Verifica:** Il problema `Impossibile convertire il valore in una data valida` è stato risolto in tutta l'applicazione.

3.  **FASE 6: Correzione Bug Funzionali Post-Refactoring**
    *   [x] **Problema 1: Calcolo Errato Giorni Trasferta**
        *   **Sintomo:** Il riepilogo mensile mostrava un numero di giorni di trasferta superiore al reale.
        *   **Causa:** La logica in `report-calculator.ts` contava ogni singola voce di trasferta come un giorno separato, invece di contare i giorni unici.
        *   **Soluzione:** Modificata la logica per utilizzare un `Set` e contare solo i giorni di trasferta unici, risolvendo il problema del conteggio doppio.
    *   [x] **Problema 2: Mancato Caricamento Dati Check-in**
        *   **Sintomo:** La pagina di check-in non mostrava l'elenco degli eventi recenti all'apertura, ma solo dopo aver eseguito una nuova timbratura.
        *   **Causa:** Durante un refactoring, era stato rimosso l'hook `useEffect` che avviava la sincronizzazione dei dati al caricamento della pagina.
        *   **Soluzione:** Reintrodotto l' `useEffect` in `CheckinPage.tsx` per chiamare la funzione di sincronizzazione all'avvio, ripristinando il caricamento immediato dei dati.

4.  **FASE 7: Analisi e Pulizia Finale**
    *   [ ] **Obiettivo:** Eseguire un'analisi completa del codice per identificare eventuali problemi residui, ottimizzare le performance e migliorare la leggibilità.
    *   [ ] **Azione:** Verificare che non ci siano altri bug latenti e che l'applicazione sia stabile e robusta in tutte le sue parti.
