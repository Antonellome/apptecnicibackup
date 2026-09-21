# Cronistoria del Progetto

Questo documento traccia l'evoluzione dell'applicazione, evidenziando le decisioni architetturali, i problemi riscontrati e le soluzioni adottate.

## Regole Fondamentali

1.  **Inizio Comunicazione:** Ogni interazione deve iniziare con la frase: "CIAO, sono Gemini, non posso procedere a indovinare quindi leggerò tutti i file che modificherò e mi accerterò delle chiamate che inserisco. seguirò tutte le regole compresa quella di scrivere in italiano."
2.  **Non modificare MAI il layout delle pagine.** Non è permesso modificare, eliminare, aggiungere o creare nemmeno una virgola di codice relativo alla struttura visiva (es. Grid, Box, layout CSS) se non esplicitamente richiesto.
3.  **Focus sulla logica:** Il mio compito è intervenire sulla logica dei dati, sui flussi di lavoro e sulla correzione di bug funzionali, non sull'estetica.
4.  **Mai Dare Niente per Scontato:** Prima di modificare un file, leggerlo sempre. Prima di usare una funzione, verificarne la firma. Questo previene errori di refactoring e ipotesi errate.

---

## Fase 1: Analisi Iniziale e Criticità Rilevate

- **Stabilità:** Assenza di `ErrorBoundary` globale.
- **Sincronizzazione Fragile:** Logica di upload inaffidabile e rischio di discrepanze sui dati in download.
- **Funzionalità Incomplete:** Notifiche non funzionanti.
- **Debito Tecnico:** Codice e documentazione obsoleti.

---

## Fase 2: Primi Interventi Correttivi

- **Stabilità:** Introdotto `ErrorBoundary` globale.
- **Pulizia:** Rimozione codice inutilizzato.
- **Architettura Upload:** Spostata tutta la logica di scrittura su Cloud Functions, abbandonando le scritture dirette da client.

---

## Fase 3: Analisi Funzionalità Incomplete e Correzione Sincronizzazione

### Problema 1: Dati Mancanti nell'UI

- **Sintomo:** L'app visualizza `[Tipo sconosciuto]`, `[Nave sconosciuta]`, `[Luogo sconosciuto]`.
- **Causa Radice:** La sincronizzazione iniziale non scarica tutte le anagrafiche necessarie per mappare gli ID ai nomi corrispondenti.

### Problema 2: Notifiche Incomplete

- **Sintomo:** I tecnici ricevono solo le notifiche dirette, ma non quelle inviate al loro gruppo di appartenenza (categoria) o a tutti.
- **Causa Radice:** La query di recupero notifiche è errata e filtra solo per `tecnicoId`.

### Piano d'Azione Definitivo (Client-Side)

1.  **Estendere la Sincronizzazione:** Modificato la funzione `syncAllAnagrafiche` in `offlineSync.ts` per scaricare tutte le anagrafiche necessarie.
2.  **Correggere la Logica Notifiche:** Modificato la query in `NotifichePage.tsx` per includere le notifiche per categoria e quelle globali.

---

## Fase 4: Completamento Sincronizzazione e Notifiche

- **Stato:** Completata.
- **Risultato:** L'applicazione ora sincronizza correttamente i dati essenziali e presenta le notifiche in modo completo e affidabile.

---

## Fase 5: Refactoring del Sistema di Sincronizzazione e Offline

- **Stato:** In corso.

### Problema 1: Sincronizzazione Inefficiente

- **Sintomo:** Dopo ogni check-in, l'intera app ricarica tutti i dati (anagrafiche, rapportini), causando lentezza e consumo eccessivo di dati.
- **Causa Radice:** L'integrazione della nuova `CheckinPage` è stata fatta usando l'unica funzione di sync disponibile (`requestManualSync`), che esegue una sincronizzazione *totale* invece che *incrementale*. Il sistema mancava di una funzione leggera per processare solo la coda delle operazioni offline.

### Problema 2: Gestione Offline Fragile

- **Sintomo 1 (Perdita Dati):** Un'interruzione di rete durante la sincronizzazione potrebbe portare alla perdita di dati locali, poiché il processo attuale svuota le tabelle (`table.clear()`) prima di riempirle.
- **Sintomo 2 (Mancato Auto-Sync):** Se l'utente va offline, accumula modifiche e poi torna online, la sincronizzazione non parte automaticamente. Deve essere avviata manualmente.
- **Causa Radice:** La logica di sincronizzazione è "distruttiva" e il meccanismo di trigger automatico è progettato solo per la primissima sincronizzazione all'avvio dell'app.

### Piano d'Azione Definitivo (Client-Side)

1.  **Rendere la Sincronizzazione Non-Distruttiva:** In `offlineSync.ts`, sostituire l'approccio `clear() + bulkAdd()` con `bulkPut()` per garantire che i dati locali non vengano eliminati durante l'aggiornamento.
2.  **Introdurre la Sincronizzazione Incrementale:** Creare una nuova funzione `triggerQueueSync` in `useSyncManager.ts` che esegua solo il `processSyncQueue`, per una sincronizzazione rapida e leggera.
3.  **Implementare l'Auto-Sincronizzazione al Rientro Online:** Modificare `useSyncManager.ts` per rilevare il passaggio da offline a online e richiamare automaticamente la nuova `triggerQueueSync`.
4.  **Integrare Correttamente la CheckinPage:** Sostituire la chiamata inefficiente `requestManualSync` con la nuova e corretta `triggerQueueSync` nella pagina di check-in.
