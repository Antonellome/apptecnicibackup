# Documentazione Definitiva: Pagina Presenze (Check-in) - V2.5

**Data Ultimo Aggiornamento:** 31/07/2024

Questo documento è la fonte di verità completa per la pagina `CheckinPage.tsx`. Descrive in dettaglio il layout, la logica di stato e l'architettura, secondo le regole di business V2.5, che implementano il flusso di lavoro richiesto dall'utente per una maggiore flessibilità.

---

## 1. Layout Visivo e Componenti

Invariato.

---

## 2. Modello dei Dati e Stati Applicativi

Invariato.

---

## 3. Logica di Stato Dettagliata per Componente (V2.5) - LOGICA CORRETTA

Questa tabella rappresenta la logica di business **definitiva** come richiesta dall'utente.

| Componente (Alias)      | Condizione `disabled` (Risulterà SPENTO se...)             | Motivazione Funzionale                                                                    |
| ----------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **Inizio Giornata** (`ON`)  | `giornataIniziata`                                         | Non si può iniziare una giornata già attiva.                                             |
| **Fine Giornata** (`OFF`)   | `!giornataIniziata`                                        | Si può terminare la giornata solo se è stata iniziata.              |
| **Entrata** (`IN`)        | `!giornataIniziata` **o** `!!inLuogo`                        | Si può entrare solo se la giornata è attiva e non si è già dentro un altro luogo. |
| **Uscita** (`OUT`)        | `!giornataIniziata` **o** `!inLuogo`                            | Si può uscire solo se la giornata è attiva e si è effettivamente dentro un luogo.       |
| *Tutti i Bottoni*       | `!!loading`                                                | Bloccati durante un'operazione per evitare doppi click.                                   |

---

## 4. Logica Operativa Speciale

### 4.1. Gestione "Entrata" senza selezione

Questa è la modifica chiave della V2.5 per venire incontro alle tue richieste.

*   **Scenario:** L'utente ha iniziato la giornata e il pulsante "Entrata" è correttamente **attivo**. L'utente clicca "Entrata" **senza aver prima selezionato un luogo o una nave** dal menu a tendina.
*   **Comportamento del Sistema:**
    *   L'operazione viene immediatamente bloccata.
    *   Nessun dato viene scritto nel database.
    *   L'interfaccia mostra un messaggio di errore chiaro ("Per entrare, devi prima selezionare una Nave o un Luogo dal menu.") che ti guida all'azione corretta, senza crashare o bloccare l'app.

### 4.2. Fine Giornata con Uscita Automatica

Questa logica è rimasta invariata. Se termini la giornata mentre sei ancora `inLuogo`, viene creato un evento di `check_out_luogo` automatico per garantire la coerenza dei dati.
