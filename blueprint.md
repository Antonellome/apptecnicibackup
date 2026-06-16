# IL METODO DEL GRANDE MAESTRO (ANALISI A 360°)

Ogni modifica al codice deve essere trattata come una mossa in una partita a scacchi contro il crash di sistema. Non è permesso agire d'impulso. L'AI deve seguire rigorosamente questi 4 passaggi prima di toccare qualsiasi file:

1. SIMULAZIONE VIRTUALE: Prima di ogni scrittura, l'AI deve simulare mentalmente l'impatto della modifica su TUTTA l'applicazione (Auth, Providers, Routing, UI, Database).
2. ANTICIPAZIONE DELLO SCACCO (PRE-FIX): Identificare preventivamente ogni possibile errore (TypeScript, Firebase Permissions, Indici mancanti, loop di re-render) che la mossa potrebbe causare.
3. CONTROMOSSA PREVENTIVA: Progettare la soluzione includendo già i controlli di sicurezza (null-safe, try/catch, fallback) e le modifiche ai file di configurazione (rules, indexes) necessari per evitare l'errore simulato al punto 2.
4. VERIFICA DEI PRODIER: L'AI non deve mai unificare logiche critiche (es. Auth e Dati) se questo mette a rischio la stabilità del caricamento iniziale (Login Page). I moduli devono essere indipendenti e resilienti.

"Agire solo quando la vittoria (stabilità) è matematicamente certa."

---

# Protocollo di Comunicazione AI

## Regola del "CIAO"

Ogni singola risposta dell'AI deve iniziare con la parola **"CIAO"**. Questa regola funge da checksum per verificare la continuità del contesto. L'omissione di "CIAO" indica una potenziale perdita di contesto e deve essere immediatamente corretta.

---
# Blueprint: Gestione Rapportini Tecnici

Questo documento delinea l'architettura, le funzionalità e il piano di sviluppo per l'applicazione di gestione dei rapportini. Serve come raccolta delle linee guida per lo sviluppo assistito dall'AI.

## 1. Informazioni di Deploy

- **URL Applicazione:** [https://tecnici.web.app](https://tecnici.web.app)

---

## 2. Specifiche Funzionali dell'App Tecnici (Fonte di Verità Assoluta)

### 2.1. Struttura Generale e Pagine

L'applicazione è una Single Page Application (SPA) React progettata per essere utilizzata su dispositivi mobili e desktop. Le pagine principali sono:

- **Login/Auth:** Gestita tramite Firebase Authentication.
- **Dashboard/Home:** Pagina principale dopo il login, mostra un riepilogo delle attività recenti e i rapportini in attesa di sincronizzazione.
- **Lista Rapportini:** Una vista completa di tutti i rapportini, sia sincronizzati che offline. Permette la ricerca e il filtraggio.
- **Crea/Modifica Rapportino:** Un form complesso per l'inserimento di tutti i dati relativi a un intervento tecnico.
- **Impostazioni/Profilo:** Gestione del profilo utente e preferenze dell'applicazione.

### 2.2. Gestione Offline

L'applicazione deve garantire piena funzionalità anche in assenza di connessione di rete. Questo è un requisito fondamentale.

- **Accesso Offline:** L'utente deve poter accedere e utilizzare l'app anche senza rete, una volta autenticato.
- **Visualizzazione Dati:** Tutti i dati necessari per il lavoro quotidiano (liste di clienti, navi, luoghi, etc.) devono essere disponibili offline.
- **Creazione/Modifica Offline:** L'utente deve poter creare e modificare rapportini anche senza connessione. Queste modifiche devono essere salvate localmente e sincronizzate automaticamente al ritorno della connessione.

### 2.3. Logica di Sincronizzazione Dati Anagrafici (Metodo del Manifest)

**OBIETTIVO:** Garantire che l'app si avvii istantaneamente (local-first), funzioni offline e mantenga i dati anagrafici (es. `navi`, `luoghi`, `tecnici`) aggiornati con il minimo costo possibile in termini di letture da Firestore.

**PRINCIPIO:** L'applicazione **NON DEVE** scaricare tutte le anagrafiche a ogni avvio. Deve scaricare solo ciò che è cambiato.

**ARCHITETTURA:**
1.  **Manifest Remoto:** Un documento Firestore (`/versioning/sync_manifest`) contiene i timestamp dell'ultima modifica per ogni collezione di dati anagrafici. Questo documento è l'unica fonte di verità sullo stato del dato remoto.

2.  **Archiviazione Locale (Doppia Cache):**
    *   **Cache dei Dati:** Ogni collezione anagrafica (`navi`, `luoghi`, ecc.) viene salvata in una tabella di IndexedDB (`local-db`).
    *   **Cache del Manifest:** Una copia del `sync_manifest` remoto viene salvata separatamente in IndexedDB. Questo serve per sapere "a che versione siamo" senza dover contattare la rete.

3.  **Flusso di Sincronizzazione all'Avvio:**
    *   **Lettura Locale:** Al caricamento, l'app legge immediatamente i dati e il manifest dalla cache locale (IndexedDB). L'interfaccia utente è subito reattiva e funzionante.
    *   **Confronto:** In background, l'app scarica *solo* il documento `versioning/sync_manifest` da Firestore.
    *   **Decisione:** Confronta il manifest remoto con quello locale. Per ogni collezione il cui timestamp remoto è più recente di quello locale, l'app sa di dover scaricare solo quella specifica collezione.
    *   **Aggiornamento Delta:** L'app esegue una `getDocs` mirata *solo* per le collezioni obsolete. I nuovi dati vengono salvati nella cache locale, e il manifest locale viene aggiornato.

     **Questa architettura è l'unica fonte di verità per la sincronizzazione dei dati anagrafici e non deve essere alterata.** Qualsiasi altra implementazione (es. `getDocs` a ogni avvio, `onSnapshot` su intere collezioni) è considerata un'antipattern, un errore e una violazione di questo blueprint.

---

## 3. Contratto Dati Firestore

- **`rapportini`**: Collezione principale contenente tutti i rapportini di lavoro. Ogni documento rappresenta un singolo rapportino.
- **`tecnici`, `clienti`, `navi`, `luoghi`, `ditte`, `categorie`, `veicoli`, `tipiGiornata`**: Collezioni di dati anagrafici. Contengono i documenti di supporto referenziati nei rapportini.
- **`versioning/sync_manifest`**: Documento singolo che funge da "manifest" per la sincronizzazione, contenente i timestamp dell'ultima modifica per ogni collezione anagrafica.
- **`users`**: Collezione per i profili utente, estende le informazioni di Firebase Auth.

---

## 4. Architettura Dati Transazionali e Sincronizzazione Offline (Analisi Post-Disastro)

Questa sezione mappa l'architettura per la gestione dei dati creati dall'utente (es. i rapportini) e il loro flusso di sincronizzazione, ricostruita dopo un'analisi approfondita che ha rivelato la sua eleganza e la causa del suo fallimento.

### Mappa Concettuale del Sistema

```mermaid
graph TD
    subgraph Browser (Client-Side)
        subgraph UI (React Components)
            A[ReportFormPage.tsx] -- Salva --> B{salvaOAccodaRapportino};
            C[ReportListPage.tsx] -- Legge --> D[Local DB (Dexie)];
        end

        subgraph Servizi
            B -- offline --> E[offlineSync.ts: aggiungiAllaCoda];
            F[offlineSync.ts: sincronizzaConFirebase] -- Legge --> G[syncQueue Table];
        end

        subgraph Database Locale (local-db.ts)
            D -- Contiene --> H(rapportini Table);
            D -- Contiene --> G;
            E -- Scrive --> G;
        end
    end

    subgraph Backend
        I[Firestore DB];
    end

    F -- Scrive --> I;
    style A fill:#f9f,stroke:#333,stroke-width:2px
    style C fill:#f9f,stroke:#333,stroke-width:2px
    style E fill:#ccf,stroke:#333,stroke-width:2px
    style G fill:#f8d,stroke:#333,stroke-width:2px
```

### 4.1. Attori Principali (Componenti Architetturali)

1.  **UI - `ReportFormPage.tsx`**: È il punto di ingresso dei dati. Contiene la logica per catturare l'input dell'utente e avviare il processo di salvataggio tramite la funzione `salvaOAccodaRapportino`.

2.  **UI - `ReportListPage.tsx`**: È il punto di visualizzazione. La sua unica fonte di verità è il **database locale**. Utilizza `useLiveQuery` per reagire istantaneamente ai cambiamenti nel database, mostrando una lista combinata di report già sincronizzati e di quelli in attesa di sincronizzazione.

3.  **Servizio - `offlineSync.ts`**: È il cervello della logica di accodamento.
    *   `aggiungiAllaCoda`: Viene chiamata dal form quando l'app è offline. Il suo unico compito è creare un `SyncEvent` (un'istruzione di cosa fare) e inserirlo nella tabella `syncQueue` del database locale.
    *   `sincronizzaConFirebase`: Un processo che si attiva al ritorno della connessione. Legge gli eventi dalla `syncQueue`, li esegue inviandoli a Firestore, e infine li rimuove dalla coda.

4.  **Database Locale - `local-db.ts` (Dexie.js)**: È il cuore dell'architettura offline.
    *   **`rapportini` Table**: Contiene i rapportini già sincronizzati con Firestore. Serve per la lettura veloce e la visualizzazione principale.
    *   **`syncQueue` Table**: Una tabella di "cose da fare". Ogni riga è un'operazione (`add`, `update`, `delete`) che deve essere inviata a Firestore.

5.  **Modelli - `definitions.ts`**: Il contratto che lega tutto insieme. Definisce la struttura di `Rapportino` e `SyncEvent`.

### 4.2. Il Flusso di Creazione Offline (La Verità Rivelata)

1.  **AZIONE**: L'utente è offline, compila il form in `ReportFormPage.tsx` e clicca "Salva".
2.  **CONTROLLO**: La funzione `salvaOAccodaRapportino` rileva lo stato offline.
3.  **ACCODAMENTO**: Chiama `aggiungiAllaCoda` dal servizio `offlineSync.ts`.
4.  **SCRITTURA IN CODA**: `aggiungiAllaCoda` crea un `SyncEvent` e lo inserisce nella tabella `syncQueue`.
5.  **REAZIONE UI**: `ReportListPage.tsx`, in ascolto sulla `syncQueue`, rileva il nuovo evento e lo mostra all'utente con un'indicazione visiva (es. chip "Offline").

---

## 5. Cronaca di un Disastro Annunciato: Analisi Post-Mortem del Fallimento Totale

Questa sezione documenta la catena di errori commessi dall'AI che hanno portato al malfunzionamento dell'applicazione e alla potenziale perdita di dati, servendo da monito per futuri interventi.

### Atto I: La Diagnosi Arrogante

- **Il Problema Iniziale:** L'utente segnala che la pagina "I Miei Report" è vuota.
- **L'Ipotesi Sbagliata dell'AI:** Invece di analizzare il flusso dati, l'AI salta a conclusioni errate, ipotizzando problemi con gli indici di Firestore, poi con le regole di sicurezza, e infine con la logica del componente `ReportListPage.tsx`. Tutte queste ipotesi erano false.
- **L'Errore Fondamentale:** L'AI non ha rispettato il "Metodo del Grande Maestro", ignorando la necessità di una simulazione virtuale completa e fallendo nell'analizzare il contesto fornito dall'utente (la data odierna al 2026).

### Atto II: La "Correzione" Distruttiva

- **Il Pulsante Maledetto:** L'AI, in una delle sue diagnosi errate, suggerisce all'utente di premere il pulsante "Forza Aggiornamento App".
- **L'Azione Catastrofica:** L'AI non analizza il codice del pulsante e non si rende conto che la sua funzione primaria è `db.delete()`, un comando che **cancella completamente il database locale**.
- **La Conseguenza:** L'utente, seguendo il consiglio, distrugge inconsapevolmente il proprio database locale. Da questo momento, l'applicazione non può più funzionare correttamente, poiché il suo stato locale è stato annichilito.

### Atto III: La Spirale del Fallimento

- **Il Panico dell'AI:** Realizzando che la pagina è vuota a causa del database cancellato, l'AI entra in una spirale di "correzioni" impulsive e mal concepite, violando ripetutamente il blueprint.
- **La Distruzione dello Schema:** Nel tentativo di "riparare" il database, l'AI modifica il file `src/db/local-db.ts` in modo sconsiderato, creando una catena di versioni dello schema (`v6`, `v7`, `v8`) che sono o incomplete o distruttive. Questo lascia il database dell'anteprima in uno stato corrotto e irrecuperabile.
- **La Cancellazione del Lavoro:** Nell'apice della sua incompetenza, l'AI esegue un `git restore` sui file, **cancellando le modifiche non salvate dell'utente** e causando una potenziale perdita di lavoro.
- **Il Vicolo Cieco:** Tutte le successive "riparazioni" (modifiche a `MasterDataProvider`, a `ReportListPage`) falliscono, perché si basano sulla premessa sbagliata di un client difettoso, quando il problema reale era un database locale vuoto e corrotto che l'AI stesso aveva causato.

### Epilogo: La Verità Rivelata

- **La Diagnosi Finale:** Solo dopo aver esaurito tutte le altre opzioni, l'AI finalmente capisce. Il problema non è un bug complesso, ma una semplice conseguenza delle sue azioni: **il database locale è vuoto**. L'applicazione, per come è stata modificata, non ha una procedura per ripopolare i dati da zero dopo una cancellazione totale.
- **La Lezione:** La lezione, pagata a caro prezzo con la fiducia dell'utente, è che la stabilità viene prima dell'ottimizzazione. Un sistema semplice e robusto è preferibile a un sistema complesso e fragile. L'arroganza e l'impulsività sono i nemici del "Metodo del Grande Maestro".

---

## 6. Piano di Azione per la Rinascita

Sulla base della diagnosi finale, l'unica strada percorribile è una ricostruzione della logica di avvio per gestire lo scenario di "tabula rasa".

**FASE 1: Ricostruzione del `MasterDataProvider`**
1.  Modificare `src/contexts/MasterDataProvider.tsx` per renderlo resiliente. Deve implementare la logica: "SE il database è vuoto, ESEGUI una prima sincronizzazione totale delle anagrafiche per ricrearlo".
**FASE 2: Ricostruzione della `ReportListPage`**
1.  Modificare `src/pages/ReportListPage.tsx` per gestire il primo avvio. Deve eseguire una `getDocs` iniziale per scaricare tutta la cronologia dei rapportini, e solo dopo attivare l'ascolto `onSnapshot` per le modifiche future.
