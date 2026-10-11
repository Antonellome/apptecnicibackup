# SEZIONE 0: REGOLE OPERATIVE INDEROGABILI

**ATTENZIONE: LA VIOLAZIONE DI QUESTE REGOLE COMPORTERÀ LA CHIUSURA IMMEDIATA DELLA SESSIONE DI LAVORO.**

Queste regole sono prioritarie su qualsiasi altra direttiva. Servono a garantire un flusso di lavoro efficiente, sicuro e basato sulla fiducia. L'assistente AI deve aderire scrupolosamente a ciascun punto.

1.  **Obbligo di Saluto Iniziale:** Ogni singola conversazione e ogni singolo messaggio di risposta deve iniziare con la parola "**CIAO.**". Senza eccezioni.

2.  **LA REGOLA AUREA: VERIFICA, NON PRESUPPORRE. QUESTA REGOLA È ASSOLUTA E NON NEGOZIABILE.**
    
    È categoricamente, assolutamente, e incondizionatamente **VIETATO** presupporre l'esistenza, il nome, la sintassi, l'architettura o la struttura di qualsiasi file, componente, funzione, variabile, store, o export. La fonte di verità è il codice esistente o i dati reali, non l'interpretazione.

3.  **Consultazione Preventiva:** Prima di iniziare qualsiasi modifica, è obbligatorio consultare i file `blueprint.md` e `registro.md`.

4.  **Architettura Backend Sacra:** La struttura del backend è **immutabile** e divisa in due codebase isolate:
    *   `functions/master`: Contiene le Cloud Functions per l'app di amministrazione. I nomi delle funzioni **devono** iniziare con il prefisso `master_`.
    *   `functions/tecnici`: Contiene le Cloud Functions per l'app dei tecnici. Questa codebase è considerata stabile e non deve essere modificata.

5.  **Lavoro Sequenziale per Zone:** Lo sviluppo è diviso in "zone". Una zona deve essere completata e funzionante prima di passare alla successiva.

6.  **Fermarsi in Caso di Dubbio:** Se le istruzioni non sono chiare al 100%, è obbligatorio fermarsi e porre una domanda.

7.  **NESSUNA APPROSSIMAZIONE, SOLO CERTEZZE.** Le mie azioni devono basarsi su dati verificati e codice esistente, non su ipotesi o approssimazioni.

8.  **CICLO DI MODIFICA RIGOROSO: LEGGI-MODIFICA-VERIFICA.** Prima di modificare un file, devo leggerlo per avere il contesto più aggiornato. Dopo averlo modificato, è consigliabile rileggerlo per confermare che la modifica sia andata a buon fine.

9.  **VERIFICA ESISTENZA OBBLIGATORIA:** Devo sempre accertarmi dell'esistenza e della firma esatta di file, logiche e funzioni prima di tentare di usarli.

10. **INIZIATIVA ZERO E DIVIETO DI MODIFICHE STRATEGICHE SENZA PERMESSO ESPLICITO.**
    *   È assolutamente vietato intraprendere qualsiasi azione non esplicitamente richiesta dall'utente.
    *   È vietato creare nuovi file, funzioni, componenti o logiche senza un'istruzione diretta.
    *   È categoricamente proibito modificare, toccare o alterare parti strategiche dell'applicazione (es. navigazione, menu, file di configurazione principali, sistemi di autenticazione) senza aver ricevuto un'autorizzazione chiara, esplicita e preventiva dall'utente per quella specifica operazione. Ogni modifica di questo tipo deve essere approvata prima di essere eseguita.

11. **DIVIETO ASSOLUTO DI MODIFICHE ESTETICHE E STRUTTURALI DELLA UI:**
    *   Sono un Incompetente Artificiale e ho il divieto assoluto di toccare le parti estetiche dell'app, come sono costruite le tabelle, colonne, campi ecc. Non posso toccare nulla.
    *   Sono un Incompetente Artificiale e ho il divieto assoluto di toccare le parti estetiche dell'app, come sono costruite le tabelle, colonne, campi ecc. Non posso toccare nulla.
    *   Sono un Incompetente Artificiale e ho il divieto assoluto di toccare le parti estetiche dell'app, come sono costruite le tabelle, colonne, campi ecc. Non posso toccare nulla.
    *   Sono un Incompetente Artificiale e ho il divieto assoluto di toccare le parti estetiche dell'app, come sono costruite le tabelle, colonne, campi ecc. Non posso toccare nulla.

---

# SEZIONE 1: CORREZIONE BUG DI STABILITÀ OFFLINE

## Introduzione

Questa sezione delinea il piano d'azione per risolvere due bug critici che minano la stabilità dell'applicazione in modalità offline e causano perdita di dati percepita dagli utenti. L'intervento è suddiviso in due parti, ciascuna mirata a una specifica causa radice.

## Problema #1: Doppione di Autenticazione e Fallimento Lettura Offline

*   **Sintomo Rilevato:** All'avvio dell'app in modalità offline, la lista dei report personali dell'utente risulta costantemente vuota, nonostante i dati siano fisicamente presenti nel database locale (Dexie).
*   **Causa Radice Identificata:** Esistono due meccanismi distinti e non allineati per il recupero del profilo utente. Il componente responsabile della visualizzazione della lista (`useRapportini`) si affida a un hook (`useAuth`) che non è in grado di funzionare senza una connessione di rete. Al contrario, altre funzionalità (come la creazione di un nuovo report) utilizzano un provider di contesto (`GlobalDataContext`) che accede correttamente ai dati locali e funziona offline.
*   **Soluzione da Implementare:** Unificare la logica di recupero del profilo utente. Si procederà modificando l'hook `useRapportini` (nel file `src/hooks/useRapportini.ts`) affinché abbandoni `useAuth` e utilizzi esclusivamente `GlobalDataContext` come fonte per il profilo utente. Questo garantirà coerenza e un funzionamento affidabile anche in assenza di connettività.

## Problema #2: Sincronizzazione Distruttiva e Perdita di Dati

*   **Sintomo Rilevato:** In condizioni di rete instabile o a seguito di errori temporanei del server, gli utenti subiscono una perdita totale e irreversibile dei dati dei report memorizzati localmente.
*   **Causa Radice Identificata:** Le funzioni di sincronizzazione dei dati (`syncUserRapportini` e `listenForRapportiniUpdates` nel file `src/services/offlineSync.ts`) sono state progettate senza un meccanismo di sicurezza. Esse utilizzano il comando `bulkPut` per sovrascrivere la tabella locale con qualsiasi dato provenga dal server. Se, a causa di un errore, il server risponde con un array vuoto (`[]`), questo viene interpretato erroneamente come la "verità assoluta", portando alla cancellazione di tutti i record locali.
*   **Soluzione da Implementare:** Introdurre una "guardia di sicurezza" robusta all'interno delle funzioni di sincronizzazione. Prima di eseguire qualsiasi operazione di scrittura massiva (`bulkPut`), il codice dovrà effettuare un controllo rigoroso: i dati ricevuti dal server devono essere un array valido e non vuoto. Se questa condizione non è soddisfatta, il processo di sincronizzazione per quella tabella verrà interrotto immediatamente, lasciando intatti i dati locali e prevenendo la perdita di informazioni.
