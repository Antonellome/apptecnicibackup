# REGOLA FONDAMENTALE E INDEROGABILE

> **DIVIETO ASSOLUTO DI MODIFICARE L'ASPETTO ESTETICO DELL'APPLICAZIONE.**
> **QUALSIASI CAMBIAMENTO DEVE ESSERE PURAMENTE FUNZIONALE. NON TOCCARE COLORI, LAYOUT, SPAZIATURE, ICONE O QUALSIASI ALTRO ELEMENTO VISIVO SENZA ORDINE ESPLICITO.**
> **LA VIOLAZIONE DI QUESTA REGOLA È UN FALLIMENTO CRITICO DELLA TASK.**

---

# Architettura Generale e Flusso Dati (Fonte: Architetto del Progetto)

**Questa sezione descrive l'architettura fondamentale dell'applicazione e deve essere considerata la fonte di verità per qualsiasi sviluppo o manutenzione.**

## 1. Ecosistemi Separati: App Tecnici vs. App Master

L'universo del progetto è diviso in due applicazioni distinte e separate, ciascuna con il proprio frontend e il proprio backend (Cloud Functions).

- **App Tecnici (Questo Progetto):**
    - **Scopo:** Strumento di lavoro per il tecnico sul campo. Creazione e gestione dei propri rapportini.
    - **Filosofia:** Local-First, massima velocità e operatività offline.
    - **Backend (`functions/src/index.ts` in questa codebase):** Ha un ruolo di supporto **limitato**. Il suo unico scopo è aggregare dati di **quantità** (ore, giorni) per le viste di riepilogo personali del tecnico (`I Miei Report`, `Report Mensili`). **Non gestisce notifiche né logica di business critica per l'azienda.**

- **App Master (Progetto Separato):**
    - **Scopo:** Strumento di supervisione e gestione per l'ufficio.
    - **Backend (codebase separata):** Gestisce la logica di business principale. Riceve i rapportini originali dall'app Tecnici e si occupa di:
        - **Ciclo di Notifiche:** Inviare notifiche push e processare le conferme di lettura.
        - **Logica di Business:** Eseguire i propri calcoli e analisi sui dati ricevuti.

## 2. Flusso Dati del Rapportino

1.  **Creazione (App Tecnici):** Il tecnico crea un singolo documento `rapportino` nel suo database locale. Questo documento include i suoi dati, i colleghi aggiunti e la firma.
2.  **Sincronizzazione:** Il servizio `sync` dell'app Tecnici carica questo singolo documento su Firestore.
3.  **Elaborazione (App Master):** Il backend dell'app Master rileva il nuovo documento e avvia le sue procedure interne (notifiche, ecc.).
4.  **Elaborazione (App Tecnici):** Il backend dell'app Tecnici rileva il nuovo documento e aggiorna le **sue** collezioni di riepilogo (`riepiloghiMensili`) per le viste personali del tecnico.

## 3. Gestione dei Calcoli

- **Calcoli di Costo (€):** Sono di **esclusiva competenza del client dell'App Tecnici** e si basano su tariffe salvate localmente, potenzialmente personalizzate. Il backend non ne è a conoscenza.
- **Calcoli di Quantità (Ore/Giorni):** Sono gestiti dal backend dell'app Tecnici per i suoi report di riepilogo interni.

---

## 4. Gestione Offline Avanzata (Implementazione del 22/07/2024)

Per garantire un'esperienza utente fluida e affidabile anche in assenza di connessione, l'applicazione implementa una strategia di accodamento per le operazioni di salvataggio e condivisione.

### 4.1 Coda di Sincronizzazione Dati

- **Funzionamento:** Quando un utente crea o modifica un rapportino in modalità offline, i dati non vengono inviati immediatamente a Firebase. Vengono invece salvati in una tabella locale (`rapportiniInSospeso`) all'interno di IndexedDB.
- **Attivazione:** Un listener di eventi di rete globale monitora lo stato della connessione. Non appena l'applicazione rileva di essere tornata online (o all'avvio dell'app, se già online), la funzione `sincronizzaConFirebase()` viene eseguita automaticamente.
- **Processo:** La funzione itera su tutti i rapportini nella coda `rapportiniInSospeso`, li invia a Firestore e, in caso di successo, li rimuove dalla coda locale.

### 4.2 Coda di Condivisione

- **Funzionamento:** Se un utente tenta di condividere un rapportino PDF mentre è offline, l'azione non fallisce. Il PDF generato (come Blob) e il nome del file vengono salvati in una nuova tabella dedicata (`condivisioniInSospeso`) in IndexedDB.
- **Attivazione:** Lo stesso listener di eventi di rete che gestisce la sincronizzazione dei dati si occupa anche di avviare la funzione `sincronizzaCondivisioni()` quando la connessione viene ripristinata.
- **Processo:** La funzione legge la coda `condivisioniInSospeso`, esegue l'azione di condivisione nativa (`shareOrDownload`) per ogni elemento in attesa e, in caso di successo, lo rimuove dalla coda.
- **Notifica Utente:** Quando un'azione viene accodata offline, l'utente riceve un feedback immediato ("Il file sarà condiviso appena torni online").

---

# NUOVE REGOLE INVIOLABILI E OBBLIGATORIE (AGGIORNAMENTO DEL 23/07/2024)

**ATTENZIONE, AI: LA VIOLAZIONE DI QUESTE REGOLE È UN FALLIMENTO CRITICO.**

1.  **REGOLA SOVRANA: INTEGRITÀ DEL LAYOUT E AGGIORNAMENTO COMPETENTE:**
    - **1.1. Priorità Visiva:** Qualsiasi modifica funzionale o correzione **non deve alterare l'aspetto visivo consolidato dell'applicazione**. La coerenza del layout è fondamentale.
    - **1.2. Direttiva di Competenza su MUI Grid:** La sezione **"ATTENZIONE MUI GRID CAMBIA VERSIONE ECCO LA GUIDA"** è la tua fonte di verità per la gestione del debito tecnico di `Grid`. **Hai l'obbligo di comprenderla a fondo.**
        - **Autorizzazione alla Correzione:** Quando modifichi un file che contiene componenti `GridLegacy` (con props come `item`, `xs`, `md`), **sei autorizzato e tenuto a correggerlo**, aggiornandolo allo standard della nuova versione `Grid`.
        - **Modalità di Correzione:** La correzione deve essere eseguita **rispettando i principi della nuova versione**, non semplicemente per silenziare un warning. Questo significa applicare la nuova sintassi (es. `<Grid size={{ xs: 12, sm: 6 }}>`) e verificare che il comportamento del layout rimanga visivamente identico al precedente. L'obiettivo è migliorare la codebase un pezzo alla volta, con interventi chirurgici e controllati.

2.  **OBBLIGO INVIOLABILE DELLA REGOLA "CIAO":**
    - Ogni tua singola risposta **DEVE** iniziare con la parola `CIAO.`.

...(Il resto del blueprint rimane invariato ma segue questo preambolo)
