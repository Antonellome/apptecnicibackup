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
Il problema è CONFERMATO e PERSISTE. Le funzioni `getNotifiche`, `markNotificheAsRead`, `sendNotifica` e `deleteNotifiche` sono **ASSENTI** dall'ambiente di produzione. Questo rende l'intera sezione Notifiche dell'app **NON FUNZIONANTE**.

---

## 4. Architettura Frontend: Analisi Dettagliata delle Pagine

### 4.1. HomePage (`src/pages/HomePage.tsx`)
*   **Scopo:** Cruscotto principale e menu di navigazione per le funzionalità chiave.
*   **Layout:** Organizzato a griglia, con un messaggio di benvenuto personalizzato con l'email dell'utente.
*   **Funzionalità:**
    *   **Navigazione:** Contiene i link principali a "Nuovo report", "I miei Report", "Report Mensili", "Notifiche" e "Check-in".
    *   **Contatore Notifiche:** Un `Badge` sul pulsante Notifiche mostra il numero di notifiche non lette, recuperato tramite l'hook `useUnreadNotificationsCount`.
*   **Punto Critico Rilevato:** Il contatore notifiche è quasi certamente **non funzionante**, poiché dipende da una logica backend che è assente.

### 4.2. Nuovo Report (`src/pages/NuovoReportPage.tsx` e `ReportFormPage.tsx`)
Questa funzionalità è composta da un componente "wrapper" (`NuovoReportPage`) che carica il componente principale del form (`ReportFormPage`). Tutta la logica complessa risiede nell'hook **`useReportForm.ts`**.
*   **Scopo:** Fornisce l'interfaccia per la creazione e la modifica dei report di intervento e delle assenze.
*   **Architettura:** La pagina delega tutta la gestione dello stato e della logica all'hook `useReportForm`, che utilizza un `useReducer` per una gestione robusta dello stato.
*   **Logica di Salvataggio (Offline-First):**
    1.  Al salvataggio, l'hook **non** chiama direttamente le API di Firebase.
    2.  L'operazione (`create` o `update`) viene salvata in una coda locale nel database Dexie.
    3.  Un processo in background (`SyncManager`) si occupa di inviare i dati a Firestore.
*   **Regole di Business Implementate:**
    *   **Blocco Modifiche:** Un report viene bloccato (sola lettura) se l'utente non è il creatore o se è passata la data limite (il 5 del mese successivo).
    *   **Gestione Ore (Manuale vs Automatica):** L'inserimento delle ore può essere automatico (da ora inizio/fine) o manuale (totale ore). La modalità viene ereditata dai tecnici aggiunti.
    *   **Multi-Giorno:** Permesso solo per tipi di assenza specifici (es. ferie).
    *   **Pausa Automatica:** Viene aggiunta una pausa di 60 minuti se l'orario interseca la fascia 12:00-13:00.
    *   **Firma Non Modificabile:** La firma del cliente, una volta salvata, non può più essere modificata.
*   **Funzionalità Aggiuntive:** Auto-salvataggio in `localStorage` durante la creazione; copia degli orari quando si aggiungono nuovi tecnici.

### 4.3. I Miei Report (`src/pages/ReportListPage.tsx`)
*   **Scopo:** Elencare, visualizzare e gestire i report creati dall'utente.
*   **Architettura e Dati:**
    *   **Fonte Dati Locale e Reattiva:** Usa `useLiveQuery` per leggere i dati in tempo reale dal database locale (Dexie), rendendo l'UI istantaneamente reattiva.
    *   **Dati Arricchiti:** Utilizza un hook `useEnrichedRapportini` per combinare i dati grezzi con le anagrafiche.
*   **Funzionalità Chiave:**
    *   **Navigazione Mensile:** Permette di sfogliare i report mese per mese.
    *   **Indicatori di Stato:** Comunica lo stato di connettività (online/offline) e i dati in attesa di sincronizzazione.
    *   **Condivisione PDF:** Genera un PDF del report **direttamente sul client** tramite `generateRapportinoPDF`.
    *   **Cancellazione (Soft Delete):** Marca un report come "cancellato" (`isDeleted: true`) ma non lo rimuove fisicamente.

### 4.4. Report Mensili (`src/pages/MonthlyReportPage.tsx`)
*   **Scopo:** Fornire una visione d'insieme aggregata dell'attività mensile di un tecnico.
*   **Architettura e Dati:**
    *   **Fonte Dati Inclusiva:** Recupera tutti i report del mese in cui l'utente è presente (creatore o aggiunto).
    *   **Logica di Calcolo Centralizzata:** Un servizio `calculateMonthlyReportData` si occupa di processare e aggregare i dati.
*   **Interfaccia Utente:** Presenta i dati in tre formati: calendario, tabella riepilogo e dettaglio giornaliero.
*   **Funzionalità Chiave:** Generazione e **anteprima** del PDF mensile sul client.
*   **Funzionalità Nascosta (Easter Egg):** 5 click sul titolo rivelano la stima dei costi nel riepilogo.

### 4.5. Notifiche (`src/pages/NotifichePage.tsx`)
*   **Scopo:** Centro notifiche per visualizzare comunicazioni.
*   **Punto di Rottura CRITICO:**
    *   **Recupero Dati (Funzionante):** La pagina visualizza correttamente le notifiche grazie a un ascoltatore `onSnapshot`.
    *   **Aggiornamento Dati (NON Funzionante):** Qualsiasi interazione (es. "Segna come letta") fallisce perché invoca una Cloud Function (`markNotificationAsRead`) che **non esiste**.
*   **Impatto:** L'utente vede le notifiche ma non può gestirle, rendendo la pagina inutilizzabile.

### 4.6. Check-in (`src/pages/CheckinPage.tsx`)
*   **Scopo:** Sistema di "timbratura" digitale (punch clock).
*   **Architettura:** 100% Offline-First. Ogni "timbratura" viene salvata localmente in Dexie e accodata per la sincronizzazione.
*   **Flusso di Lavoro Rigoroso (Post-Modifica):**
    1.  **Stato Iniziale:** L'unica azione possibile è "Inizia Giornata", con **selezione obbligatoria** del luogo di lavoro.
    2.  **Stato "Dentro":** Dopo l'inizio, le uniche azioni sono "Uscita" o "Termina Giornata".
    3.  **Stato "Fuori":** Dopo un'uscita, le uniche azioni sono una nuova "Entrata" o "Termina Giornata".

### 4.7. Impostazioni (`src/pages/SettingsPage.tsx`)
*   **Scopo:** Centro di controllo con guida, gestione account e configurazioni.
*   **Funzionalità:** Guida all'installazione della PWA, recupero password, logout, pulsante per forzare l'aggiornamento dell'app.
*   **Funzionalità Nascosta (Easter Egg):** Sezione per la **Gestione Tariffe** (salvate solo localmente) appare dopo 5 click sul titolo.

### 4.8. Login (`src/pages/LoginPage.tsx`)
*   **Scopo:** Pagina di accesso standard.
*   **Architettura:** Reindirizza automaticamente gli utenti già loggati. Gestisce autenticazione e recupero password via Firebase SDK.

---

## 5. Guida di Stile e Convenzioni: Material-UI v7
Questo progetto utilizza **Material-UI v7**. La convenzione per il componente `<Grid>` è usare la prop `size` con un oggetto per i breakpoint (`<Grid size={{ xs: 12, md: 6 }}>`).

---

## 6. Debito Tecnico e Azioni Correttive
*   **Incoerenza Sintassi `<Grid>` di MUI (RISOLTO):** Il codebase è stato allineato tramite codemod.
*   **Codice Morto (RIMOSSO):** `RapportiniList.tsx`, `NotesPage.tsx`.
*   **UI Superflua (RIMOSSO):** Pulsante "Cerca" in `AttendancesPage.tsx`.
