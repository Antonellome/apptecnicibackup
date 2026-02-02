# Blueprint: R.I.S.O. - App Tecnici

## Panoramica

Quest'applicazione, denominata R.I.S.O. (Report Individuali Sincronizzati Online), è l'applicazione **client** per tecnici. È progettata per interagire con un sistema di configurazione centralizzato ("RISO Master") tramite Firebase, come definito nel documento `REQUISITI_RISO_MASTER.md`. L'obiettivo è fornire ai tecnici uno strumento mobile e desktop per creare e gestire i loro report di lavoro giornalieri in base alle configurazioni ricevute.

## Documentazione del Progetto e Funzionalità Implementate

### 1. Stack Tecnologico e Dipendenze Chiave
- **Framework:** React (con Vite)
- **Componenti UI:** Material-UI (MUI)
- **Icone:** `@mui/icons-material`
- **Routing:** `react-router-dom`

### 2. Design e Stile Iniziali
- **Layout:** La struttura iniziale si basa sui componenti `Grid` e `Card` di MUI per la pagina principale.
- **Iconografia:** Le icone utilizzate sono di Material-UI.
- **Colori:** È stata definita una palette di base con un blu primario (`#2962FF`).

### 3. Funzionalità Pre-esistenti
- **Pagine Iniziali:** Sono state create le seguenti pagine: `HomePage`, `LoginPage`, `NewReportPage`, `ReportListPage`, `MonthlyReportPage`, `AttendancesPage`.
- **Componente `MenuBar`:** Un componente base `MenuBar.tsx` esiste in `src/components`.
- **Routing:** La navigazione di base tra le pagine è configurata in `App.tsx`.

---

## Riorientamento Strategico e Nuovo Piano di Sviluppo

### Analisi e Correzione di Rotta

L'approccio iniziale si è concentrato eccessivamente sulla creazione di un'interfaccia utente generica, ignorando i requisiti fondamentali e l'architettura specificati nei documenti di riferimento, in particolare `REQUISITI_RISO_MASTER.md`. Questo ha portato a un'implementazione non allineata con gli obiettivi del progetto.

**La nuova strategia, su indicazione dell'utente, è di seguire un approccio incrementale e guidato, costruendo l'applicazione punto per punto in stretta aderenza ai requisiti.**

### Piano Attuale

**Stato:** In attesa di completare e rifinire i componenti base della UI.

**Prossimi Passi:**

1.  **Completare il Componente `MenuBar`:**
    *   **Obiettivo:** Rendere la `MenuBar` un componente riutilizzabile e funzionale per tutte le pagine secondarie (tutte tranne la Home).
    *   **Funzionalità da Aggiungere:**
        *   Mantenere il pulsante "Indietro" per la navigazione.
        *   Mantenere il titolo della pagina.
        *   **Aggiungere un pulsante "Logout"** per consentire all'utente di disconnettersi da qualsiasi pagina.
        *   Assicurare che sia stilisticamente coerente con il resto dell'app.

2.  **Integrare la `MenuBar` nelle Pagine:**
    *   Assicurare che la `MenuBar` completata sia correttamente implementata in tutte le pagine secondarie (`NewReportPage`, `ReportListPage`, `MonthlyReportPage`, `AttendancesPage`).

3.  **Sviluppo Guidato dalle Specifiche:**
    *   Una volta completata la `MenuBar`, si procederà con l'implementazione delle funzionalità successive (es. interfacce TypeScript, logica Firebase, gestione stato) seguendo le direttive del documento `REQUISITI_RISO_MASTER.md` e le istruzioni punto per punto dell'utente.
