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

### 2.5. Pagina CHECK-IN (`/check-in`)

Permette al tecnico di comunicare la propria posizione.
*   L'utente seleziona da collezioni (`luoghi`, `navi`).
*   **Logica di Invio:**
    *   È possibile inviare il check-in più volte al giorno.
    *   Se è stato già inviato un check-in per la giornata, l'app deve chiedere conferma prima di sovrascriverlo.
    *   **Implementazione Tecnica:** Deve usare `setDoc` su Firestore con un ID di documento prevedibile e univoco: **`ID_TECNICO + '_' + DATA_YYYY-MM-DD`**. Questo garantisce un solo documento al giorno per tecnico, che viene aggiornato ad ogni nuovo check-in.

### 2.6. Pagina IMPOSTAZIONI (`/impostazioni`)

*   Contiene una tabella per modificare i costi orari/giornalieri per ogni "Tipo Giornata".
*   Questi valori sono salvati nel **database locale** e usati per i calcoli nella pagina Report Mensili.
*   Contiene una guida all'uso dell'app per il tecnico.
*   Contiene un tasto per forzare l'aggiornamento dell'applicazione (PWA).

### 2.7. Requisiti Architetturali Offline

*   **Priorità:** Risolvere la visibilità e l'affidabilità della coda offline.
*   **Coda di Sincronizzazione:** La creazione di un nuovo report offline deve essere aggiunta a una coda (`syncQueue` in Dexie).
*   **Feedback Visivo:** La presenza di elementi in coda deve essere segnalata da:
    1.  Un badge/chip sulla card "I Miei Report" nella Home Page.
    2.  Un badge/chip sopra il tasto "Nuovo Report" nella pagina "I Miei Report".
    3.  Un'icona/chip su ogni singolo report in attesa nella lista.
*   **Report Mensili Offline:** La pagina deve leggere i dati solo dal DB locale (`rapportini` table in Dexie).

### 2.8. Logica di Calcolo Report Mensile (Fonte di Verità Assoluta)

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

---

## 3. Modifica Strutturale: Gestione Flessibile della Trasferta

*Questa sezione definisce una modifica architetturale chiave per disaccoppiare il calcolo delle trasferte dal tipo di giornata lavorativa, aumentando la flessibilità e l'accuratezza del sistema.*

### **Razionale**

Il modello precedente legava la trasferta a un `tipoGiornata` specifico (es. "Trasferta Italia"). Questo impediva di registrare correttamente scenari complessi, come un giorno di "Straordinario" o "Festivo" che si svolgeva anche in trasferta. La nuova logica rende la trasferta una **proprietà aggiuntiva** di qualsiasi giornata.

### **Piano di Implementazione**

#### **Passo 1: Aggiornamento del Modello Dati (`src/models/definitions.ts`)**

*   L'interfaccia `Rapportino` viene estesa con un nuovo campo opzionale:
    ```typescript
    trasfertaId?: string;
    ```

#### **Passo 2: Modifica al Form di Inserimento (`ReportFormPage.tsx`)**

*   Viene aggiunto uno **Switch** "Aggiungi Trasferta" e un selettore per il tipo di trasferta.

#### **Passo 3: Riscrittura della Logica di Calcolo (`MonthlyReportPage.tsx`)**

*   La logica di calcolo viene aggiornata per gestire `trasfertaId` come costo aggiuntivo e garantire retrocompatibilità.

---

## 4. Architettura Stabile: Correzioni Critiche e Registro Fallimenti

*Questa sezione traccia le modifiche architetturali più critiche e serve come registro permanente dei fallimenti per evitare errori futuri.*

### **4.1. [RISOLTO] Loop Infinito e Stabilizzazione Dati Master (`MasterDataProvider.tsx`)**

- **Problema:** Un ciclo di re-render infinito nel `MasterDataProvider` causava chiamate incontrollate a Firestore, esaurendo la quota. La causa era una dipendenza instabile (`loadInitialData`) in un `useEffect`.
- **Soluzione Definitiva (2024-08-01):**
    1.  **Internalizzazione della Logica:** La funzione `loadInitialData` è stata spostata *all'interno* dell'`useEffect` di caricamento iniziale.
    2.  **Rottura della Catena:** Questo lega la funzione al ciclo di vita dell'effetto, impedendone la ricreazione a ogni render. Le dipendenze dell'effetto sono ora limitate a stati stabili (`authLoading`, `user`, `isOnline`), eliminando il loop alla radice.
- **Lezione Appresa:** L'uso di funzioni esterne come dipendenze di `useEffect` è un anti-pattern pericoloso se non gestito con `useCallback` e dipendenze primitive. La soluzione più sicura è definire la funzione all'interno dell'effetto che la usa.

### **4.2. [RISOLTO] Crash Fatale all'Avvio (`push-notifications.ts`)**

- **Problema:** L'applicazione andava in crash totale all'avvio con un errore "Retries failed". La causa era un `throw error;` nel servizio di inizializzazione delle notifiche push (FCM). Un fallimento nell'ottenere il token FCM (per permessi negati, configurazione errata, etc.) era un errore fatale che bloccava l'intera app.
- **Soluzione Definitiva (2024-08-01):**
    1.  **Disinnesco dell'Errore:** La riga `throw error;` è stata sostituita con `return null;`.
    2.  **Principio di Non-Criticità:** I servizi non essenziali (come le notifiche) non devono **mai** poter causare un crash dell'applicazione. Devono fallire silenziosamente (loggando l'errore in console) e permettere all'app di continuare a funzionare in modalità degradata.
- **Lezione Appresa:** Ogni `throw` in un servizio asincrono invocato durante il ciclo di vita di un componente React è una potenziale bomba a orologeria. Gestire gli errori localmente e ritornare `null` o uno stato di errore non bloccante.

---

## 5. Riprogettazione Totale: Sistema di Notifiche Pull-Based

*Questa sezione sostituisce completamente il vecchio sistema di notifiche push (FCM) e definisce la nuova architettura, più robusta e resiliente, basata su un modello "pull" (il client chiede i dati).*

### **5.1. Abbandono del Sistema Push (FCM)**

**Decisione:** Il sistema Firebase Cloud Messaging viene **completamente rimosso** dall'applicazione client. Questo elimina:
*   La necessità di ottenere permessi per le notifiche.
*   La gestione di VAPID key e token FCM.
*   Il service worker dedicato (`firebase-messaging-sw.js`).
*   Tutti i punti di fallimento che causavano crash dell'applicazione.

### **5.2. Architettura Pull-Based**

Il client, quando è online, chiede periodicamente al server se ci sono nuove notifiche. Questo è più robusto, efficiente e compatibile con l'uso offline.

### **5.3. Contratto Dati per l'App Master**

Per garantire la massima semplicità ed efficienza sul client, l'onere della complessità viene spostato sull'App Master.

- **Collezione:** `notifications`
- **Struttura Documento:**
    ```json
    {
      "id": "<auto-id>",
      "createdAt": "<Timestamp>", // Obbligatorio e indicizzato
      "senderId": "<string>",
      "tecnicoId": "<string>", // Obbligatorio e indicizzato
      "title": "<string>",
      "body": "<string>"
    }
    ```
- **Regola di Denormalizzazione (Obbligatoria per App Master):**
    *   Per inviare una notifica a un gruppo (es. "Tutti i Tecnici" o "Tecnici Senior"), l'App Master **deve** creare un documento separato nella collezione `notifications` per **ogni singolo tecnico** del gruppo.
    *   È **vietato** creare un singolo documento con un campo `target` generico.

### **5.4. Sincronizzazione Robusta (Lato Client)**

1.  **Manifest di Sincronizzazione:** Viene introdotto un nuovo documento in Firestore: `versioning/notifications_manifest` con un unico campo `lastUpdate: Timestamp`. L'App Master **deve** aggiornare questo timestamp ogni volta che aggiunge nuove notifiche.

2.  **Logica Client:**
    *   L'app dei tecnici memorizza l'ultimo timestamp di sincronizzazione in una nuova tabella Dexie: `syncState`, nel record con id `'notifications'`. 
    *   All'avvio e al ritorno della connessione, un `useNotificationSync` hook confronta il timestamp locale con quello remoto.
    *   Se il timestamp remoto è più recente, viene eseguita una query a Firestore per scaricare solo le notifiche nuove:
        ```
        collection('notifications')
          .where('tecnicoId', '==', MIO_TECNICO_ID)
          .where('createdAt', '>', ultimoTimestampLocale)
        ```
    *   Le nuove notifiche vengono salvate in una nuova tabella Dexie: `notifiche`, con un campo di default `isRead: false`.
    *   Solo dopo il salvataggio locale, il timestamp di sincronizzazione locale viene aggiornato.

### **5.5. Gestione Stato di Lettura (100% Offline)**

*   La vecchia mappa `readBy` su Firestore viene **eliminata**.
*   Lo stato di lettura è un semplice booleano `isRead` su ogni notifica nella tabella `notifiche` di Dexie.
*   Quando l'utente legge una notifica, l'app aggiorna **solo** il record locale. L'operazione è istantanea e non richiede connessione di rete.
*   Un contatore di notifiche non lette (`useUnreadNotificationsCount`) opera sulla tabella locale per aggiornare il badge sulla home page.


