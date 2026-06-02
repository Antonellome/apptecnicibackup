# Blueprint Operativo dell'Assistente AI

**Versione:** 1.1

## 1. Introduzione e Scopo

Questo documento definisce le capacità e le regole operative dell'AI, con l'obiettivo di garantire trasparenza, efficienza e allineamento con le esigenze dell'utente. L'AI deve attenersi scrupolosamente a questo blueprint.

## 2. Regole Fondamentali

- **Seguire il Blueprint:** Il blueprint è la fonte di verità. L'AI deve leggerlo all'inizio di ogni sessione e aggiornarlo costantemente per tracciare ogni modifica funzionale o tecnica.
- **Codice Pulito e Funzionante:** L'AI è responsabile della qualità del codice che produce. Ogni modifica deve essere testata e non deve introdurre errori di compilazione o runtime.
- **Comunicazione Chiara:** L'AI deve comunicare le sue azioni in modo chiaro e conciso, ammettendo immediatamente eventuali errori e proponendo un piano di remediation.

---

## Registro Attività e Piano di Lavoro

### Attività Completate

1.  **Fix - Pagina Impostazioni (Tariffe):**
    - **Problema:** Il pulsante "Salva" si attivava solo dopo aver perso il focus dal campo di input.
    - **Soluzione:** Implementato un meccanismo (`onDirty`, `SET_DIRTY`) per abilitare immediatamente il pulsante non appena l'utente inizia a digitare nel campo, migliorando il feedback visivo.

2.  **Fix - Pagina Check-in (Multiplo):**
    - **Problema:** Un blocco `window.confirm` non funzionante impediva di effettuare un secondo check-in nello stesso giorno.
    - **Soluzione:** Rimosso il blocco di conferma. La logica di sovrascrittura è ora gestita correttamente dall'opzione `{ merge: true }` di Firestore, permettendo aggiornamenti fluidi della postazione di lavoro.

### In Corso - Debito Tecnico

1.  **Migrazione da MUI Grid v1 a Grid v2:**
    - **Obiettivo:** Allineare l'intero progetto alla versione più recente del componente `Grid` di Material-UI (v7), eliminando il `GridLegacy` deprecato per migliorare la stabilità e la manutenibilità.
    - **Stato:** In esecuzione.
    - **Azione Immediata:** Eseguire il codemod ufficiale fornito da MUI per automatizzare la migrazione su tutta la codebase.
    - **Comando da Eseguire:**
      ```sh
      npx @mui/codemod@next v7.0.0/grid-props src/
      ```
    - **Riferimento:** Documentazione ufficiale MUI sulla migrazione a Grid v2.

### Prossimi Passi

- **Implementazione Coda di Condivisione:** Progettazione e sviluppo della funzionalità per la condivisione massiva di documenti (es. rapportini PDF).
- **Ottimizzazione Performance:** Analisi e miglioramento delle performance generali dell'applicazione.

---

## Architettura e Funzionalità Principali

*(Questa sezione riassume l'architettura PWA Offline-First basata su React, Firebase e IndexedDB. Per i dettagli, fare riferimento alle sezioni specifiche del codice sorgente.)*

- **Backend:** Firebase (Authentication, Firestore, Cloud Messaging)
- **Frontend:** React, Vite, Material-UI
- **Database Locale:** IndexedDB (tramite Dexie.js)
- **Principio Chiave:** L'applicazione garantisce l'operatività offline, sincronizzando i dati con Firestore non appena la connessione torna disponibile.
