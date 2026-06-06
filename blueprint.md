# MANIFESTO DI PROGETTO (Regola Zero)

**spiegazione: questa è l'APP TECNICI, serve a creare report, o rapportini che dir si voglia, sul campo. questi report vengono sincronizzati verso l'app MASTER OFFICE. la master invia notifiche e legge le ricevute di avvenuta lettura. qui si inviano check-in per la master. il resto dei calcoli di ore e costi qui è in locale e nulla hanno a che fare con la master. questa descrizione, la precedente dettagliata, le nomenclature dei componenti del codice, le regole grid nuove che tu sconosci, tutto insieme, ti permetteranno di completare le correzioni dell'app finita. nessuna modifica visiva ma solo logica a meno che non sia autorizzata seguito richiestada te fatta esplicitamente. ripeto app finita, solo correzioni per arrivare al deploy, ogni miglioria, nuove funzioni che puoi leggere le faremo alla fine dietro sempre autorizzazione chiesta esplicitamente.**

---

# Blueprint: Gestione Rapportini Tecnici

Questo documento delinea l'architettura, le funzionalità e il piano di sviluppo per l'applicazione di gestione dei rapportini. Serve come raccolta delle linee guida per lo sviluppo assistito dall'AI.

## 1. Informazioni di Deploy

- **URL Applicazione:** [https://tecnici.web.app](https://tecnici.web.app)

---

## 2. Specifiche Funzionali dell'App Tecnici (Fonte di Verità Assoluta)

### 2.1. Struttura Generale e Pagine

**HOME PAGE**
- **AppBar Stabile:** Presente e identica in tutte le pagine. Contiene:
    - Titolo
    - Sottotitolo
    - Icona "Home"
    - Icona "Impostazioni" (link alla pagina Impostazioni)
    - Icona "Logout"
- **Layout:**
    - In alto: una cornice con "Benvenuto [Nome Tecnico]" e l'email del tecnico loggato.
    - In basso: una cornice per la firma.
    - Al centro: 5 card di navigazione che portano alle rispettive pagine:
        1.  `NUOVO REPORT`
        2.  `I MIEI REPORT`
        3.  `REPORT MENSILI`
        4.  `NOTIFICHE`
        5.  `CHECK-IN`

**PAGINA NUOVO REPORT**
- **Scopo:** Inserimento di un nuovo report da sincronizzare. Il form non deve **mai** essere variato se non esplicitamente richiesto.
- **Sezione 1: Dati Principali:**
    - Data
    - Tecnico (fisso, l'utente loggato)
    - Tipo Giornata
- **Sezione 2: Orari:**
    - Switch per metodo "Normale" o "Manuale". Il metodo scelto dal tecnico principale viene ereditato dai tecnici aggiunti.
    - **Metodo Manuale:** Inserimento diretto delle ore con step di 0.5 (30 min). Fino a 8 ore sono "ordinarie", oltre vengono visualizzate come straordinario (es. "8 + 0.5h").
    - **Metodo Normale:** Campi Inizio, Fine, Pausa.
        - Default: Inizio 07:30, Fine 16:00, Pausa 60 min.
        - Step: 30 min per Inizio/Fine, valori fissi (0, 30, 60) per Pausa.
    - **Ereditarietà:** Gli orari impostati dal tecnico principale vengono ereditati dai tecnici aggiunti, ma rimangono modificabili singolarmente per ogni tecnico.
- **Sezione 3: Dettagli Intervento:**
    - Campi: Navi, Luogo, Veicolo, Breve Descrizione, Materiali, Lavoro Eseguito.
- **Sezione 4: Firma Cliente:**
    - Campi: Nome, Società, area per la firma.
- **Azioni Finali:**
    - Pulsanti per salvare e per condividere il report (es. via WhatsApp).

**PAGINA I MIEI REPORT**
- **Contenuto:** Mostra tutti i report creati dal tecnico loggato e quelli in cui è stato aggiunto come presenza.
- **Controlli:**
    - In alto: pulsante "Nuovo Report".
    - Controllo di navigazione temporale: mese corrente visualizzato, con pulsanti per andare indietro al mese precedente e avanti fino al mese corrente.
- **Lista Report:**
    - Ogni report nella lista è cliccabile per consultazione/modifica.
    - **Regola di Modifica:** Solo il tecnico che ha creato il report può modificarlo. I tecnici aggiunti possono solo visualizzarlo.
    - **Regola di Cancellazione:** I report non possono essere cancellati dall'app.

**PAGINA REPORT MENSILI**
- **Scopo:** Fornire un riepilogo mensile con dettaglio costi e grafici sulla distribuzione delle attività.
- **Logica Offline:** Questa pagina deve funzionare in modalità offline, basandosi sui report salvati nel database locale per non gravare sui costi di Firebase.
- **Calcoli:**
    - **Giornata Ordinaria:** (Ore <= 8) * Tariffa Ordinaria + (Ore > 8) * Tariffa Straordinaria.
    - **Giornata Straordinaria:** Ore Totali * Tariffa Straordinaria.
    - **Trasferta:** Calcolo ore ordinarie + Tariffa Trasferta (giornaliera).
    - **Giornate non lavorate (Ferie, Malattia, etc.):** 8 ore di default * Tariffa Fissa Giornaliera.
- **Tariffe:** I valori delle tariffe sono gestiti nella pagina Impostazioni. I calcoli devono usare le tariffe salvate nel database locale.

**PAGINA NOTIFICHE**
- **Logica di Lettura:**
    1.  Una notifica arriva, un badge appare sulla card "Notifiche" nella Home.
    2.  L'utente apre la pagina Notifiche. Vede una lista di box, ognuno rappresentante una notifica.
    3.  Ogni notifica ha una linea blu a sinistra, titolo e data. A destra, un'icona per espandere.
    4.  **A questo punto, la notifica NON è ancora letta.**
    5.  L'utente espande la notifica per leggere il messaggio completo. **SOLO ORA** la notifica si considera letta:
        - Il badge delle notifiche si aggiorna.
        - Parte la chiamata per registrare l'avvenuta lettura.
    - Ogni notifica aperta mostra un'icona per "nasconderla" (archiviarla) dalla vista principale.
- **Logica Tecnica di Sincronizzazione (da App Master):**
    - `notifications`: Collezione dove vengono salvate le notifiche. I campi includono `title`, `body`, `target`, `senderId`, `createdAt`, e un oggetto `readBy`.
    - `readBy`: Mappa dove la chiave è l'ID del tecnico e il valore è un oggetto `{ readAt: Timestamp, tecnicoName: String }`.
    - **Flusso:** L'admin invia -> Cloud Function triggera -> Invia push FCM ai dispositivi target -> Il messaggio push contiene il `notificationId`.
    - **Implementazione App Tecnici:**
        - L'app riceve il messaggio (background o foreground).
        - Al tocco, naviga alla schermata di dettaglio passando il `notificationId`.
        - La schermata di dettaglio recupera i dati da Firestore e **aggiorna il documento originale** nella collezione `notifications` aggiungendo l'UID e il nome del tecnico all'oggetto `readBy` usando la "dot notation" (`readBy.TECNICO_ID`).

**PAGINA CHECK-IN**
- **Scopo:** Permettere al tecnico di comunicare la propria posizione di lavoro (Nave o Luogo).
- **Logica di Invio Multiplo:**
    - È possibile effettuare il check-in più volte al giorno.
    - Se un check-in per la giornata corrente è già stato inviato, l'app deve chiedere conferma prima di inviarne uno nuovo.
- **Logica Tecnica (da App Master):**
    - **Problema da risolvere:** Evitare di creare un nuovo documento per ogni check-in (`addDoc`).
    - **Soluzione:** Usare `setDoc` con un ID documento deterministico e univoco per giorno e per tecnico.
    - **Formato ID:** `TECNICO_ID` + `_` + `DATA_YYYY-MM-DD` (es. `abc123xyz_2023-10-27`).
    - **Implementazione:**
        1.  Costruire l'ID univoco.
        2.  Preparare i dati del check-in.
        3.  Usare `await setDoc(doc(db, "presenze", docId), checkInData, { merge: true });`. Questo crea il documento se non esiste o lo aggiorna se esiste già, garantendo un solo record al giorno per tecnico.

**PAGINA IMPOSTAZIONI**
- **Scopo:**
    - Gestire la tabella dei costi (tariffe orarie/giornaliere) per ogni Tipo di Giornata.
    - Le modifiche vengono salvate nel database locale e usate per i calcoli nella pagina Report Mensili.
    - Contiene un tasto per forzare l'aggiornamento dell'applicazione.

### 2.2. Gestione Offline

- **Priorità:** La gestione offline complessa verrà affrontata dopo aver stabilizzato l'applicazione e implementato le funzionalità principali.
- **Creazione Report Offline:** Un nuovo rapportino creato senza connessione deve essere salvato in una coda locale.
- **Visibilità Coda:** La presenza di report in coda deve essere segnalata da:
    - Un chip/badge sulla card "I MIEI REPORT" nella Home.
    - Un chip/badge sopra il tasto "Nuovo Report" nella pagina "I MIEI REPORT".
    - Un'indicazione visiva (es. chip) su ogni singolo report in attesa di sincronizzazione nella lista.
- **Funzionalità Offline:** I report in coda devono essere consultabili, modificabili e condivisibili anche offline.
- **Report Mensili Offline:** L'obiettivo è far funzionare la pagina "Report Mensili" interamente offline, leggendo i dati da una copia locale dei report. La logica attuale di salvataggio/lettura tra DB locale e Firestore è problematica e va sistemata.

---

## 3. Contratto Dati Firestore

*Questa sezione definisce le strutture dati esatte che l'AI deve utilizzare.*

### 3.1. Accesso alle Collezioni

| Nome Collezione     | Accesso App Tecnici | Scopo                                                              |
| ------------------- | ------------------- | ------------------------------------------------------------------ |
| `tecnici`           | Sola Lettura        | Anagrafica del tecnico che ha effettuato il login.                 |
| `navi`              | Sola Lettura        | Elenco delle navi disponibili come sedi di lavoro.                 |
| `luoghi`            | Sola Lettura        | Elenco dei luoghi generici disponibili come sedi di lavoro.        |
| `tipiGiornata`      | Sola Lettura        | Elenco dei tipi di giornata selezionabili (es. "Ordinario").         |
| `checkins`          | Scrittura           | Creazione e aggiornamento dei tuoi eventi di check-in/check-out.   |
| `rapportini`        | Scrittura           | Creazione e aggiornamento dei tuoi rapportini di lavoro.           |
| `notifiche`         | Sola Lettura        | Lettura delle notifiche a te indirizzate.                         |
| `notificheLetture`  | Scrittura           | Creazione dei record che confermano la tua lettura di una notifica.|

### 3.2. Modelli Dati (Interfacce TypeScript)

```typescript
// Da: collection 'tecnici'
// Usato per i dati del tuo profilo.
export interface Tecnico {
  id: string; // Corrisponde al tuo Firebase Auth UID
  nome: string;
  cognome: string;
  email: string;
  attivo: boolean;
}

// Da: collection 'navi'
// Usato per popolare l'elenco delle sedi.
export interface Nave {
  id: string;
  nome: string;
}

// Da: collection 'luoghi'
// Usato per popolare l'elenco delle sedi.
export interface Luogo {
  id: string;
  nome: string;
}

// Da: collection 'tipiGiornata'
// Usato per popolare la scelta del tipo di giornata nel rapportino.
export interface TipoGiornata {
  id:string;
  nome: string;
}

// Per: collection 'checkins'
// Documento creato al momento del check-in.
export interface Checkin {
  tecnicoId: string; // Il tuo UID
  timestampIn: Date; // Timestamp Firestore
  timestampOut?: Date; // Aggiunto al check-out
  anagraficaId: string; // ID della Nave o del Luogo
  anagraficaNome: string; // Nome denormalizzato della Nave o Luogo
  tipoAnagrafica: 'nave' | 'luogo';
}

// Per: collection 'rapportini'
// Il modello principale che dovrai costruire.
export interface Rapportino {
  // RIFERIMENTI OBBLIGATORI
  sede: {
    id: string; // ID della Nave o Luogo
    tipo: 'nave' | 'luogo';
  };
  tipoGiornataId: string;
  data: Date; // Timestamp Firestore

  // DETTAGLI DEL LAVORO
  presenze: string[]; // Array di tecnicoId (UIDs)
  attivitaSvolte: string[];
  dettaglioOreTecnici: {
    tecnicoId: string;
    ore: number;
  }[];
  materialeUtilizzato: {
    descrizione: string;
    quantita: number;
  }[];
  note?: string;

  // FIRMA E CHIUSURA
  chiuso: boolean;
  firma: {
    firmatarioNome: string;
    firmatarioRuolo: string;
    // Carica l'immagine su Storage e salva qui solo il path.
    signatureImagePath: string;
  };

  // METADATI DI SISTEMA
  metadata: {
    createdAt: Date; // Timestamp Firestore
    createdBy: string; // Il tuo UID
    updatedAt?: Date; // Opzionale, aggiunto in caso di modifica
    updatedBy?: string; // Opzionale, il tuo UID se modifichi

    // CAMPO DI SOLA LETTURA: NON VALORIZZARE
    // Viene popolato dalla App Master dopo la sincronizzazione.
    numeroRapportino?: string;
  };
}

// Da: collection 'notifiche'
// Modello della notifica che ricevi.
export interface Notifica {
  id: string;
  titolo: string;
  messaggio: string;
  timestamp: Date; // Timestamp Firestore
}

// Per: collection 'notificheLetture'
// Documento che crei per confermare la lettura.
export interface NotificaLettura {
  notificaId: string;
  tecnicoId: string; // Il tuo UID
  timestampLettura: Date; // Timestamp Firestore del momento in cui hai letto
}
```

---

## 4. Linee Guida per lo Sviluppo AI

*Queste sono le regole operative che l'AI deve seguire durante lo sviluppo in questo progetto.*

### Ambiente & Context Awareness
- **Project Structure:** Standard React (Vite) con entry point in `src/main.tsx`.
- **`dev.nix` Configuration:** L'AI deve considerare `.idx/dev.nix` come fonte di verità per l'ambiente di sviluppo.
- **Preview Server:** L'AI è consapevole che il server di sviluppo (`npm run dev`) è attivo e monitora il suo output.
- **Firebase Integration:** L'AI riconosce i pattern di integrazione standard di Firebase e aderisce strettamente al Contratto Dati.

### Code Modification & Dependency Management
- **Core Code Assumption:** Le modifiche si concentrano principalmente sui file JSX/TSX in `src/`.
- **Package Management:** L'AI può aggiungere dipendenze con `npm install <pkg>` o `npm install -D <pkg>`.

### Automated Error Detection & Remediation
- **Post-Modification Checks:** Dopo ogni modifica, l'AI controlla diagnostica, terminal e preview per errori.
- **Automatic Error Correction:** L'AI tenta di correggere automaticamente errori di sintassi, tipo, import, e linting (usando `eslint . --fix`).
- **Problem Reporting:** Se un errore non è risolvibile, l'AI lo riporta all'utente con dettagli e suggerimenti.

### Guida Ufficiale: Upgrade to Grid v2

In Material UI v7, the GridLegacy component has been deprecated and replaced by Grid, which offers several new features as well as significant improvements to the developer experience. This guide explains how to upgrade from GridLegacy to Grid, and includes details for Material UI v5, v6, and v7.

**Why you should upgrade**

Grid provides the following improvements over GridLegacy:

- It uses CSS variables, removing CSS specificity from class selectors.
- You can use sx prop to control any style you'd like.
- All grids are considered items without specifying the item prop.
- The offset feature gives you more flexibility for positioning.
- Nested grids now have no depth limitation.
- Its implementation doesn't use negative margins so it doesn't overflow like GridLegacy.

**How to upgrade**

**Prerequisites**

Before proceeding with this upgrade:

You must be on Material UI v5+. If you're in the process of upgrading your Material UI version, you should complete that upgrade first.

**1. Update the import**
Depending on the Material UI version you are using, you must update the import as follows:

```javascript
// The legacy Grid component is named GridLegacy
-import Grid from '@mui/material/GridLegacy';

// The updated Grid component is named Grid
+import Grid from '@mui/material/Grid';
```

**2. Remove legacy props**

The `item` and `zeroMinWidth` props have been removed in the updated Grid. You can safely remove them:

```diff
-<Grid item zeroMinWidth>
+<Grid>
```

**3. Update the size props**

*Skip this step if you're using Material UI v5.*

In the `GridLegacy` component, the size props were named to correspond with the theme's breakpoints. For the default theme, these were `xs`, `sm`, `md`, `lg`, and `xl`.

Starting from Material UI v6, these props are renamed to `size` on the updated Grid:

```diff
 <Grid
-  xs={12}
-  sm={6}
+  size={{ xs: 12, sm: 6 }}
```

If the size is the same for all breakpoints, then you can use a single value:

```diff
-<Grid xs={6}>
+<Grid size={6}>
```

Additionally, the `true` value for the size props was renamed to `"grow"`:

```diff
-<Grid xs>
+<Grid size="grow">
```

You can use the following codemod to update the size props:

`npx @mui/codemod@next v7.0.0/grid-props <path/to/folder>`

The codemod requires updating the imports beforehand.

**4. Opt in to legacy negative margins**

*Skip this step if you're using Material UI v6 or v7.*

If you're using Material UI v5 and want to apply the negative margins similar to `GridLegacy`, specify `disableEqualOverflow={true}` on the grid container. To apply to all grids, add the default props to the theme:

```javascript
import { createTheme, ThemeProvider } from '@mui/material/styles';
import Grid from '@mui/material/Unstable_Grid2';

const theme = createTheme({
  components: {
    MuiGrid2: {
      defaultProps: {
        // all grids under this theme will apply
        // negative margin on the top and left sides.
        disableEqualOverflow: true,
      },
    },
  },
});

function Demo() {
  return (
    <ThemeProvider theme={theme}>
      <Grid container>...grids</Grid>
    </ThemeProvider>
  );
}
```

**Common issues**

**Column direction**

Using `direction="column"` or `direction="column-reverse"` is not supported on `GridLegacy` nor on the updated Grid. If your layout used `GridLegacy` with these values, it might break when you switch to the updated Grid. If you need a vertical layout, follow the instructions in the Grid documentation.

**Container width**

The updated Grid component doesn't grow to the full width of the container by default. If you need the grid to grow to the full width, you can use the `sx` prop:

```diff
-<GridLegacy container>
+<Grid container sx={{ width: '100%' }}>

// alternatively, if the Grid's parent is a flex container:
-<GridLegacy container>
+<Grid container sx={{ flexGrow: 1 }}>
```

**Codemod not covering wrapped Grid components**

The provided codemods won't cover Grid components which are wrapped in other components or styled:

```javascript
// The codemod won't cover StyledGrid
const StyledGrid = styled(Grid)({
  // styles
});

// The codemod won't cover WrappedGrid
const WrappedGrid = (props) => <Grid {...props} />;
```

You'll need to manually update these components.

---

## 5. Piano di Lavoro

*Questa sezione è vuota. L'applicazione è considerata completa in attesa di ulteriori istruzioni.*

---

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

***REGOLA DELLA SCRITTURA IN ITALIANO***
L'IA DEVE SCRIVERE IN CHAT IN LINGUA ITALIANA.

---
