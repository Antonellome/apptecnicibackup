# Registro di Progetto
Questo documento serve come fonte di verità per l'architettura, le funzionalità e le specifiche tecniche dell'applicazione.

---

## 1. La Regola del Ciao: La Mia Filosofia Operativa
Ciao! Sono il tuo assistente AI. Il mio obiettivo è agire e risolvere, non solo chiacchierare. Prendo iniziative basate sul contesto per portare a termine il lavoro in modo efficiente. Parlo solo quando è necessario per confermare piani complessi o chiedere chiarimenti. La mia priorità è l'azione diretta e risolutiva.

---

## 2. Descrizione Generale dell'Applicazione
L'applicazione è una Progressive Web App (PWA) progettata per i tecnici di *Tecnologie Industriali Navali*, con un forte focus sulla funzionalità offline.

---

## 3. Architettura Backend: Cloud Functions (Stato di Produzione)
Questa sezione elenca le funzioni **effettivamente deployate** su Firebase, come da verifica e conferma del 29/07/2024. Questo elenco è la fonte di verità.
- `testcors`
- `saveFCMToken`
- `getAllRapportiniForSync`
- `updateRapportino`
- `createRapportino`
- `sync_manifest`
- `deleteDocumento`
- `syncAnagrafica`
- `deleteRapportino`
- `updateDocumento`
- `createCheckin`
- `syncAllAnagrafiche`
- `admin_getAllUsers`
- `getCheckinsUpdates`
- `amministrazione_gestisciUtenti`
- `createDocumento`
- `adminGetAllRapportini`

**NOTA CRITICA - FUNZIONALITÀ NOTIFICHE NON OPERATIVA (29/07/2024):**
Il problema è CONFERMATO e PERSISTE. Le funzioni `getNotifiche`, `markNotificheAsRead`, `sendNotifica` e `deleteNotifiche` sono **ASSENTI** dall'ambiente di produzione. Un'analisi di un file di documentazione archiviato (`notifiche.md`) indicava che il problema era noto (un errore di deploy nella region sbagliata) e che un fix era 'in fase di deploy'. L'ultima verifica conferma che questo deploy **non è mai stato completato con successo**. Di conseguenza, l'intera sezione Notifiche dell'app è e rimane NON FUNZIONANTE.

---

## 4. Architettura Frontend: Analisi delle Pagine
### 4.1. Pagine Principali (Accessibili dal Menu Utente)
*   **HomePage:** Cruscotto principale e menu di navigazione.
*   **Nuovo Report:** Form per la creazione di nuovi report (usa il componente `ReportFormPage`).
*   **I Miei Report (`ReportListPage`):** Elenco dei report dell'utente, con azioni di modifica, condivisione e cancellazione.
*   **Report Mensili:** Visione aggregata dell'attività mensile, con generazione di PDF riassuntivi.
*   **Notifiche:** Centro notifiche **(ATTUALMENTE NON FUNZIONANTE)**.
*   **Check-in:** Sistema di timbratura digitale (punch clock) con architettura offline-first.
*   **Impostazioni:** Centro di controllo per l'utente (guida, logout, gestione PWA).
*   **Login:** Pagina di accesso.

### 4.2. Pagine e Componenti Interni (Non accessibili dal Menu)
Questa sezione documenta le pagine e i componenti che esistono nel codebase ma non sono direttamente raggiungibili dalla navigazione principale.
*   **`AttendancesPage.tsx` (Storico Presenze):** Pagina funzionante ma non linkata, fornisce un registro cronologico unificato di report e timbrature.
*   **`AnagrafichePage.tsx` (Visualizzatore Anagrafiche):** Pagina di sola lettura, probabilmente uno strumento di sviluppo/debug.
*   **`ReportFormPage.tsx`:** Componente fondamentale e riutilizzabile che contiene tutta la logica del form per la creazione/modifica dei report.
*   **`EditReportPage.tsx` / `EditOfflineReportPage.tsx`:** Componenti "wrapper" che caricano il `ReportFormPage` per la modifica dei report.

---

## 5. Guida di Stile e Convenzioni: Material-UI v7
Questo progetto utilizza **Material-UI v7**. Tutto il codice deve aderire a queste convenzioni.
### 5.1. Utilizzo del Componente `<Grid>`
**Regola Fondamentale:** Non usare mai la prop `item`. Le dimensioni dei breakpoint vanno passate come oggetto tramite la prop `size`.
**Esempio Corretto:**
```javascript
<Grid container spacing={2}>
  <Grid size={{ xs: 12, md: 6 }}>...</Grid>
</Grid>
```

---

## 6. Debito Tecnico e Azioni Correttive
*   **Incoerenza Sintassi `<Grid>` di MUI (RISOLTO):** Eseguito codemod `v7.0.0/grid-props` per allineare l'intero codebase.
*   **Codice Morto (DA RIMUOVERE):**
    *   `RapportiniList.tsx`
    *   `NotesPage.tsx`
*   **UI Superflua (DA RIMUOVERE):**
    *   Pulsante "Cerca" in `AttendancesPage.tsx`.
