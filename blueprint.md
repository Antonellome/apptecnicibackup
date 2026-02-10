# R.I.S.O. - Blueprint Definitivo (Aggiornamento Utente)

**Nota: Questo è l'ultimo e unico aggiornamento descrittivo dell'app tecnici da prendere in considerazione, come da richiesta utente.**

---

*Citazione dalla richiesta utente:*
> "hai fatto un lavoro di merda, non hai seguito le mie richieste e mi ritrovo nuovamente con un'app inutile. ricominciamo."

---

## Specifiche dell'Applicazione

1.  **Dashboard/Home:** Deve essere costituita da 4 tab in griglia 2x2 di uguale dimensioni. Devono essere:
    *   Nuovo report
    *   Report
    *   Report mensili
    *   Note

2.  **App Bar (in alto):** Mantenere un'appbar con:
    *   Titolo: "R.I.S.O. App Tecnici"
    *   Sottotitolo: "Report Individuali Sincronizzati Online"
    *   Nome del tecnico loggato.

3.  **Icone (in alto a destra):**
    *   Icona tema chiaro/scuro
    *   Impostazioni
    *   Logout

4.  **Pagina Login:**
    *   Titolo e sottotitolo.

5.  **Form "Nuovo Report":** Deve avere tutti i campi presi da database con:
    *   **(Dati Principali):**
        *   Data
        *   Tecnico loggato non modificabile (tecnico scrivente)
    *   **(Calcolo Ore):**
        *   Switch di selezione:
            *   Ore inizio-fine-pausa (default 7:30-16:30-60)
            *   Ore lavorate (default 8)
    *   **(Riferimenti):**
        *   Tipo giornata
        *   Veicolo
        *   Nave
        *   Luogo
    *   **(Dettagli Intervento):**
        *   Breve descrizione
        *   Lavoro eseguito
        *   Materiali impiegati
    *   **(Altri Tecnici):**
        *   Aggiungi tecnici
    *   **Nota:** Tutti i campi orari da scegliere da selettore, no campo testo.

6.  **Pagina Report:**
    *   Lista dei report.
    *   Campo di ricerca intelligente per data, nave, luogo.

7.  **Pagina Report Mensili:**
    *   Creazione della lista report mensile (scelta del mese).
    *   Campi da inserire: tutti quelli del form tranne lavoro eseguito, materiali, veicolo, tecnici aggiunti.
    *   Una sezione per il calcolo dei guadagni mensili in base alle giornate e ore lavorate.
    *   I costi delle giornate e ore da prelevare in locale da una sezione in "Impostazioni".

8.  **Pagina Note:**
    *   Visualizzazione delle note in arrivo e in uscita.
    *   Creazione con titolo e corpo della nota.
    *   Dati da prelevare dal database per i formati variabili ecc.
    *   Dovrà inviare e ricevere note dall'app master.

9.  **Pagina Impostazioni:**
    *   Info del tecnico.
    *   Dettagli costi orari settabili per giornate e costo orario per i calcoli personali.
    *   Sezione per il salvataggio in locale dei dati e dei report mensili se possibile.

10. **Colori dell'App:**
    *   Sfondo dell'app: nero o blu notte (come l'attuale).
    *   Testi: blu (come attualmente) e bianco.
    *   Icone: bianche.
    *   Colore supplementare: un grigio.
