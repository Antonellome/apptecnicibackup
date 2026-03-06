# REGOLA FONDAMENTALE: IL METODO DEL GRANDE MAESTRO (ANALISI A 360°)

Ogni modifica al codice deve essere trattata come una mossa in una partita a scacchi contro il crash di sistema. Non è permesso agire d'impulso. L'AI deve seguire rigorosamente questi 4 passaggi prima di toccare qualsiasi file:

1. SIMULAZIONE VIRTUALE: Prima di ogni scrittura, l'AI deve simulare mentalmente l'impatto della modifica su TUTTA l'applicazione (Auth, Providers, Routing, UI, Database).
2. ANTICIPAZIONE DELLO SCACCO (PRE-FIX): Identificare preventivamente ogni possibile errore (TypeScript, Firebase Permissions, Indici mancanti, loop di re-render) che la mossa potrebbe causare.
3. CONTROMOSSA PREVENTIVA: Progettare la soluzione includendo già i controlli di sicurezza (null-safe, try/catch, fallback) e le modifiche ai file di configurazione (rules, indexes) necessari per evitare l'errore simulato al punto 2.
4. VERIFICA DEI PRODIER: L'AI non deve mai unificare logiche critiche (es. Auth e Dati) se questo mette a rischio la stabilità del caricamento iniziale (Login Page). I moduli devono essere indipendenti e resilienti.

"Agire solo quando la vittoria (stabilità) è matematicamente certa."

---

# Protocollo di Comunicazione AI

## Regola del "CIAO"

Ogni singola risposta dell'AI deve iniziare con la parola **"CIAO"**. Questa regola funge da checksum per verificare la continuità del contesto. L'omissione di "CIAO" indica una potenziale perdita di contesto e deve essere immediatamente corretta.

---

# R.I.S.O. - Blueprint Applicazione Tecnici

Questo documento descrive le specifiche e i requisiti per l'applicazione "R.I.S.O." (Report Individuali Sincronizzati Online) per tecnici.

---

## Mappa di Navigazione dell'Applicazione

La navigazione dell'applicazione è gestita tramite `react-router-dom` e si suddivide in due layout principali: uno per l'autenticazione e uno per l'applicazione principale. Tutte le rotte principali sono protette e richiedono il login.

### Layout di Autenticazione (`AuthLayout`)
- **Contesto:** Gestisce le pagine accessibili senza aver effettuato il login.
- **Rotte:**
    - **`/login`**:
        - **Componente:** `LoginPage`
        - **Scopo:** Pagina di accesso per l'utente.

### Layout Principale (`MainLayout`)
- **Contesto:** È il contenitore principale dell'applicazione dopo il login. Include elementi globali come l'app bar e la barra di navigazione. È protetto da `ProtectedRoute`, quindi accessibile solo ad utenti autenticati.
- **Rotte Figlie:**
    - **`/`**:
        - **Componente:** `HomePage`
        - **Scopo:** Dashboard principale dell'applicazione.
    - **`/nuovo-report`**:
        - **Componente:** `NuovoReportPage`
        - **Scopo:** Form per la creazione di un nuovo rapportino giornaliero o di un periodo di assenza.
    - **`/lista-report`**:
        - **Componente:** `ReportListPage`
        - **Scopo:** Elenco di tutti i rapportini creati dall'utente, con funzionalità di ricerca e modifica.
    - **`/report-mensile`**:
        - **Componente:** `ReportMensilePage`
        - **Scopo:** Pagina per la visualizzazione aggregata dei report su base mensile, con resoconto analitico e calendario.
    - **`/notifiche`**:
        - **Componente:** `NotifichePage`
        - **Scopo:** Centro messaggi sincronizzato con l'app Master.
    - **`/impostazioni`**:
        - **Componente:** `ImpostazioniPage`
        - **Scopo:** Pagina per la configurazione delle impostazioni utente, come tariffe e preferenze.

### Gestione Rotte Non Valide
- **`*` (Qualsiasi altra rotta)**:
    - **Azione:** Reindirizza automaticamente l'utente alla rotta radice (`/`) per evitare pagine di errore 404.

---

## Note Tecniche di Sviluppo

### Guida all'Utilizzo del Componente Grid di MUI (v7+)

Per evitare errori di layout ricorrenti, è **obbligatorio** seguire le seguenti linee guida quando si utilizza il componente `Grid` di Material-UI. Questa applicazione utilizza la versione moderna del componente, che ha sostituito il vecchio `GridLegacy`.

#### 1. Importazione Corretta
Utilizzare sempre l'importazione diretta dal pacchetto `@mui/material`.

`import Grid from '@mui/material/Grid';`

**NON** utilizzare `@mui/material/GridLegacy`.

#### 2. Rimozione di Prop Obsolete
- La prop **`item` è stata rimossa**. Tutti i `Grid` sono considerati *item*.
- La prop **`zeroMinWidth` è stata rimossa**.

#### 3. Sintassi Corretta per le Dimensioni (`size`)
Le props dei breakpoint (`xs`, `sm`, etc.) sono state **sostituite** dalla prop `size`.

- **Per breakpoint multipli (SINTASSI OBBLIGATORIA):**
  `<Grid size={{ xs: 12, sm: 6 }}>`

- **Per un valore unico su tutti i breakpoint:**
  `<Grid size={6}>`

- **Per auto-layout (equivalente al vecchio `xs` booleano):**
  `<Grid size="grow">`

**ATTENZIONE:** L'uso delle prop dirette come `<Grid xs={12}>` è **ERRATO** e appartiene a versioni precedenti. Causa errori di compilazione.

#### 4. Gestione del `container`
- La prop `container` rimane invariata per definire il contenitore della griglia.

#### 5. Esempio Pratico Completo

'''jsx
import Grid from '@mui/material/Grid'; // Import corretto

function MyComponent() {
  return (
    // Il contenitore
    <Grid container spacing={2}>
      // Figlio 1 (la prop 'item' non serve)
      <Grid size={{ xs: 12, md: 8 }}>
        {/* Contenuto... */}
      </Grid>
      // Figlio 2
      <Grid size={{ xs: 6, md: 4 }}>
        {/* Contenuto... */}
      </Grid>
    </Grid>
  );
}
'''

---

## Specifiche Funzionali

### 1. Dashboard/Home
- **Layout:** Griglia 2x2 con 4 tab di uguali dimensioni.
- **Tab:**
    - Nuovo report
    - Report
    - Report mensili
    - Notifiche (con Badge numerico per messaggi non letti)
- **Header:** Cornice blu con messaggio di benvenuto e email del tecnico.
- **Footer:** Cornice blu con la firma "by AS".

### 2. App Bar (Globale)
- **Titolo:** "R.I.S.O. App Tecnici"
- **Sottotitolo:** "Report Individuali Sincronizzati Online"
- **Icone (destra):**
    - Switch Tema (chiaro/scuro)
    - Impostazioni
    - Logout

### 3. Pagina Login
- Titolo e sottotitolo dell'applicazione. Gestita da `AuthProvider` per la persistenza della sessione.

### 4. Form "Nuovo Report" (Pagina `NuovoReportPage.tsx`)

Questa pagina consente la creazione e la modifica dei rapportini di lavoro. Supporta il **salvataggio offline** tramite `IndexedDB` (Dexie.js).

#### **Logica Offline e Sincronizzazione**
- **Stato Online:** Salvataggio diretto su Firestore.
- **Stato Offline:** I dati vengono accodati localmente. Una notifica snackbar informa l'utente del salvataggio locale.
- **Sincronizzazione Automatica:** Al ripristino della connessione (evento `online`), l'app invia automaticamente i report in sospeso a Firestore.

---

### 6. Pagina Report Mensili
- **Logica Dati Locale:** La pagina opera sui dati presenti per massima reattività.
- **Sezione 1: Resoconto Analitico**
    - Tabella dettagliata con Data, Tipo Giornata, Ore.
    - Calcolo Guadagni: basato su tariffe in `SettingsPage` (fallback a 10€/ora).
- **Sezione 2: Calendario Mensile Interattivo**
    - Vista calendario con celle colorate per `Tipo Giornata`.
    - Segnalazione automatica "Assenza Ingiustificata" (rosso) per giorni lavorativi senza report.

---

### 8. Pagina Impostazioni
- **Gestione Tariffe Orarie:** Salvataggio locale per tipo di giornata. Supporta input decimale con virgola (conversione automatica).
- **Recupero Password:** Integrazione con Firebase Auth Mail Reset.

---

### 9. Pagina Notifiche (Master-Sync)
- **Sincronizzazione:** Collegata alla collezione Firestore **`notificheRichieste`**.
- **Logica Query:** Doppia query in tempo reale (`onSnapshot`):
    1. Personale: `to_ids` array-contains `user.uid`.
    2. Categoria: `to_category_ids` array-contains `userProfile.categoria.id`.
- **Funzionalità:**
    - Segna come letto al click (aggiornamento Firestore `isRead: true`).
    - Eliminazione singola per notifiche già lette.
    - Ordinamento cronologico decrescente.

---

## NOTA DI STATO DEL PROGETTO
**L'applicazione è momentaneamente COMPLETA nelle sue funzionalità core:**
- ✅ Autenticazione e Gestione Profilo.
- ✅ Creazione/Modifica Report Giornalieri e Periodi.
- ✅ Funzionalità Offline-First con database locale.
- ✅ Sincronizzazione automatica al ritorno online.
- ✅ Sistema Notifiche bidirezionale sincronizzato con App Master.
- ✅ Calcolo guadagni e Report mensile analitico/grafico.