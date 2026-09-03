# Blueprint di Progetto e Piano di Lavoro
Questo documento è la nostra unica fonte di verità. Contiene la descrizione del progetto, le regole di ingaggio, la cronologia delle azioni e il piano di lavoro attivo. **Questo file non deve essere sovrascritto, ma aggiornato.**

## 1. Regola di Comunicazione Fondamentale
**CIAO:** Ogni mio commento in questa chat, senza eccezioni, deve iniziare con la parola "CIAO".

## 2. Descrizione del Progetto
*   **App Mobile (PWA) per Tecnici:** L'applicazione principale che stiamo debuggando.
*   **App Web (Back-office):** Un'applicazione web per il personale d'ufficio.

## 3. Le Cloud Functions Corrette
Questa è la lista **ufficiale e completa** delle Cloud Functions disponibili:
*   `testcors`, `saveFCMToken`, `getAllRapportiniForSync`, `updateRapportino`, `createRapportino`, `sync_manifest`, `deleteDocumento`, `syncAnagrafica`, `deleteRapportino`, `updateDocumento`, `createCheckin`, `syncAllAnagrafiche`, `admin_getAllUsers`, `getCheckinsUpdates`, `amministrazione_gestisciUtenti`, `createDocumento`, `adminGetAllRapportini`

## 4. Cronologia e Lezioni Apprese (Iterativa)

Questa sezione documenta i miei tentativi, i miei errori e le lezioni apprese. È la cronaca di un debug complesso.

### Tentativo 1: Il "Cervello Sdoppiato" (Diagnosi Corretta, Soluzione Errata)
*   **Sintomo:** Loop di caricamento infinito.
*   **Diagnosi:** Conflitto tra due sistemi di sincronizzazione che gestivano lo stato di `loading` globale.
*   **Azione ERRATA:** Centralizzazione forzata nel `MasterDataProvider`, peggiorando il problema.
*   **Lezione Appresa:** Rispettare la **separazione delle responsabilità**. Un provider per la sincronizzazione, un altro per la presentazione dei dati.

### Tentativo 2: La Ricostruzione Architetturale (Quasi Successo)
*   **Sintomo:** Pagina nera e crash dell'app all'avvio (`Cannot read properties of undefined (reading 'toArray')`).
*   **Diagnosi:** Dopo aver ricostruito correttamente l'architettura dei provider (`GlobalDataProvider` + `MasterDataProvider` silenzioso), il crollo avveniva a un livello più profondo: il database locale (Dexie).
*   **Azione ERRATA (mia):** Avevo costruito la nuova architettura dando per scontato che il database fosse definito correttamente. Il file `src/db/local-db.ts` presentava due errori critici:
    1.  **Versioning Distruttivo:** L'uso di `version(X).stores()` multipli cancellava le tabelle delle versioni precedenti ad ogni aggiornamento.
    2.  **Nomi Incoerenti:** La tabella dei check-in era chiamata `checkin_giornalieri` nel DB ma l'UI la cercava come `checkins`.
*   **Lezione Appresa:** Le fondamenta sono tutto. Un'architettura perfetta non può reggere su uno schema di database rotto o inconsistente.

### Tentativo 3: La Correzione delle Fondamenta (VITTORIA)
*   **File:** `src/db/local-db.ts`
*   **Azione Correttiva:** Ho riscritto la definizione dello schema di Dexie per essere **unica, completa e corretta**.
    *   Utilizzo di una **singola chiamata `this.version(15).stores({...})`** per dichiarare tutte le tabelle in una volta sola, prevenendo cancellazioni accidentali.
    *   **Coerenza dei nomi** (`checkins` invece di `checkin_giornalieri`).
*   **Risultato:** **SUCCESSO.** L'applicazione si carica, l'autenticazione funziona, la sincronizzazione viene completata con successo e i dati vengono visualizzati. Il problema è stato risolto alla radice.

## 5. Stato Finale del Progetto
**OBIETTIVO RAGGIUNTO.** Il loop di caricamento infinito è stato debellato. L'architettura software è stata riparata, resa più robusta e disaccoppiata. Lo schema del database locale è stato corretto e reso stabile.
