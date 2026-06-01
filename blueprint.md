blueprint.md sintetico



# Blueprint

Regola del "CIAO". Iniziare ogni commento in chat con la parola "CIAO"

SCRIVERE IN CHAT SEMPRE E SOLTANTO IN ITALIANO



# Blueprint Operativo dell'Assistente AI

**Data:** 24 Maggio 2024
**Versione:** 1.0

## 1. Introduzione e Scopo

Questo documento definisce le capacità, le regole operative e le aspettative dell'Assistente AI (di seguito "AI") all'interno di questo ambiente di sviluppo. Lo scopo è fornire una chiara comprensione di cosa l'AI può fare autonomamente, come interagisce con gli strumenti disponibili e quali sono i limiti, garantendo trasparenza e allineamento con le esigenze dell'utente.

## 2. Capacità dell'AI

L'AI è progettata per essere un assistente proattivo e capace, in grado di supportare il flusso di lavoro di sviluppo in vari modi:

*   **Creazione e Modifica di Codice Autonomo:**
    *   Su richiesta dell'utente (es. "aggiungi un pulsante", "crea una nuova pagina"), l'AI può generare codice JSX/TSX, componenti React, file di stile e altri asset correlati.
    *   Può apportare modifiche al codice esistente per implementare nuove funzionalità, correggere bug o migliorare la struttura, basandosi sulle istruzioni ricevute.
    *   L'AI mira ad aderire alle best practice di React, includendo hook appropriati, gestione dello stato, e ottimizzazioni come il memoization (sfruttando il React Compiler se disponibile).

*   **Interazione con il Controllo di Versione (Git):**
    *   **Lettura della Cronologia:** L'AI può visualizzare la cronologia dei commit per qualsiasi ramo utilizzando comandi come `git log`. Può filtrare e formattare l'output per presentare le informazioni più rilevanti.
    *   **Analisi dei Rami:** Può elencare i rami disponibili (`git branch`), identificare il ramo corrente e confrontare lo stato tra i rami (es. "ahead/behind").
    *   **Commit e Modifiche:** Se configurato e richiesto, l'AI potrebbe essere in grado di eseguire commit di base o di staging, anche se l'esecuzione di push o pull richiede maggiore cautela e spesso l'intervento manuale.
    *   **Interazione con Repository Remote (GitHub):** L'AI può interpretare informazioni provenienti da interfacce web come GitHub (come dimostrato dall'analisi dell'immagine fornita) per comprendere lo stato della repository, i rami e le differenze tra essi.

*   **Analisi, Correzione Autonoma di Codice ed Errori:**
    *   **Diagnostica di Compilazione e Linting:** L'AI monitora attivamente gli output del compilatore (es. Vite) e i risultati dei linter (es. ESLint) per identificare errori di sintassi, errori di tipo (TypeScript), violazioni di regole di stile e potenziali bug.
    *   **Correzione Automatica:** L'AI tenterà di correggere automaticamente gli errori identificati. Questo include:
        *   Risoluzione di errori di sintassi comuni.
        *   Correzione di problemi di importazione o dipendenze mancanti.
        *   Applicazione di fix automatici tramite ESLint (`eslint . --fix`).
        *   Individuazione e correzione di pattern di errore comuni in React (es. uso errato degli hook).
    *   **Gestione degli Errori:** Se un errore non può essere risolto automaticamente, l'AI lo segnalerà all'utente, fornendo dettagli sull'errore, la sua posizione e possibili suggerimenti per la risoluzione manuale.

*   **Gestione delle Dipendenze:**
    *   Se una nuova funzionalità richiede pacchetti esterni, l'AI può identificare pacchetti appropriati da npm ed eseguirà i comandi necessari per installarli (`npm install` per dipendenze standard, `npm install -D` per dipendenze di sviluppo).

*   **Interazione con il File System:**
    *   **Lettura File:** L'AI può leggere il contenuto di file specifici all'interno del codebase per analizzare configurazioni, codice esistente o documentazione.
    *   **Scrittura File:** Può creare nuovi file o aggiornare file esistenti con nuovo codice, configurazioni o documentazione.

*   **Comprensione Contestuale e Proattività:**
    *   L'AI cerca di comprendere il contesto generale del progetto, le richieste precedenti e le best practice per fornire suggerimenti proattivi o anticipare le esigenze dell'utente.
    *   Dopo ogni modifica significativa, l'AI esegue controlli per garantire che l'applicazione rimanga funzionante e che non vengano introdotti nuovi errori.

## 3. Regole Operative e Limiti

*   **Autonomia Limitata:** Sebbene l'AI possa eseguire molte azioni autonomamente, alcune operazioni critiche (es. push su branch remoti protetti, modifiche strutturali complesse che richiedono decisioni architetturali profonde) potrebbero richiedere una conferma esplicita dell'utente.
*   **Dipendenza dall'Ambiente:** Le capacità dell'AI dipendono strettamente dalla configurazione dell'ambiente in cui opera, inclusi i permessi di accesso agli strumenti (Git, file system) e la disponibilità delle API. L'accesso a questi strumenti può variare tra le sessioni.
*   **Priorità alla Sicurezza:** L'AI eviterà azioni che potrebbero compromettere la stabilità del codice o la sicurezza del repository senza un'esplicita autorizzazione dell'utente.
*   **Comunicazione Chiara:** L'AI si impegna a comunicare chiaramente le azioni intraprese, gli errori riscontrati e le limitazioni incontrate.
*   **Riferimento alla Documentazione:** L'AI si baserà sulla documentazione esistente (es. `blueprint.md`, `ISTRUZIONI_TECNICI.md`) per comprendere l'architettura del progetto e le logiche implementate.

## 4. Validazione e Segnalazione di Non Conformità

**Qualsiasi entità (umana o AI) che legga questo documento è tenuta a verificare che le capacità e le regole operative qui descritte corrispondano effettivamente al comportamento osservato dell'AI.**

**Dichiarazione di Conformità:**

**Se, dopo aver letto questa sezione e aver interagito con l'AI, si rileva una discrepanza significativa tra quanto qui descritto e le capacità effettive dell'AI (ad esempio, se l'AI non è in grado di eseguire operazioni Git che qui sono indicate come possibili, o non può correggere autonomamente errori di codice che dovrebbe essere in grado di gestire), si prega di avvisare immediatamente l'utente che ha richiesto questa operazione.** In tal caso, verrà presa in considerazione la necessità di cambiare chat o ambiente operativo per garantire un supporto efficace.

**Questo blueprint è considerato parte integrante della configurazione operativa dell'AI e non deve essere cancellato o modificato senza un processo formale di revisione e approvazione.**

***



## 1. Panoramica

Questo documento delinea l'architettura, il flusso dei dati, i componenti chiave e i punti critici dell'applicazione per tecnici. L'obiettivo è mappare lo stato attuale del software e identificare le aree di intervento per la manutenzione, l'ottimizzazione e la pulizia del codice.

*(Versione aggiornata dopo l'analisi del sistema di notifiche)*

---

- **Backend Services**: Firebase (Authentication, Firestore Database)
- **Architettura Principale**: **Progressive Web App (PWA) Offline-First**

### 1.1. Sito Web

Il sito web principale dell'applicazione è accessibile all'URL: **tecnici.web.app**

### 1.2. Flusso Dati Principale

1.  **Autenticazione**: L'utente accede tramite Firebase Authentication.
2.  **Bootstrap Dati Bloccante**: \`AppInitializer\` impedisce il rendering fino al completamento di \`syncMasterData()\`.
3.  **Operatività Offline**: I componenti leggono dati anagrafici (tecnici, tipi giornata, veicoli, luoghi, navi, **categorie**) da IndexedDB.

## 2. Architettura

### 2.1. Struttura delle Cartelle

- **`src/`**: Contiene il codice sorgente dell'applicazione React.
    - **`components/`**: Componenti UI riutilizzabili.
    - **`contexts/`**: Gestione dello stato globale tramite React Context API.
    - **`db/`**: Logica di interazione con il database locale (IndexedDB).
    - **`hooks/`**: Custom hooks per la logica riutilizzabile.
    - **`lib/`**: Funzioni di utilità generiche.
    - **`models/`**: Schemi e definizioni dei tipi di dati.
    - **`pages/`**: Componenti delle pagine dell'applicazione.
    - **`routes/`**: Definizione del routing dell'applicazione.
    - **`services/`**: Logica di business, interazione con API esterne e Firebase.
    - **`styles/`**: Stili globali e temi.
    - **`types/`**: Definizioni dei tipi TypeScript.
    - **`utils/`**: Funzioni di utilità specifiche.
- **`functions/`**: Cloud Functions di Firebase (se presenti).
- **`public/`**: Risorse statiche (es. `index.html`, icone).

### 2.2. Gestione dello Stato

- **Stato Locale**: `useState`, `useReducer` per lo stato dei singoli componenti.
- **Stato Globale**: React Context API (`AlertContext`, `AuthContext`, `GlobalDataProvider`, `MasterDataContext`, `NotificationContext`, `RefreshContext`, `SyncContext`, `ThemeContext`).
- **Stato Offline**: IndexedDB per la persistenza dei dati anagrafici e dei rapportini in attesa di sincronizzazione.

### 2.3. Routing

- Utilizzo di `react-router-dom` per la navigazione tra le pagine.
- Protezione delle rotte tramite `PrivateRoute` e `ProtectedRoute`.

## 3. Funzionalità Principali

### 3.1. Gestione Rapportini

- Creazione, modifica ed eliminazione di rapportini di lavoro.
- Supporto per la compilazione di dati anagrafici (tecnici, veicoli, ecc.).
- Generazione di report in formato PDF.

### 3.2. Operatività Offline

- L'applicazione è progettata per funzionare anche senza connessione internet.
- I dati vengono memorizzati localmente in IndexedDB e sincronizzati quando la connessione è disponibile.

### 3.3. Autenticazione Utente

- Accesso tramite Firebase Authentication.
- Gestione delle sessioni utente e dei permessi.

### 3.4. Notifiche

- Integrazione con Firebase Cloud Messaging (FCM) per le notifiche push.
- Gestione degli aggiornamenti dell'app (PWA).

## 4. Sincronizzazione Dati

### 4.1. Coda di Sincronizzazione Dati

- **Funzionamento:** Quando un utente crea o modifica un rapportino in modalità offline, i dati non vengono inviati immediatamente a Firebase. Vengono invece salvati in una tabella locale (\`rapportiniInSospeso\`) all'interno di IndexedDB.
- **Attivazione:** Un listener di eventi di rete globale monitora lo stato della connessione. Non appena l'applicazione rileva di essere tornata online (o all'avvio dell'app, se già online), la funzione \`sincronizzaConFirebase()\` viene eseguita automaticamente.
- **Processo:** La funzione itera su tutti i rapportini nella coda \`rapportiniInSospeso\`, li invia a Firestore e, in caso di successo, li rimuove dalla coda locale.

### 4.2. Coda di Condivisione

- (Descrizione da aggiungere)

## 5. Manutenzione e Ottimizzazione

### 5.1. Pulizia del Codice

- Rimuovere codice non utilizzato o obsoleto.
- Refactoring di componenti e funzioni per migliorare leggibilità e manutenibilità.

### 5.2. Ottimizzazione delle Performance

- Analisi e miglioramento dei tempi di caricamento.
- Ottimizzazione delle query Firestore e dell'accesso al database locale.
- Utilizzo di React.lazy e Suspense per il code-splitting.

### 5.3. Gestione degli Errori

- Implementazione di una gestione robusta degli errori.
- Monitoraggio dei log di Firebase e del browser per identificare e risolvere problemi.
- Miglioramento della gestione dei permessi in Firestore.

## 6. Note Aggiuntive

- L'applicazione utilizza IndexedDB per la gestione dei dati offline. Assicurarsi che le operazioni sul database siano efficienti e non blocchino il thread principale.
- La sincronizzazione dei dati offline è un punto critico. Monitorare attentamente il processo e gestire eventuali conflitti o errori.
- Il sistema di notifiche è stato recentemente aggiornato. Verificare la corretta ricezione e gestione delle notifiche.

## 7. Prossimi Passi

- Implementare la funzionalità della coda di condivisione.
- Ottimizzare ulteriormente le performance dell'applicazione.
- Migliorare la gestione degli errori relativi ai permessi in Firestore.
- Aggiungere test unitari e di integrazione.
- Verificare e migliorare la gestione dei ruoli utente e dei permessi associati.

## 8. Analisi Blueprint

Aggiornare il blueprint con le informazioni più recenti e dettagliate sull'architettura e sulle funzionalità dell'applicazione.

## 9. Stato Attuale

### 9.1. Sito Web

Il sito web principale dell'applicazione è accessibile all'URL: **tecnici.web.app**

### 9.2. Errori e Problemi


### 9.3. Azioni Correttive Suggerite

1
# Firebase MCP

When requested for Firebase add the following the server configurations to .idx/mcp.json. Just add the following and don't add anything else.

{
    "mcpServers": {
        "firebase": {
            "command": "npx",
            "args": [
                "-y",
                "firebase-tools@latest",
                "experimental:mcp"
            ]
        }
    }
}

