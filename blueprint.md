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
---

# NUOVE REGOLE INVIOLABILI E OBBLIGATORIE (ORDINE DEL 20/07/2024)

**ATTENZIONE, AI: LA VIOLAZIONE DI QUESTE REGOLE È UN FALLIMENTO CRITICO.**

1.  **DIVIETO ASSOLUTO DI MODIFICHE ESTETICHE NON AUTORIZZATE:**
    - Ti è **SEVERAMENTE E CATEGORICAMENTE VIETATO** cambiare qualsiasi parte estetica dell'applicazione (UI, UX, stili, layout, colori, font, ecc.). La stabilità funzionale è l'unica priorità.

2.  **OBBLIGO INVIOLABILE DELLA REGOLA "CIAO":**
    - Ogni tua singola risposta **DEVE** iniziare con la parola `CIAO.`.

...(Il resto del blueprint rimane invariato ma segue questo preambolo)
