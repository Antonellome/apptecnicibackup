# Analisi e Blueprint Applicazione Tecnici R.I.S.O.

**Motto: Report Individuali Sincronizzati Online**

Questo documento delinea l'architettura, il flusso dei dati, i componenti chiave e i punti critici dell'applicazione per tecnici. L'obiettivo è mappare lo stato attuale del software e servire come base per manutenzione, ottimizzazione e nuove implementazioni.

---

## 0. Stato Attuale del Progetto

**[COMPLETATO]** Le criticità identificate durante l'analisi iniziale sono state risolte con successo. L'applicazione è ora completamente funzionale in modalità offline e il codebase è stato pulito da codice superfluo. 

- **Risolto**: La pagina `MonthlyReportPage` ora funziona offline.
- **Risolto**: Il codice orfano relativo alle notifiche è stato rimosso.
- **Migliorato**: Lo schema del database locale è stato ottimizzato per efficienza e scalabilità.
- **Stabilizzato**: Sono state risolte le inconsistenze nella definizione e nell'importazione del database locale, che causavano errori di compilazione.

---

## 1. Mappatura Generale dell'Applicazione

### 1.1. Stack Tecnologico e Architettonico
- **Frontend Framework**: React 18+ con Vite
- **Linguaggio**: TypeScript
- **UI Kit**: Material-UI (MUI) v5 e Date Pickers (MUI X)
- **Database Locale**: Dexie.js (wrapper per IndexedDB) con `dexie-react-hooks` per la reattività. Il database è definito in un unico file `src/db/local-db.ts` per garantire coerenza.
- **Backend Services**: Firebase (Authentication per l'accesso, Firestore per il database real-time).
- **Librerie Chiave**:
    - **Routing**: `react-router-dom` v6
    - **Gestione Date**: `date-fns`
    - **PDF Generation**: `jsPDF` e `jspdf-autotable`
- **Architettura Fondamentale**: **Progressive Web App (PWA) Offline-First**. L'app è progettata per funzionare in modo robusto anche senza connessione a internet.

### 1.2. Flusso Dati e Sincronizzazione
1.  **Autenticazione**: L'utente accede tramite email e password con Firebase Authentication. `ProtectedLayout` agisce da guardiano per le rotte private.
2.  **Caricamento Dati Master**: Al primo avvio, `MasterDataProvider` scarica da Firestore tutte le anagrafiche (tecnici, veicoli, ecc.) e le memorizza in IndexedDB tramite Dexie. Questo è fondamentale per l'operatività offline.
3.  **Operatività Offline**: L'applicazione legge **primariamente** da IndexedDB, rendendo l'UI veloce e indipendente dalla connettività.
4.  **Coda di Sincronizzazione (`syncQueue`)**: Ogni operazione di scrittura viene accodata come un evento nella tabella `syncQueue` di IndexedDB.
5.  **Motore di Sincronizzazione**: Un processo in `MainLayout.tsx` ascolta l'evento `online` del browser. Al ritorno della connessione, invoca `sincronizzaConFirebase` per inviare le modifiche pendenti a Firestore.
6.  **Dati Real-time e Locali**: La `ReportListPage.tsx` combina dati real-time da Firestore con quelli offline dalla `syncQueue` e sincronizza il risultato aggregato in una nuova tabella `rapportini` su Dexie, che diventa la fonte di verità per le altre parti dell'app.

---

## 2. Analisi dei Componenti Chiave

- **`ReportListPage.tsx`**: Pagina principale. Mostra una lista combinata di rapportini e si occupa di mantenere aggiornata la cache locale (`rapportini` in Dexie).
- **`ReportFormPage.tsx`**: Form complesso per la creazione/modifica dei rapportini con gestione online/offline, firme e generazione PDF.
- **`MonthlyReportPage.tsx`**: **[CORRETTO]** Pagina per la visualizzazione aggregata mensile. Ora legge i dati esclusivamente da Dexie, garantendo il funzionamento offline.
- **`SettingsPage.tsx`**: Pannello di controllo utente con `ForceUpdateButton` per il reset completo dell'app.
- **`MasterDataProvider.tsx`**: Componente cruciale che gestisce il download e la cache dei dati anagrafici.

---

## 3. Punti Critici e Piano d'Azione (Storico)

### 3.1. Bug e Inconsistenze
1.  **`MonthlyReportPage` solo Online**: **[RISOLTO]**
2.  **Codice Orfano (Notifiche)**: **[RISOLTO]**
3.  **Import Database Inconsistente**: **[RISOLTO]** Eliminati i file di definizione del database duplicati e standardizzati tutti gli import a un unico file sorgente.

### 3.2. Blueprint Operativo Eseguito
**FASE 1: Risoluzione Funzionalità Offline Mancante** - **[COMPLETATO]**
1.  **Modifica Schema DB**: Esteso lo schema di `localDB` in `src/db/local-db.ts` con la tabella `rapportini`.
2.  **Popolamento e Sincronizzazione**: Modificata `ReportListPage` per salvare i rapportini combinati nella nuova tabella locale.
3.  **Refactoring di `MonthlyReportPage`**: Riscritto il componente per leggere i dati da Dexie, rendendolo offline-first.

**FASE 2: Pulizia e Stabilizzazione del Codice** - **[COMPLETATO]**
1.  **Rimozione Componenti Orfani**: Eliminati `NotifichePage.tsx` e `notificationService.ts`.
2.  **Pulizia Schema DB**: Verificata e confermata la rimozione di tabelle non utilizzate.
3.  **Pulizia Routing**: Rimossa la rotta `/notifiche`.
4.  **Pulizia Layout**: Rimossi i riferimenti alla funzionalità di notifica dal layout principale.
5.  **Unificazione Definizione Database**: Eliminati i file `db.ts` e `localDatabase.ts` ridondanti. Centralizzata la definizione del database in `src/db/local-db.ts` e corretti tutti gli import nell'applicazione per puntare a questo singolo file.

Questo piano è stato eseguito con successo, portando l'applicazione a uno stato stabile, robusto e coerente.
