# Blueprint dell'Applicazione: R.I.S.O. App Tecnici

## 1. Visione Generale

L'applicazione **R.I.S.O. (Report Individuali Sincronizzati Online) App Tecnici** è uno strumento gestionale progettato per permettere ai tecnici di compilare e monitorare i loro rapportini di lavoro giornalieri in modo efficiente, sia da postazione fissa che da mobile.

Il branding "by AS" deve essere visibile ma discreto, separato dagli elementi principali dell'interfaccia.

---

## 2. Specifiche dell'Interfaccia Utente (UI)

### 2.1 Dashboard Principale

La dashboard è la pagina principale e deve essere progettata per un accesso rapido e intuitivo alle funzionalità chiave.

*   **Intestazione:**
    *   Non deve mostrare un titolo generico. Al suo posto, visualizzerà il **nome e cognome del tecnico attualmente loggato**.
    *   Il titolo ufficiale dell'app, "R.I.S.O. App Tecnici", e il suo sottotitolo, "Report Individuali Sincronizzati Online", saranno usati come titolo della finestra del browser e in altre aree di branding, ma non come intestazione principale della dashboard.

*   **Layout:**
    *   La pagina deve contenere una **griglia 2x3** composta da **sei card (o tab) quadrate**.
    *   La disposizione sarà su tre righe, con due card affiancate per ogni riga.
    *   Ogni card rappresenterà una sezione principale dell'applicazione (es. "Crea Nuovo Report", "Lista Rapportini", "Riepilogo Presenze", ecc.).

### 2.2 Form di Creazione Nuovo Report

Il form per l'inserimento di un nuovo rapportino deve essere pre-configurato per minimizzare l'input manuale e ridurre gli errori.

*   **Campo Tecnico:**
    *   Il campo che identifica il tecnico deve essere **automaticamente compilato** con il nome dell'utente loggato.
    *   Questo campo **non deve essere modificabile**.

*   **Campi Orario:**
    *   **Input Utente:** Tutti i campi per l'inserimento di orari (ora inizio, ora fine, ore lavorate) **non devono essere campi di testo libero**. Devono utilizzare un **componente selettore di orario (time picker)** per garantire un formato dati consistente.
    *   **Valori Predefiniti:**
        *   Ora di inizio: **07:30**
        *   Ora di fine: **16:30**
        *   Ore lavorate: **8**

*   **Campo Pausa:**
    *   Il campo per la pausa pranzo deve essere un **menu a tendina (dropdown)**.
    *   **Opzioni:** Le uniche scelte disponibili saranno **0, 30, 60** minuti.
    *   **Valore Predefinito:** **60** minuti.

---

## 3. Funzionalità Core

*   **Autenticazione:** Accesso sicuro per i tecnici tramite Firebase Authentication.
*   **Gestione Rapportini:** Creazione e visualizzazione dello storico dei rapportini.
*   **Riepilogo Presenze Mensile:** Una vista a calendario/tabella che marca come "Assenza Ingiustificata" i giorni lavorativi senza un rapportino associato.
*   **Notifiche:** Un centro notifiche per comunicazioni dirette all'utente.
*   **Impostazioni:** Pagina per la gestione del profilo utente.

---

## 4. Stato Attuale e Prossimi Passi

**Stato:** Riavvio dello sviluppo dopo una fase di correzione critica.

**Obiettivo Immediato:** Implementare le nuove specifiche per la Dashboard e per il Form di creazione rapportino, come dettagliato nella sezione 2. Questo ha la massima priorità.
