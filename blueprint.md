# REGOLA FONDAMENTALE: NON MODIFICARE MAI SENZA PRIMA CONTROLLARE.

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
    - **`/impostazioni`**:
        - **Componente:** `ImpostazioniPage`
        - **Scopo:** Pagina per la configurazione delle impostazioni utente, come tariffe e preferenze.

### Gestione Rotte Non Valide
- **`*` (Qualsiasi altra rotta)**:
    - **Azione:** Reindirizza automaticamente l'utente alla rotta radice (`/`) per evitare pagine di errore 404.

---

## Note Tecniche di Sviluppo

### Guida all'Utilizzo del Componente Grid di MUI (v2+)

Per evitare errori di layout ricorrenti, è **obbligatorio** seguire le seguenti linee guida quando si utilizza il componente `Grid` di Material-UI. Questa applicazione utilizza la versione moderna del componente (`Grid` v2), che ha sostituito il vecchio `GridLegacy`.

#### 1. Importazione Corretta
Utilizzare sempre l'importazione diretta dal pacchetto `@mui/material`.

`import Grid from '@mui/material/Grid';`

**NON** utilizzare `@mui/material/GridLegacy`.

#### 2. Rimozione di Prop Obsolete
- La prop **`item` è stata rimossa**. Nella nuova versione, tutti i componenti `Grid` sono considerati *item* per impostazione predefinita.
- La prop **`zeroMinWidth` è stata rimossa** e può essere tranquillamente eliminata.

_Errato (vecchia sintassi):_
`<Grid item zeroMinWidth>`

_Corretto (nuova sintassi):_
`<Grid>`

#### 3. Nuova Sintassi per le Dimensioni (`size`)
Le prop per definire le dimensioni sui breakpoint (es. `xs`, `sm`, `md`) sono state sostituite dalla singola prop `size`, che accetta un oggetto o un valore singolo.

- **Per breakpoint multipli:**
  _Errato:_
  `<Grid xs={12} sm={6}>`

  _Corretto:_
  `<Grid size={{ xs: 12, sm: 6 }}>`

- **Per un valore unico su tutti i breakpoint:**
  _Errato:_
  `<Grid xs={6}>`

  _Corretto:_
  `<Grid size={6}>`

- **Per far crescere un item e occupare lo spazio rimanente:**
  _Errato:_
  `<Grid xs>`

  _Corretto:_
  `<Grid size="grow">`

#### 4. Problemi Comuni e Soluzioni

- **Larghezza del Contenitore (`container`):**
  - Il nuovo `Grid container` **non si espande automaticamente** per occupare tutta la larghezza del suo genitore.
  - **Soluzione:** Aggiungere la prop `sx` per controllare la larghezza.
    - `sx={{ width: '100%' }}` se il genitore è un elemento a blocco.
    - `sx={{ flexGrow: 1 }}` se il genitore è un contenitore flex.

- **Direzione Verticale (`direction="column"`):**
  - La prop `direction="column"` **non è supportata** né nella vecchia né nella nuova Grid. L'uso improprio può causare il collasso del layout.
  - **Soluzione:** Per ottenere un layout verticale, utilizzare un `Stack` o applicare lo stile flexbox direttamente con la prop `sx` su un `Box` o un'altra `Grid` (es. `sx={{ display: 'flex', flexDirection: 'column' }}`).

- **Componenti `Grid` Personalizzati (Wrapped):**
  - Gli script di migrazione automatica (`codemod`) **non funzionano** su componenti `Grid` che sono stati personalizzati o "wrappati".
  - **Soluzione:** Questi componenti devono essere aggiornati **manualmente** per seguire le nuove regole di sintassi.

---

## Specifiche Funzionali

### 1. Dashboard/Home
- **Layout:** Griglia 2x2 con 4 tab di uguali dimensioni.
- **Tab:**
    - Nuovo report
    - Report
    - Report mensili
    - Note
- **Header:** Cornice blu con messaggio di benvenuto e email del tecnico.
- **Footer:** Cornice blu con la firma "by AS".

### 2. App Bar (Globale)
- **Titolo:** "R.I.S.O. App Tecnici"
- **Sottotitolo:** "Report Individuali Sincronizzati Online"
- **Icone (destra):**
    - Switch Tema (chiaro/scuro)
    - Notifiche (icona a campanella con badge contatore)
    - Impostazioni
    - Logout

### 3. Pagina Login
- Titolo e sottotitolo dell'applicazione.

### 4. Form "Nuovo Report" (Pagina `NuovoReportPage.tsx`)

Questa pagina consente la creazione e la modifica dei rapportini di lavoro. La sua logica si adatta dinamicamente in base al contesto (creazione, modifica, tipo di giornata).

#### **Logica di Accesso e Blocco**
- **Modalità Modifica (`isEditMode`):** Attivata quando un `reportId` è presente nell'URL.
- **Blocco Modifiche (`isReadOnly`):** Un rapportino è bloccato e non modificabile se:
    1.  L'utente loggato (`loggedInTecnicoId`) non è l'autore originale del rapportino.
    2.  La data del rapportino non rientra nel mese e anno correnti.
- **Messaggio di Blocco:** Se il form è bloccato, viene mostrata un'allerta con la motivazione.

#### **Campi e Variabili di Stato Principali**

- **`isPeriodo` (boolean):** Stato che determina se l'utente sta inserendo un singolo report o un periodo di assenza. Viene controllato da uno switch "Inserisci per un periodo di più giorni".
- **`data` (Date):** Data del singolo rapportino. Usata quando `isPeriodo` è `false`.
- **`dataInizio` (Date) / `dataFine` (Date):** Date di inizio e fine per un periodo di assenza. Usate quando `isPeriodo` è `true`.
- **`tipoGiornataId` (string):** ID del tipo di giornata selezionato (es. Lavoro, Ferie, Malattia).
- **`isLavorativo` (boolean):** Stato derivato da `tipoGiornataId`. Viene impostato a `false` se il nome del tipo giornata contiene parole chiave come "ferie", "malattia", "permesso", "legge 104". Determina quali campi mostrare/nascondere.
- **`isManualEntry` (boolean):** Stato per la modalità di inserimento ore. Controllato da uno switch "Inserimento Manuale Ore".
- **Ore Lavoro:**
    - **Calcolo Automatico (`isManualEntry: false`):**
        - `oraInizio` (string): Ora di inizio (default "07:30").
        - `oraFine` (string): Ora di fine (default "16:30").
        - `pausa` (number): Minuti di pausa (default 60).
        - `oreLavoro` (number): Calcolato automaticamente da `(oraFine - oraInizio - pausa)`.
    - **Inserimento Manuale (`isManualEntry: true`):**
        - `oreLavoro` (number): Selezionato da un menu a tendina (default 8).
- **Riferimenti (da collezioni Firestore):**
    - `veicoloId` (string | null): Veicolo utilizzato.
    - `naveId` (string | null): Nave di riferimento.
    - `luogoId` (string | null): Luogo dell'intervento.
- **Dettagli Intervento:**
    - `descrizioneBreve` (string)
    - `lavoroEseguito` (string)
    - `materialiImpiegati` (string)
- **Collaboratori:**
    - `altriTecniciIds` (string[]): Array di ID dei tecnici che hanno collaborato.

#### **Struttura e Comportamento del Form**

1.  **Switch "Inserisci per un periodo di più giorni":**
    - Visibile solo in modalità **creazione**.
    - Se **attivo (`isPeriodo: true`)**:
        - Mostra i campi `DatePicker` per "Data Inizio" e "Data Fine".
        - Nasconde il `DatePicker` singolo.
        - Nasconde tutti gli altri campi del form (calcolo ore, riferimenti, dettagli).
        - L'unico altro campo visibile è "Tipo Giornata".
    - Se **disattivo (`isPeriodo: false`)**:
        - Mostra il `DatePicker` per la "Data" singola.

2.  **Campo "Tecnico Responsabile":**
    - Mostra l'email dell'utente loggato.
    - Sempre disabilitato.

3.  **Campo "Tipo Giornata" (Select):**
    - Campo obbligatorio.
    - La selezione determina il valore di `isLavorativo`.

4.  **Sezione Lavorativa (visibile solo se `isLavorativo` è `true` e `isPeriodo` è `false`):**
    - **Switch "Inserimento Manuale Ore":**
        - Se **disattivo**: Mostra i selettori per `oraInizio`, `oraFine`, `pausa` e un campo di testo disabilitato con il totale calcolato.
        - Se **attivo**: Mostra un selettore per `oreLavoro` totali.
    - **Campi Autocomplete/Select:**
        - "Altri Tecnici" (selezione multipla)
        - "Nave" (selezione singola)
        - "Luogo" (selezione singola)
        - "Veicolo" (selezione singola)
    - **Campi di Testo:**
        - "Breve Descrizione"
        - "Materiali Impiegati" (multilinea)
        - "Lavoro Eseguito" (multilinea)

#### **Logica di Salvataggio (`handleSubmit`)**

- **Validazione:** Controlla che `data` (o le date periodo) e `tipoGiornataId` siano compilati.
- **Salvataggio Periodo (`isPeriodo: true`):**
    - Controlla che `dataFine` non sia precedente a `dataInizio`.
    - Utilizza un `writeBatch` di Firestore per creare un rapportino per ogni giorno nell'intervallo.
    - Ogni rapportino creato per il periodo è **semplificato**: contiene solo `data`, `tecnicoId`, `tipoGiornataId`, `partecipantiIds`, e valori vuoti/nulli per gli altri campi.
- **Salvataggio Singolo (`isPeriodo: false`):**
    - Crea un singolo oggetto `rapportinoData`.
    - Se `isLavorativo` è `true`, include tutti i dati (ore, riferimenti, dettagli).
    - Se `isLavorativo` è `false`, salva solo i dati essenziali, impostando ore e dettagli a valori nulli/vuoti.
    - Esegue un `updateDoc` (in modalità modifica) o un `addDoc` (in modalità creazione).
- **Navigazione:** Dopo il salvataggio, l'utente viene reindirizzato alla pagina `/reports`.

---

### 5. Pagina Report
- Lista di tutti i report inviati.
- Funzionalità di ricerca intelligente per data, nave, luogo, etc.

### 6. Pagina Report Mensili
- **Logica Dati Locale:** La pagina opererà esclusivamente con i dati dei rapportini già presenti nell'app, senza interrogare il database, per garantire massima reattività.
- **Filtro Globale:** In cima alla pagina, selettori per Mese e Anno permetteranno di filtrare i dati visualizzati in entrambe le sezioni sottostanti.
- **Sezione 1: Resoconto Analitico**
    - **Descrizione:** Una tabella dettagliata per l'analisi delle attività mensili.
    - **Tabella:** Colonne: `Data`, `Tipo Giornata`, `Ore Lavorate`.
    - **Interattività:** Ogni riga sarà cliccabile per aprire una vista di sola lettura del rapportino di riferimento, con un pulsante per tornare alla tabella.
    - **Riepilogo e Calcoli:** In fondo alla tabella verranno mostrati i totali:
        - **Totale Ore** per tipo di giornata (es. "Lavoro Ordinario: 40 ore").
        - **Totale Guadagni** per tipo di giornata (calcolati in base alle tariffe in Impostazioni).
        - **Gran Totale Ore** e **Gran Totale Guadagni** del mese.
- **Sezione 2: Calendario Mensile Interattivo**
    - **Descrizione:** Una vista calendario per una comprensione visiva e immediata del mese.
    - **Visualizzazione:** Ogni giorno del mese sarà una cella. I giorni con un rapportino associato saranno evidenziati con un colore specifico per il `Tipo Giornata` (es. verde per lavoro, giallo per ferie).
    - **Interattività:** Cliccando su un giorno evidenziato si aprirà la stessa vista di dettaglio del rapportino della sezione tabella, con un pulsante per tornare al calendario.

### 7. Pagina Note
- Visualizzazione note in entrata e in uscita.
- Funzionalità per creare una nuova nota con titolo e corpo.
- Integrazione con app "master" per invio e ricezione.

### 8. Pagina Impostazioni
- **Gestione Tariffe Orarie:**
    - Una lista dei `Tipi Giornata` presenti nei rapportini.
    - Accanto a ogni voce, un campo per inserire la tariffa oraria.
    - **Default:** Valore preimpostato a **10€/ora** per ogni tipo. Le tariffe saranno salvate localmente.
- **Guida all'Uso dell'App:**
    - Una sezione testuale, magari espandibile, che spiega le funzionalità principali dell'applicazione al tecnico.
- **Recupero Password:**
    - Un campo per inserire l'email e un pulsante "Invia Link di Reset" per avviare la procedura di cambio password di Firebase Authentication.
- **Backup Report Mensili:**
    - Un selettore per il mese/anno.
    - Un pulsante "Esporta in PDF" per generare e scaricare un PDF del resoconto analitico di quel mese.

### 9. Pagina Notifiche
- Elenco di tutte le notifiche in ordine cronologico inverso (dalla più recente).
- Le notifiche non lette devono avere uno stile differente (es. sfondo evidenziato).
- All'apertura della pagina o al click sulla notifica, le notifiche visualizzate vengono marcate come "lette".n- **Funzionalità:** Aggiungere un'icona (es. un cestino) accanto a ogni notifica **letta** per permetterne l'eliminazione singola.
- **Badge Notifiche:** L'icona nella App Bar e nella Home devono mostrare un badge con il numero di notifiche non lette.
