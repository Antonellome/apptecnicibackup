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
*   **Logica di Calcolo:**
    *   **Giornata Ordinaria:** (Ore ≤ 8) * tariffa ordinaria + (Ore > 8) * tariffa straordinaria.
    *   **Giornata Straordinaria:** Tutte le ore * tariffa straordinaria.
    *   **Trasferta:** Ore calcolate come ordinarie + tariffa fissa di trasferta.
    *   **Ferie/Festivo/Malattia:** 8 ore di default con tariffa fissa giornaliera.
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
    *   Se è già stato inviato un check-in per la giornata, l'app deve chiedere conferma prima di sovrascriverlo.
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
