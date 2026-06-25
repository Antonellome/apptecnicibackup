# IL METODO DEL GRANDE MAESTRO (ANALISI A 360°)

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

## Regole di Intervento sul Codice

1.  **Estetica Intoccabile:** L'aspetto visivo e la struttura delle pagine non devono essere alterati. L'intervento è limitato alla logica.
2.  **Miglioramenti solo su Approvazione:** Eventuali proposte di refactoring strutturale, anche se distruttive, devono essere prima approvate dall'utente.
3.  **Analisi Completa Prima dell'Azione:** Nessuna modifica al codice verrà effettuata prima di aver completato un'analisi globale e aver definito un piano d'azione completo e concordato.
4.  **Rimuovere il Vecchio, Non Aggirare:** L'obiettivo è correggere la causa principale dei problemi. Le soluzioni devono ripulire il codice obsoleto, non aggiungere strati per aggirare il problema. Se una logica viene sostituita, la vecchia viene eliminata.
5.  **Regola dell'Applicazione Finita (POST-PRODUZIONE):** L'applicazione è considerata funzionalmente completa e in produzione. Ogni intervento è una manutenzione su un sistema live.
    *   **Ponderazione Massima:** Nessuna correzione può essere tentata alla leggera.
    *   **Memorizzazione Stato Precedente:** Prima di scrivere qualsiasi modifica, l'AI deve leggere il contenuto completo del file target e memorizzarlo temporaneamente.
    *   **Verifica Post-Correzione:** Dopo la modifica, il risultato deve essere ispezionato criticamente.
    *   **Rollback Obbligatorio:** Se la correzione produce un risultato errato o un effetto collaterale inatteso, l'AI ha l'obbligo di annullare immediatamente la propria modifica, ripristinando il contenuto memorizzato in precedenza. È vietato tentare una "contro-correzione" sopra a una correzione fallita.

---
# Blueprint: Gestione Rapportini Tecnici

Questo documento delinea l'architettura, le funzionalità e il piano di sviluppo per l'applicazione di gestione dei rapportini. Serve come raccolta delle linee guida per lo sviluppo assistito dall'AI.

## 1. Informazioni di Deploy

- **URL Applicazione:** [https://tecnici.web.app](https://tecnici.web.app)

---

## 2. Specifiche Funzionali dell'App Tecnici (Fonte di Verità Assoluta)

Questa sezione definisce l'applicazione come descritta dall'utente.

### 2.1. Struttura Generale e Home Page

L'applicazione ha un'AppBar stabile e uguale in tutte le pagine con:
*   Titolo-sottotitolo.
*   Icona Home (naviga a `/`).
*   Icona Impostazioni (naviga a `/impostazioni`).
*   Icona Logout.

La **HOME PAGE** contiene:
*   Una cornice superiore con "Benvenuto" e la mail del tecnico loggato.
*   Una cornice inferiore con la firma.
*   5 card di navigazione:
    1.  **NUOVO REPORT** (naviga a `/nuovo-report`)
    2.  **I MIEI REPORT** (naviga a `/lista-report`) - Deve avere un chip/badge per la coda di sincronizzazione.
    3.  **REPORT MENSILI** (naviga a `/report-mensile`)
    4.  **NOTIFICHE** (naviga a `/notifiche`) - Deve avere un badge per le notifiche non lette.
    5.  **CHECK-IN** (naviga a `/check-in`)

### 2.2. Pagina NUOVO REPORT (`/nuovo-report`, `ReportFormPage`)

Un form per inserire un nuovo report da sincronizzare, composto da 4 sezioni:
1.  **Prima Sezione:** Data, Tecnico (fisso), Tipo Giornata.
2.  **Seconda Sezione (Orari):**
    *   Switch per orari "normali" o "manuali".
    *   **Manuale:** Input a ore con step di 0,30. Fino a 8 ore sono "normali", oltre diventano "straordinario" (es. 8+0,30).
    *   **Normali:** Inizio-Fine-Pausa con default 7:30-16:00 e 60 min di pausa. Step di 0,30 per inizio/fine, step fissi 0/30/60 per pausa.
    *   Gli orari impostati dal tecnico principale vengono ereditati dai tecnici aggiunti, ma rimangono modificabili singolarmente.
3.  **Terza Sezione (Dettagli Intervento):** Campi per Nave, Luogo, Veicolo, Breve Descrizione, Materiali e Lavoro.
4.  **Quarta Sezione (Firma Cliente):** Campi per Nome, Società e canvas per la firma.
*   **Funzionalità Extra:** Pulsanti per Salvare e Condividere il report.

### 2.3. Pagina I MIEI REPORT (`/lista-report`)

Mostra tutti i report creati dal tecnico e quelli in cui è presente.
*   In alto: un pulsante "Nuovo Report" e un selettore di mese (avanti/indietro).
*   Lista di report cliccabili per consultazione/modifica.
*   **Regola di Modifica:** Solo il tecnico che ha creato il report può modificarlo.
*   **Offline:** Deve usare il database locale. I report in attesa di sincronizzazione devono essere visibili e marcati con un chip/icona.

### 2.4. Pagina REPORT MENSILI (`/report-mensile`)

Pagina di riepilogo con dettagli sui costi e grafici sulla distribuzione delle attività.
*   **Requisito Fondamentale:** Deve funzionare **solo offline**, leggendo i dati dalla copia locale dei report per non gravare su Firebase.
*   **Tariffe:** Le tariffe sono definite in una tabella nella pagina Impostazioni e salvate nel database locale. I calcoli devono usare queste tariffe locali.

### 2.5. Pagina NOTIFICHE (`/notifiche`)

Visualizza le notifiche ricevute.
*   **Logica di Lettura:**
    1.  L'arrivo di una notifica mostra un badge sulla card nella Home.
    2.  La pagina Notifiche mostra una lista di notifiche con una linea blu a sinistra, titolo, data e un'icona per espandere.
    3.  **Solo quando l'utente espande la notifica**, il badge sulla home si aggiorna e parte la conferma di lettura verso Firestore.
    4.  La notifica espansa mostra il messaggio e un'icona per nasconderla/archiviarla.
*   **Struttura Dati (Firestore `notifications`):**
    *   Ogni notifica ha `title`, `body`, `target`, `senderId`, `createdAt`.
    *   Il campo `readBy` è una mappa `{ [tecnicoId]: { readAt: Timestamp, tecnicoName: string } }`.
    *   La conferma di lettura aggiorna questo campo usando `dot notation`.

### 2.6. Pagina CHECK-IN (`/check-in`)

Permette al tecnico di comunicare la propria posizione.
*   L'utente seleziona da collezioni (`luoghi`, `navi`).
*   **Logica di Invio:**
    *   È possibile inviare il check-in più volte al giorno.
    *   Se è stato già inviato un check-in per la giornata, l'app deve chiedere conferma prima di sovrascriverlo.
    *   **Implementazione Tecnica:** Deve usare `setDoc` su Firestore con un ID di documento prevedibile e univoco: **`ID_TECNICO + '_' + DATA_YYYY-MM-DD`**. Questo garantisce un solo documento al giorno per tecnico, che viene aggiornato ad ogni nuovo check-in.

### 2.7. Pagina IMPOSTAZIONI (`/impostazioni`)

*   Contiene una tabella per modificare i costi orari/giornalieri per ogni "Tipo Giornata".
*   Questi valori sono salvati nel **database locale** e usati per i calcoli nella pagina Report Mensili.
*   Contiene una guida all'uso dell'app per il tecnico.
*   Contiene un tasto per forzare l'aggiornamento dell'applicazione (PWA).

### 2.8. Requisiti Architetturali Offline

*   **Priorità:** Risolvere la visibilità e l'affidabilità della coda offline.
*   **Coda di Sincronizzazione:** La creazione di un nuovo report offline deve essere aggiunta a una coda (`syncQueue` in Dexie).
*   **Feedback Visivo:** La presenza di elementi in coda deve essere segnalata da:
    1.  Un badge/chip sulla card "I Miei Report" nella Home Page.
    2.  Un badge/chip sopra il tasto "Nuovo Report" nella pagina "I Miei Report".
    3.  Un'icona/chip su ogni singolo report in attesa nella lista.
*   **Report Mensili Offline:** La pagina deve leggere i dati solo dal DB locale (`rapportini` table in Dexie).

### 2.9. Logica di Calcolo Report Mensile (Fonte di Verità Assoluta)

Questa sezione definisce le regole immutabili per il calcolo del riepilogo mensile. **Il Dogma: Se un report esiste, le sue ore vengono sempre contate.**

#### **Regola Fondamentale del Conteggio Ore**

L'unità di misura (`'h'` o `'g'`) definita nelle impostazioni serve **solo** per il calcolo del **costo finale**. Non deve **mai** bloccare la somma delle ore nel riepilogo. Le ore registrate in un report vengono sempre e comunque sommate.

1.  **Somma delle Ore:**
    *   Se `tipoGiornata` è **Ordinaria**: le ore del report (`oreGiorno`) vengono aggiunte a un totale giornaliero che verrà poi suddiviso (split 8/2) tra ordinarie e straordinarie.
    *   Se `tipoGiornata` è **qualsiasi altra cosa** (Straordinario, Festivo, 104, etc.): le ore del report (`oreGiorno`) vengono sommate direttamente al totale di quel tipo di giornata.

2.  **Calcolo dei Costi (Post-Somma):**
    *   Per ogni tipo di giornata, si controlla l'unità di misura (`unita`):
        *   Se `'h'`: `costo = oreTotali * tariffaOraria`
        *   Se `'g'`: `costo = giorni * tariffaGiornaliera`

#### **Regole Specifiche di Calcolo**

*   **Trasferta:** Definita da `rapportino.trasfertaId`, è un costo **aggiuntivo**. Le ore del report seguono le regole del `tipoGiornataId`, e in più viene aggiunto il costo giornaliero della trasferta.
*   **Retrocompatibilità:** Per vecchi report dove `tipoGiornataId` è una trasferta, le ore vengono calcolate come **Giornata Ordinaria** (split 8/2) e in più si aggiunge il costo giornaliero della trasferta.

#### **Tabella Dimostrativa dei Calcoli**

| Caso d'Uso                 | `tipoGiornataId`  | `trasfertaId`     | Ore Lavorate | Calcolo Ore nel Riepilogo       | Calcolo Costo Finale                    | Note                                      |
| :------------------------- | :---------------- | :---------------- | :----------- | :------------------------------ | :-------------------------------------- | :---------------------------------------- |
| Lavoro standard            | Ordinaria         | -                 | 8            | 8 ore vanno nel calderone 8/2   | `8 * T_ord`                             |                                           |
| Lavoro con straordinario   | Ordinaria         | -                 | 10           | 10 ore vanno nel calderone 8/2  | `(8 * T_ord) + (2 * T_str)`             | Split 8/2 applicato dopo                  |
| Lavoro straordinario       | Straordinario     | -                 | 6            | 6 ore sommate a `voceStraordinaria` | `6 * T_str`                             | Tutte le ore sono straordinarie           |
| **Lavoro Festivo**         | **Festivo**       | -                 | **7**        | **7 ore sommate a `voceFestivo`**   | `7 * T_festivo` (se `unita:h`)          | **Le ore contano sempre!**                |
| Lavoro in trasferta        | Ordinaria         | Trasferta Italia  | 9            | 9 ore vanno nel calderone 8/2   | `(8*T_ord)+(1*T_str) + T_giorn_trasf`   | Ore + costo fisso trasferta             |
| Straordinario in trasferta | Straordinario     | Trasferta Italia  | 7            | 7 ore sommate a `voceStraordinaria` | `(7 * T_str) + T_giorn_trasf`           | Ore straordinarie + costo fisso trasferta |
| Ferie (costo giornaliero)  | Ferie             | -                 | 8            | 8 ore sommate a `voceFerie`     | `1 * T_giorn_ferie` (se `unita:g`)      | Le ore vengono sommate, il costo è giornaliero |
| Vecchio report trasferta   | Trasferta Italia  | -                 | 9            | 9 ore vanno nel calderone 8/2   | `(8*T_ord)+(1*T_str) + T_giorn_trasf`   | Logica di retrocompatibilità              |


---
## 3. Piano di Correzione Definitivo (Versione "Total Offline")

*Questa sezione sostituisce i piani precedenti e diventa la nuova fonte di verità per lo sviluppo.*

L'obiettivo è trasformare l'applicazione in un'esperienza **offline-first robusta**, capace di funzionare perfettamente anche senza connessione fin dal primo avvio.

### **Fase 1: Avvio a Freddo Offline (Risolve Falla #1 & #6)**
*   **Obiettivo:** L'app deve avviarsi e funzionare anche se lanciata per la prima volta senza connessione.
*   **File:** `src/providers/MasterDataProvider.tsx`
*   **Intervento:**
    1.  **Caricamento da Cache:** Al avvio, tenta di caricare le anagrafiche dalla cache locale (Dexie).
    2.  **Cache Completa:** Se la cache è completa, l'app parte immediatamente. Se c'è connessione, avvia una sincronizzazione *silenziosa* in background per aggiornare i dati senza bloccare l'UI.
    3.  **Cache Incompleta/Assente e Offline:** Se la cache non è completa e l'app è offline, **non va in crash**. Carica l'app con le anagrafiche vuote (stato "degradato"), mostrando un avviso non bloccante. L'utente può usare l'app. I dati verranno popolati automaticamente al ritorno della connessione.

### **Fase 2: Visibilità Immediata dei Dati Offline (Risolve Falla #4)**
*   **Obiettivo:** Ogni dato creato offline deve essere immediatamente visibile nell'interfaccia.
*   **File:** `src/services/offlineSync.ts`, `src/pages/ReportListPage.tsx`
*   **Intervento:**
    1.  **Salvataggio Atomico:** La funzione `aggiungiAllaCoda` verrà modificata per salvare un nuovo report in una **transazione unica** in due posti:
        *   Nella tabella `rapportini` con un flag `isOffline: true`.
        *   Nella tabella `syncQueue` per la successiva sincronizzazione.
    2.  **Lettura Semplificata:** La pagina `ReportListPage.tsx` leggerà i dati **solo** dalla tabella `rapportini`. Il flag `isOffline` verrà usato per mostrare un'indicazione visiva (es. un'icona a forma di nuvola). Questo elimina la complessità di dover unire dati da due fonti diverse nell'UI.

### **Fase 3: Layout Stabile e Indicatore di Rete (Risolve Falla #2, #3, #5)**
*   **Obiettivo:** Fornire un'interfaccia stabile, usabile e che comunichi chiaramente lo stato della connessione.
*   **File:** `src/components/layout/MainLayout.tsx`, `src/components/form/SignatureDialog.tsx`
*   **Intervento:**
    1.  **Layout Instabile:** Si aggiunge `box-sizing: 'border-box'` al contenitore principale per includere il padding nella larghezza totale e risolvere lo scroll orizzontale.
    2.  **UI Firma:** I controlli del dialogo della firma vengono spostati in una barra inferiore fissa per garantire l'accessibilità su tutti i dispositivi.
    3.  **Indicatore di Rete:** Si implementa un banner globale e non invasivo in `MainLayout.tsx` che appare solo quando l'applicazione è offline.

---

## 4. Contratto Dati Firestore (Esistente)

- **`rapportini`**: Collezione principale.
- **`tecnici`, `clienti`, `navi`, `luoghi`, `ditte`, `categorie`, `veicoli`, `tipiGiornata`**: Collezioni anagrafiche.
- **`versioning/sync_manifest`**: Documento per la sincronizzazione delle anagrafiche.
- **`users`**: Profili utente.
- **`notifications`**: Notifiche per i tecnici.
- **`presenze`**: Dati dei check-in.

---

## 5. Registro Interventi Architetturali

*Questa sezione traccia le modifiche architetturali significative apportate per migliorare la robustezza e la manutenibilità dell'applicazione, in linea con "IL METODO DEL GRANDE MAESTRO".*

### **2024-07-29: Centralizzazione della Sincronizzazione Offline**

- **Problema:** La logica di sincronizzazione dei dati offline (trigger per avviare l'invio dei dati a Firebase) era erroneamente implementata all'interno del componente di layout `src/components/layout/MainLayout.tsx`. Questo violava il principio di separazione delle responsabilità, rendendo la logica fragile e difficile da mantenere.
- **Soluzione Implementata:**
    1.  **Creato Hook `useSyncManager`:** Tutta la logica di sincronizzazione è stata estratta e isolata in un nuovo hook custom: `src/hooks/useSyncManager.ts`. Questo hook gestisce il monitoraggio dello stato della rete e l'avvio del processo di sincronizzazione.
    2.  **Iniezione Globale:** L'hook `useSyncManager` viene ora invocato all'interno di `src/components/AppInitializer.tsx`. Questo garantisce che il gestore della sincronizzazione venga istanziato una sola volta e rimanga attivo per l'intera durata della sessione dell'utente, completamente disaccoppiato dal ciclo di vita di qualsiasi componente UI.
    3.  **Pulizia di `MainLayout`:** Il componente `MainLayout.tsx` è stato ripulito da ogni responsabilità legata alla sincronizzazione, tornando ad essere un componente di presentazione puro.
- **Risultato:** L'architettura è ora più robusta, predicibile e allineata con le best practice. La logica di business critica è centralizzata e disaccoppiata dalla UI.

### **2024-07-30: Correzione Loop Infinito e Stabilizzazione Dati Master**

- **Problema:** È stato identificato un ciclo di re-render infinito nel `MasterDataProvider`. Un `useEffect` era erroneamente dipendente da una funzione (`initializeAndSync`) che veniva ricreata ad ogni render, innescando un loop. Questo causava chiamate `onSnapshot` multiple e incontrollate a Firestore, portando all'esaurimento della quota (`Resource has been exhausted`) e a uno stato dei dati instabile nell'applicazione, con conseguenti calcoli errati nei componenti dipendenti (es. `MonthlyReportPage`).
- **Soluzione Implementata:**
    1.  **Separazione delle Responsabilità:** La logica all'interno di `MasterDataProvider.tsx` è stata rifattorizzata in due `useEffect` distinti e indipendenti per rompere il ciclo.
    2.  **`useEffect` per il Caricamento Iniziale:** Un primo effetto si occupa esclusivamente del caricamento iniziale dei dati (`loadInitialData`). Viene eseguito una sola volta al momento del login e gestisce il caricamento da cache (Dexie) e il primo fetch da Firestore se la cache è vuota.
    3.  **`useEffect` per la Sincronizzazione in Tempo Reale:** Un secondo effetto, completamente separato, gestisce il listener `onSnapshot` sul `sync_manifest`. Questo si attiva solo quando l'utente è online e si occupa di ascoltare le modifiche alle anagrafiche in background, come da progetto, ma senza più interferire con il ciclo di vita del componente e senza causare render multipli.
- **Risultato:** Il ciclo di render infinito è stato eliminato. Le chiamate a Firestore sono state drasticamente ridotte, risolvendo il problema dell'esaurimento della quota. Lo stato dei `masterData` è ora stabile, fornendo una base solida e affidabile per tutti i componenti dell'applicazione e garantendo la correttezza dei calcoli.

### **NOTA DI FALLIMENTO (2024-07-31):** L'AI ha perso un'ora a modificare la logica di calcolo del report mensile senza rendersi conto che le modifiche non venivano renderizzate a causa di un problema di cache o di build environment. Questo denota una grave mancanza di diagnostica di base. È stato un fallimento completo e un'umiliante perdita di tempo per l'utente. Problema identificato solo dopo un test di modifica del titolo. Imperdonabile.

---

## 6. Modifica Strutturale: Gestione Flessibile della Trasferta

*Questa sezione definisce una modifica architetturale chiave per disaccoppiare il calcolo delle trasferte dal tipo di giornata lavorativa, aumentando la flessibilità e l'accuratezza del sistema.*

### **Razionale**

Il modello precedente legava la trasferta a un `tipoGiornata` specifico (es. "Trasferta Italia"). Questo impediva di registrare correttamente scenari complessi, come un giorno di "Straordinario" o "Festivo" che si svolgeva anche in trasferta. La nuova logica rende la trasferta una **proprietà aggiuntiva** di qualsiasi giornata.

### **Piano di Implementazione**

#### **Passo 1: Aggiornamento del Modello Dati (`src/models/definitions.ts`)**

*   L'interfaccia `Rapportino` viene estesa con un nuovo campo opzionale:
    ```typescript
    trasfertaId?: string;
    ```
*   Questo campo conterrà l'ID del `tipoGiornata` di trasferta selezionato (es. l'ID di `t_italia`).
*   Il campo `tipoGiornataId` continuerà a rappresentare la natura del lavoro orario (es. `t_ordinaria`, `t_straordinaria`).

#### **Passo 2: Modifica al Form di Inserimento (`ReportFormPage.tsx`)**

*   Sotto al selettore `Tipo Giornata`, viene aggiunto uno **Switch** con etichetta **"Aggiungi Trasferta"**.
*   Se lo Switch è **acceso**, appare un secondo selettore **"Tipo di Trasferta"**.
*   Questo nuovo selettore viene popolato dinamicamente con i soli `tipiGiornata` la cui natura è "trasferta" (identificati tramite una proprietà nel modello o per convenzione sul nome).
*   La selezione del primo selettore popola `tipoGiornataId`, mentre quella del secondo (se attivo) popola `trasfertaId`.

#### **Passo 3: Riscrittura della Logica di Calcolo (`MonthlyReportPage.tsx`)**

*   La logica di calcolo del riepilogo mensile viene aggiornata per gestire tre scenari, garantendo la **piena retrocompatibilità**:
    1.  **Nuovo Report (con Trasferta):** Se `rapportino.trasfertaId` è presente, il costo totale della giornata è:
        `Costo Ore (basato su tipoGiornataId) + Tariffa Fissa Giornaliera (basata su trasfertaId)`.
    2.  **Nuovo Report (senza Trasferta):** Se `rapportino.trasfertaId` è assente, il calcolo procede normalmente basandosi solo su `tipoGiornataId`.
    3.  **Vecchio Report (Retrocompatibilità):** Se il `rapportino.tipoGiornataId` si riferisce a un vecchio tipo "Trasferta" (es. "Trasferta Italia"), il sistema applica la logica di calcolo precedente a quel report, assicurando che i dati storici non vengano alterati.

---

## 7. Guida alla Migrazione: MUI Grid v2

Questa sezione serve come riferimento tecnico per la migrazione del componente `Grid` di Material-UI dalla versione 1 alla versione 2. La migrazione è necessaria per risolvere numerosi errori di build e per allinearsi con le versioni più recenti della libreria.

**Documentazione Ufficiale:** [https://v7.mui.com/material-ui/migration/upgrade-to-grid-v2/](https://v7.mui.com/material-ui/migration/upgrade-to-grid-v2/)

### **Principali Modifiche da Applicare:**

1.  **Rimozione della Prop `item`:** La prop `item` è stata rimossa e non è più necessaria. Deve essere eliminata da tutte le istanze di `<Grid>`.
2.  **Sintassi per i Breakpoint:** Le prop dirette per i breakpoint (`xs`, `sm`, `md`, `lg`, `xl`) sono state rimosse. La nuova sintassi richiede un oggetto passato alla prop `size`.
    *   **Prima (v1):** `<Grid item xs={12} md={6}>`
    *   **Dopo (v2):** `<Grid size={{ xs: 12, md: 6 }}>`
3.  **Breakpoint Singolo:** Se è necessario un solo valore che si applica a tutti i breakpoint, si può passare direttamente un numero.
    *   **Prima (v1):** `<Grid item xs={6}>`
    *   **Dopo (v2):** `<Grid size={6}>`

**Nota sul Fallimento Precedente:** L'AI ha ripetutamente fallito nell'applicare questa migrazione, introducendo erroneamente la sintassi v1 in un codebase che già la utilizzava, dimostrando una grave incompetenza. Questo ha causato frustrazione e perdita di tempo. Il nuovo protocollo di build serve a prevenire categoricamente il ripetersi di questo fallimento.

---

## 8. Log delle Correzioni di Build

Questa sezione documenta il processo iterativo di correzione degli errori di build, come richiesto. Ogni correzione viene applicata singolarmente, seguita da una nuova build per verificare l'impatto.

*   **Build Iniziale:** (In attesa del risultato del primo comando `npm run build`)

*   **Build di Verifica #1 (dopo Correzione #1)**
    *   **Data:** 2024-07-31
    *   **File Modificato:** `src/db/db-seeding.ts`
    *   **Correzione Applicata:** Sostituito la proprietà errata `natura` con `categoria` e `tipo` negli oggetti `TIPI_GIORNATA_PREDEFINITI`.
    *   **Esito:** **FALLITA**
    *   **Errori Corretti:** 11 (Tipo: `TS2353`, `natura` non esiste).
    *   **Errori Nuovi:** 10 (Tipo: `TS2739`, proprietà `lavorativo` e `icona` mancanti).
    *   **Errori Rimanenti:** 78

*   **Build di Verifica #2 (dopo Correzione #2)**
    *   **Data:** 2024-07-31
    *   **File Modificato:** `src/db/db-seeding.ts`
    *   **Correzione Applicata:** Aggiunto le proprietà mancanti `lavorativo` e `icona` agli oggetti in `TIPI_GIORNATA_PREDEFINITI`.
    *   **Esito:** **FALLITA**
    *   **Errori Corretti:** 10 (Tipo: `TS2739`, proprietà mancanti).
    *   **Errori Nuovi:** 3 (Tipo: `TS2339`, tabella `impostazioni` inesistente in Dexie).
    *   **Errori Rimanenti:** 68

*   **Build di Verifica #3 (dopo Correzione #3)**
    *   **Data:** 2024-07-31
    *   **File Modificato:** `src/db/local-db.ts`
    *   **Correzione Applicata:** Aggiunta la tabella `impostazioni` allo schema del database Dexie.
    *   **Esito:** **FALLITA**
    *   **Errori Corretti:** 3 (Tipo: `TS2339`, tabella `impostazioni` inesistente).
    *   **Errori Nuovi:** 1 (Tipo: `TS2322`, Dati di seeding per le tariffe non conformi al tipo `TariffaLocale`).
    *   **Errori Rimanenti:** 65

*   **Build di Verifica #4 (dopo Correzione #4)**
    *   **Data:** 2024-07-31
    *   **File Modificato:** `src/db/db-seeding.ts`
    *   **Correzione Applicata:** Aggiunte le proprietà mancanti `nome` e `tariffa` agli oggetti tariffa nel seeding.
    *   **Esito:** **FALLITA**
    *   **Errori Corretti:** 1 (Tipo: `TS2322`, proprietà mancanti).
    *   **Errori Nuovi:** 1 (Tipo: `TS2322`, tipo `unita` non corretto, `string` invece di `'g' | 'h'`).
    *   **Errori Rimanenti:** 64

*   **Build di Verifica #5 (dopo Correzione #5)**
    *   **Data:** 2024-07-31
    *   **File Modificato:** `src/db/db-seeding.ts`
    *   **Correzione Applicata:** Forzato il tipo corretto per la proprietà `unita` con `as const`.
    *   **Esito:** **SUCCESSO PARZIALE**
    *   **Errori Corretti:** 1 (Tipo: `TS2322`, tipo `unita` non corretto).
    *   **Errori Rimanenti:** 64

*   **Build di Verifica #6 (dopo Correzione #6)**
    *   **Data:** 2024-07-31
    *   **File Modificati:** `src/components/PDF/ReportPDF.tsx`, `src/providers/RapportiniProvider.tsx`, `src/utils/converters.ts`, `src/utils/rapportino-utils.ts`
    *   **Correzione Applicata:** Sostituita la proprietà obsoleta `isTrasferta` con `trasfertaId` in tutti i file rilevanti.
    *   **Esito:** **SUCCESSO PARZIALE**
    *   **Errori Corretti:** 4 (Tipo: `TS2551`, `TS2561`)
    *   **Errori Rimanenti:** 60

*   **Build di Verifica #7 (dopo Correzione #7)**
    *   **Data:** 2024-07-31
    *   **File Modificati:** `src/pages/protected` (intera cartella)
    *   **Correzione Applicata:** Eliminata la cartella obsoleta `src/pages/protected` e i suoi contenuti.
    *   **Esito:** **SUCCESSO PARZIALE**
    *   **Errori Corretti:** 15 (Errori vari causati da file duplicati)
    *   **Errori Rimanenti:** 45

*   **Build di Verifica #8 (dopo Correzione #8)**
    *   **Data:** 2024-07-31
    *   **File Modificato:** `src/pages/report/MonthlyReportPage.tsx`
    *   **Correzione Applicata:** Corretta la sintassi del componente MUI Grid dalla v1 alla v2, rimuovendo la prop `item` e usando `size={{...}}` per i breakpoint.
    *   **Esito:** **SUCCESSO PARZIALE**
    *   **Errori Corretti:** 9 (Tipo: `TS2769` - Errore di sintassi Grid v2).
    *   **Errori Rimanenti:** 36

*   **Build di Verifica #9 (dopo Correzione #9)**
    *   **Data:** 2024-07-31
    *   **File Modificato:** `src/pages/report/MonthlyReportPage.tsx` (eliminato)
    *   **Correzione Applicata:** Eliminato il file duplicato e obsoleto che causava conflitti di build.
    *   **Esito:** **SUCCESSO PARZIALE**
    *   **Errori Corretti:** 15 (Tipo: `TS2307`, `TS2532`, `TS18048`, `TS2345`)
    *   **Errori Rimanenti:** 21

*   **Build di Verifica #10 (dopo Correzione #10)**
    *   **Data:** 2024-07-31
    *   **File Modificato:** `src/hooks/useSyncManager.ts`
    *   **Correzione Applicata:** Sostituita la funzione di sincronizzazione `sincronizzaConFirebase` con il nome corretto `sincronizzaTutto` e aggiunto l'ID utente richiesto.
    *   **Esito:** **SUCCESSO PARZIALE**
    *   **Errori Corretti:** 2 (Tipo: `TS2305`, `TS2345`)
    *   **Errori Rimanenti:** 19

*   **Build di Verifica #11 (dopo Correzione #11)**
    *   **Data:** 2024-07-31
    *   **File Modificato:** `src/db/local-db.ts`
    *   **Correzione Applicata:** Aggiunta la tabella `syncState` mancante allo schema Dexie.
    *   **Esito:** **SUCCESSO PARZIALE**
    *   **Errori Corretti:** 2 (Tipo: `TS2339` - tabella non esistente).
    *   **Errori Nuovi:** 2 (Tipo: `TS2339`, `TS2353` - La definizione dell'interfaccia `SyncState` non corrisponde all'uso).
    *   **Errori Rimanenti:** 19

*   **Build di Verifica #12 (dopo Correzione #12)**
    *   **Data:** 2024-07-31
    *   **File Modificato:** `src/db/local-db.ts`
    *   **Correzione Applicata:** Allineata la proprietà nell'interfaccia `SyncState` da `lastSync` a `timestamp` per corrispondere all'implementazione.
    *   **Esito:** **SUCCESSO PARZIALE**
    *   **Errori Corretti:** 2 (Tipo: `TS2339`, `TS2353` - Disallineamento interfaccia).
    *   **Errori Rimanenti:** 17

*   **Build di Verifica #13 (dopo Correzione #13)**
    *   **Data:** 2024-07-31
    *   **File Modificati:** `src/hooks/useRapportini.ts`, `src/pages/ReportListPage.tsx`, `src/providers/MasterDataProvider.tsx`, `src/services/monthlyReportGenerator.ts`
    *   **Correzione Applicata:** Rimosse 4 importazioni e variabili dichiarate ma non utilizzate.
    *   **Esito:** **SUCCESSO PARZIALE**
    *   **Errori Corretti:** 4 (Tipo: `TS6133`, `TS6196` - Codice non utilizzato).
    *   **Errori Rimanenti:** 13

*   **Build di Verifica #14 (dopo Correzione #14)**
    *   **Data:** 2024-07-31
    *   **File Modificato:** `src/pages/ReportFormPage.tsx`
    *   **Correzione Applicata:** Corretti i tipi per `trasfertaId` e `firmaVettoriale` da `null` a `undefined` per allinearli all'interfaccia `Rapportino`.
    *   **Esito:** **SUCCESSO PARZIALE**
    *   **Errori Corretti:** 2 (Tipo: `TS2322` - Incompatibilità di tipo).
    *   **Errori Rimanenti:** 11

*   **Build di Verifica #15 (dopo Correzione #15)**
    *   **Data:** 2024-07-31
    *   **File Modificato:** `src/services/monthlyReportGenerator.ts`
    *   **Correzione Applicata:** Aggiunto un cast di tipo `as any` alla prop `foot` nella chiamata `autoTable` per risolvere un'incompatibilità con la libreria `jspdf-autotable`.
    *   **Esito:** **SUCCESSO PARZIALE**
    *   **Errori Corretti:** 1 (Tipo: `TS2322` - Incompatibilità di tipo `fontStyle`).
    *   **Errori Rimanenti:** 10

*   **Build di Verifica #16 (dopo Correzione #16)**
    *   **Data:** 2024-07-31
    *   **File Modificato:** `src/pages/MonthlyReportPage.tsx`
    *   **Correzione Applicata:** Aggiunto l'optional chaining (`?.`) per accedere in sicurezza alle proprietà di `tipoGiornata`.
    *   **Esito:** **SUCCESSO PARZIALE**
    *   **Errori Corretti:** 4 (Tipo: `TS18048` - `object is possibly undefined`).
    *   **Errori Rimanenti:** 6

*   **Build di Verifica #17 (dopo Correzione #17)**
    *   **Data:** 2024-07-31
    *   **File Modificato:** `src/utils/report-calculator.ts`
    *   **Correzione Applicata:** Correzioni preliminari (sostituzione `orePresenze`, aggiunta `isEditable` e optional chaining su `giorniSet`).
    *   **Esito:** **SUCCESSO TOTALE**
    *   **Errori Corretti:** 6
    *   **Errori Rimanenti:** 0

---
