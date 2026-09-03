# Blueprint di Progetto e Piano di Lavoro
Questo documento è la nostra unica fonte di verità. Contiene la descrizione del progetto, le regole di ingaggio, la cronologia delle azioni e il piano di lavoro attivo. **Questo file non deve essere sovrascritto, ma aggiornato.**

## 1. Regola di Comunicazione Fondamentale
**CIAO:** Ogni mio commento in questa chat, senza eccezioni, deve iniziare con la parola "CIAO".

## 2. Descrizione del Progetto
*   **App Mobile (PWA) per Tecnici:** L'applicazione principale che stiamo analizzando e migliorando.
*   **App Web (Back-office):** Un'applicazione web per il personale d'ufficio.

## 3. Le Cloud Functions Corrette
Questa è la lista **ufficiale e completa** delle Cloud Functions disponibili, come confermato il 29/07/2024:
*   `testcors`, `saveFCMToken`, `getAllRapportiniForSync`, `updateRapportino`, `createRapportino`, `sync_manifest`, `deleteDocumento`, `syncAnagrafica`, `deleteRapportino`, `updateDocumento`, `createCheckin`, `syncAllAnagrafiche`, `admin_getAllUsers`, `getCheckinsUpdates`, `amministrazione_gestisciUtenti`, `createDocumento`, `adminGetAllRapportini`

## 4. Cronologia e Lezioni Apprese
Questa sezione documenta il percorso che ci ha portato alla risoluzione del bug principale, preservando le lezioni apprese per il futuro.

*   **Lezione 1 (Separazione delle Responsabilità):** Un provider per la sincronizzazione, un altro per i dati.
*   **Lezione 2 (Le Fondamenta Prima di Tutto):** Un'architettura robusta richiede uno schema di database (Dexie) corretto e coerente.
*   **Lezione 3 (Un Passo alla Volta):** Approccio iterativo per evitare il sovraccarico delle risorse e garantire la stabilità.

## 5. Stato del Progetto e Obiettivi Attuali
L'obiettivo iniziale - la risoluzione del loop di caricamento infinito - è stato **RAGGIUNTO**. L'architettura software e il database locale sono ora stabili.

L'obiettivo attuale è passare da un codice *funzionante* a un codice *di qualità*: **Consolidare la documentazione, eliminare il debito tecnico e preparare il codebase per future evoluzioni.**

## 6. Piano di Lavoro Attivo

Questo piano riflette il nostro nuovo approccio iterativo e robusto.

### Fase 1: Analisi Sistematica del Codice (COMPLETATA)
*   **Azione Eseguita:** Ho analizzato, file per file, tutti i componenti presenti in `src/pages`.
*   **Risultato:** Abbiamo creato il `registro.md`, un documento di verità che mappa l'architettura frontend, le funzionalità di ogni pagina e il debito tecnico iniziale.

### Fase 2: Pulizia del Debito Tecnico (IN CORSO)
*   **Obiettivo:** Rimuovere codice morto e componenti UI superflui per aumentare la manutenibilità e la pulizia del progetto.
*   **Azioni Eseguite:**
    *   **RISOLTO:** Incoerenza nella sintassi del componente `<Grid>` di Material-UI.
    *   **RISOLTO:** Eliminato il file di codice morto `src/pages/RapportiniList.tsx`.
    *   **IN CORSO:** Eliminazione del file di codice morto `src/pages/NotesPage.tsx`.
*   **Prossima Azione:** Rimuovere il pulsante "Cerca" non funzionante da `src/pages/AttendancesPage.tsx`.

### Fase 3: Consolidamento della Documentazione (SUCCESSIVA)
*   **Obiettivo:** Far convergere tutte le fonti di documentazione sparse (`calcoli.md`, etc.) in un unico, autorevole documento di progetto: il `registro.md`.
*   **Azione:** Leggeremo i file rimanenti uno per uno e integreremo le informazioni pertinenti, eliminando le discrepanze.

### Fase 4: Risoluzione Bug Critici (FUTURA)
*   **Obiettivo:** Una volta che il codebase sarà pulito e completamente documentato, affronteremo i bug funzionali rimanenti.
*   **Priorità #1:** Il sistema di notifiche, che attualmente non funziona a causa delle Cloud Functions mancanti.
