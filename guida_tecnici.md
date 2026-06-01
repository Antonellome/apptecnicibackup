# Guida Tecnici e Blueprint Operativo dell'Applicazione

**Data:** 24 Maggio 2024
**Versione:** 1.2

## 1. Introduzione

Questo documento descrive l'architettura, le funzionalità e le linee guida tecniche per lo sviluppo e la manutenzione dell'applicazione destinata ai tecnici. Mira a fornire una comprensione chiara di ogni pagina, delle logiche di gestione dati e delle interazioni utente, con un focus particolare sull'uso di Firestore e sul supporto offline.

## 2. Struttura Generale e Navigazione

*   **AppBar Globale:** L'applicazione presenta un'**AppBar stabile** comune a tutte le pagine, contenente:
    *   Titolo dell'applicazione
    *   Sottotitolo
    *   Icona "Home" (che riporta alla pagina HOME)
    *   Icona "Impostazioni" (che naviga alla pagina IMPOSTAZIONI)
    *   Icona "Logout"

*   **Pagine Principali:** Accessibili dalla HOME tramite 5 card:
    1.  NUOVO REPORT
    2.  I MIEI REPORT
    3.  REPORT MENSILI
    4.  NOTIFICHE
    5.  CHECK_IN

## 3. Pagina HOME

*   **Contenuto:** Visualizza gli elementi di benvenuto e le 5 card per accedere alle sezioni principali.
*   **Elementi UI Specifici della HOME:**
    *   Cornice superiore con il messaggio di "Benvenuto" e l'email del tecnico loggato.
    *   Card "I MIEI REPORT": Contiene un chip/badge sopra l'icona/tasto per indicare la presenza di report in coda (offline).
    *   Card "NOTIFICHE": Contiene un badge che indica il numero di notifiche non lette.
    *   Cornice inferiore con la firma dell'applicazione.

## 4. Pagina NUOVO REPORT

Questa pagina gestisce l'inserimento di nuovi report di intervento.

*   **Form di Inserimento (Da non variare se non richiesto):**
    1.  **Sezione 1: Dettagli Generali**
        *   `Data`: Campo data.
        *   `Tecnico`: Campo fisso (ID del tecnico loggato).
        *   `Tipologia Giornata`: Selezionabile (es. Ordinaria, Straordinaria, Trasferta, Ferie, Festivo, Malattia).
    2.  **Sezione 2: Orari di Lavoro**
        *   **Metodo Orari:**
            *   `Normale`: Orari di default 07:30 - 16:00, con pausa configurabile (30, 60, 90 min). Step di 30 min per inizio/fine.
            *   `Manuale`: Input per inizio e fine orario con step di 30 min. Dalle 8 ore in su, verranno visualizzate come straordinario (es. 8+0:30, 8+1:00).
        *   **Ereditarietà e Modifica:** Gli orari impostati dal tecnico principale vengono ereditati dai tecnici aggiunti, ma sono sempre modificabili individualmente per ciascun tecnico aggiunto.
        *   **Tecnico Aggiunto:** Possibilità di selezionare gli orari per i tecnici aggiunti.
    3.  **Sezione 3: Dettagli Intervento**
        *   Campi: `Navi`, `Luogo`, `Veicolo`, `Breve Descrizione`, `Materiali e Lavoro`.
    4.  **Sezione 4: Firma Cliente**
        *   Campi: `Nome`, `Società`.
        *   Campo Firma (digitale/grafica).
    5.  **Azioni Finali:**
        *   **Salva Report:** Salva il report (vedi gestione offline).
        *   **Condividi Report:** Possibilità di condividere il report su piattaforme esterne (es. WhatsApp).

*   **Gestione Offline (Nuovo Rapportino):**
    *   Se l'app è offline, la creazione di un nuovo rapportino dovrebbe andare in coda.
    *   Il report salvato in coda deve essere visibile/modificabile/condivisibile anche offline.
    *   Verranno visualizzati due chip/indicatori per avvisare della presenza di report in coda:
        *   Nella HOME, nella card "I MIEI REPORT" (sopra l'icona).
        *   Nella pagina "I MIEI REPORT", sopra il tasto "Nuovo Report".
    *   Nella lista dei report (pagina "I MIEI REPORT"), i report in coda avranno un'indicazione visiva (es. chip) finché non verranno sincronizzati.

## 5. Pagina I MIEI REPORT

Questa pagina visualizza tutti i report creati dal tecnico loggato e quelli a cui è stato aggiunto come partecipante.

*   **Contenuto:**
    *   **Filtri di Navigazione:** In alto, un tasto "Nuovo Report", affiancato dal mese corrente, con frecce per navigare ai mesi precedenti e successivi.
    *   **Lista Report:** Elenco dei report. Ogni elemento della lista è cliccabile per consultazione/modifica.
    *   **Indicatore Report in Coda:** Sopra il tasto "Nuovo Report", un chip/badge segnala la presenza di report in coda da sincronizzare.
    *   **Indicatore Report Offline:** I report presenti nella lista ma ancora non sincronizzati (offline) avranno un'indicazione visiva (es. chip, colore diverso).

*   **Funzionalità:**
    *   I report sono consultabili e modificabili *solo* dal tecnico che li ha creati.
    *   I tecnici aggiunti (e la "master") ricevono i report a cui partecipano.
    *   **Database Locale (Da Implementare/Risolvere):** I report dovrebbero essere copiati nel database locale per permettere la consultazione/modifica offline. Ci sono problemi noti di sincronizzazione e gestione tra database locale e Firestore.

## 6. Pagina REPORT MENSILI

Pagina di riepilogo e analisi dei costi.

*   **Contenuto:**
    *   Riepilogo dettagliato dei costi per attività.
    *   Distribuzione delle attività mensili visualizzata tramite grafico.
*   **Logica Offline (Priorità Bassa - Problemi Noti):**
    *   Questa pagina dovrebbe funzionare **principalmente offline**, leggendo i dati direttamente dal database locale per evitare costi su Firestore e migliorare le performance.
    *   I dati provengono dalla copia locale dei report salvati.
*   **Calcolo Tariffe (Logica di Business):**
    *   **Giornata Ordinaria:** (Prime 8 ore * Tariffa Ordinaria) + (Ore Straordinarie * Tariffa Straordinaria).
    *   **Giornata Straordinaria:** (Ore Totali * Tariffa Straordinaria).
    *   **Trasferta:** (Ore Ordinarie + Tariffa Trasferta).
    *   **Ferie/Festivo/Malattia:** Si considerano di default 8 ore con tariffa fissa giornaliera.
*   **Gestione Tariffe:**
    *   Le tariffe sono definite in una tabella nativa nell'app (Pagina IMPOSTAZIONI).
    *   Il tecnico può modificare autonomamente questi valori.
    *   Al salvataggio, le tariffe vengono aggiornate nel database locale.
    *   I calcoli devono verificare la presenza delle tariffe necessarie nel database locale.

## 7. Pagina NOTIFICHE

Gestisce la ricezione, visualizzazione e conferma di lettura delle notifiche.

*   **Struttura Dati Firestore (`notifications` collection):**
    *   `title`: Titolo della notifica.
    *   `body`: Corpo del messaggio.
    *   `target`: Destinatario (`{ type: 'user', id: '...' }`, `{ type: 'category', id: '...' }`, `{ type: 'all', id: 'all' }`).
    *   `senderId`: UID dell'amministratore mittente.
    *   `createdAt`: Timestamp di creazione.
    *   `readBy`: Oggetto (mappa) con `{ tecnicoId: { readAt: Timestamp, tecnicoName: '...' } }`.
*   **Flusso Notifiche:**
    1.  **Invio:** Amministratore invia notifica (tramite Cloud Function triggerata da Firestore).
    2.  **Ricezione (Background/Chiusa):**
        *   Il dispositivo riceve il messaggio push FCM (che include `notificationId`).
        *   Può mostrare un badge sull'icona dell'app (non gestito qui, ma deve essere abilitato).
        *   Il `notificationId` viene gestito per la navigazione successiva.
    3.  **Ricezione (Foreground):**
        *   App aperta: Listener `onMessage` cattura la notifica.
        *   Mostra un avviso in-app personalizzato.
        *   Badge sulla card "NOTIFICHE" in HOME si aggiorna (a questo punto dovrebbe essere visibile).
    4.  **Apertura Notifica:**
        *   L'utente tocca la notifica (dal sistema o dall'avviso in-app).
        *   L'app naviga alla schermata `NotificationDetail` passando il `notificationId`.
    5.  **Visualizzazione Dettaglio e Conferma Lettura:**
        *   La pagina `NotificationDetail` recupera i dati della notifica da Firestore usando l'`notificationId`.
        *   **Prima Visualizzazione:** Se non è già stata letta dal tecnico corrente, l'app aggiorna il campo `readBy` nel documento della notifica su Firestore, aggiungendo/aggiornando l'entry per il `tecnicoId` corrente con `readAt: serverTimestamp()` e `tecnicoName`.
        *   Questo aggiornamento **innesca la rimozione del badge** sulla card HOME e il relativo aggiornamento.
        *   Viene mostrato il messaggio completo della notifica.
        *   In basso a destra, un'icona per "nascondere" la notifica (rimuoverla dalla vista utente, ma mantenendola nello storico Firestore se necessario, o pulendo lo storico).

## 8. Pagina CHECK-IN

Gestisce la registrazione della posizione del tecnico.

*   **Obiettivo:** Avere un solo record di presenza per tecnico al giorno, che viene aggiornato ad ogni check-in.
*   **Logica di Registrazione:**
    *   **ID Univoco del Documento:** Viene generato combinando `ID_TECNICO` e la `DATA_CORRENTE` nel formato `YYYY-MM-DD`. Es: `abc123xyz_2023-10-27`.
    *   **Operazione Firestore:** Utilizzare `setDoc` con l'ID univoco generato e l'opzione `{ merge: true }` per aggiornare il documento esistente o crearlo se non presente.
    *   **Dati Salvati:** `tecnicoId`, `tecnicoName`, `location` (es. coordinate), `timestamp` (aggiornato ad ogni check-in), `data` (per query).
*   **Interazione Utente:**
    *   Se il tecnico tenta di inviare un check-in quando ne ha già effettuato uno nello stesso giorno, l'app deve chiedere conferma prima di sovrascrivere il precedente.
    *   La pagina "Master" (presumibilmente, la pagina dove si vedono i check-in) si aggiornerà automaticamente grazie all'ascoltatore in tempo reale di Firestore.

## 9. Pagina IMPOSTAZIONI

Configurazione personalizzata dell'applicazione.

*   **Contenuto:**
    *   **Tabella Costi Orari/Giornalieri:** Permette al tecnico di modificare le tariffe per le varie tipologie di giornata (ordinaria, straordinaria, trasferta, ferie, ecc.).
    *   **Database Locale:** Le tariffe sono copiate e gestite nel database locale. Ogni modifica qui viene salvata localmente e i calcoli dei report (pagina REPORT MENSILI) utilizzeranno questi valori locali.
    *   **Guida all'App:** Una sezione informativa per l'utente.
    *   **Forza Aggiornamento App:** Un tasto per avviare manualmente un aggiornamento dell'app (utile per versioni mobile).

## 10. Gestione Offline e Sincronizzazione (Problemi Noti e Soluzioni Proposte)

Questo è l'ambito più critico e problematico attualmente.

*   **Obiettivo Principale:**
    *   Permettere la creazione, visualizzazione, modifica e condivisione di report **anche quando l'app è offline**.
    *   Utilizzare il database locale per le operazioni offline e sincronizzare con Firestore quando online.
*   **Problemi Attuali:**
    *   Difficoltà nella gestione consistente dei dati tra database locale (es. IndexedDB, SQLite, ecc.) e Firestore.
    *   Possibili conflitti di dati o perdite di informazioni durante la sincronizzazione.
    *   La logica per far lavorare la pagina "REPORT MENSILI" completamente offline basandosi solo sui dati locali è stata interrotta.
*   **Soluzioni Proposte per la Coda Offline:**
    1.  **Crea e Salva in Coda:** Quando l'app è offline e un nuovo report viene creato, invece di tentare una scrittura immediata (fallimentare) su Firestore, il report viene salvato in una coda locale dedicata.
    2.  **Indicatore di Coda:**
        *   Un chip/badge visibile nella HOME (card "I MIEI REPORT").
        *   Un chip/badge visibile nella pagina "I MIEI REPORT" (sopra il tasto "Nuovo Report").
        *   Ogni report nella lista della pagina "I MIEI REPORT" che è in coda (non ancora sincronizzato) avrà un'indicazione visiva (es. chip, colore).
    3.  **Modifica/Condivisione Offline:** I report in coda devono essere pienamente accessibili (lettura, modifica, condivisione) dalla pagina "I MIEI REPORT" anche senza connessione.
    4.  **Sincronizzazione Automatica:** Quando la connessione viene ripristinata, l'app deve tentare di sincronizzare i report in coda con Firestore. Questo processo deve gestire potenziali conflitti (es. se il report è stato modificato sia localmente che da un altro utente/dispositivo nel frattempo).
    5.  **Gestione Database Locale per Report Mensili:** La pagina "REPORT MENSILI" deve essere aggiornata per leggere correttamente i dati dall'entità locale dedicata ai report sincronizzati e non direttamente da Firestore. La logica di calcolo deve basarsi sui dati locali.

## 11. Gestione Errori e Debug

*   Monitorare attivamente gli errori di sintassi, di compilazione, di runtime e quelli relativi a Firestore/database locale.
*   Utilizzare strumenti di debug e logging per identificare e risolvere rapidamente i problemi.
*   In caso di errori persistenti (come quelli riscontrati con la gestione offline), dare priorità alla loro risoluzione.

## 12. Pianificazione Lavoro (Priorità)

1.  **Correzione Gestione Offline e Coda:** Implementare la gestione della coda per i report offline, inclusi gli indicatori visivi e la sincronizzazione.
2.  **Pagina REPORT MENSILI (Offline):** Assicurare che questa pagina funzioni correttamente leggendo dal database locale dei report sincronizzati.
3.  **Correzione Sezione NUOVO REPORT:** Assicurarsi che il salvataggio del report funzioni correttamente sia online che offline (andando in coda).
4.  **Risoluzione Errori di Importazione:** Affrontare e risolvere errori come quello riguardante `db` non esportato da `firebase.js`.
5.  **Notifiche:** Completare l'implementazione delle conferme di lettura e dell'aggiornamento dei badge.
6.  **Check-in:** Finalizzare la logica di aggiornamento unico giornaliero.
7.  **Impostazioni:** Assicurare la corretta gestione locale delle tariffe.

---
**Firma:** Assistente AI Operativo
***