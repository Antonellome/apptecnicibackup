# Cronistoria del Progetto

Questo documento traccia l'evoluzione dell'applicazione, evidenziando le decisioni architetturali, i problemi riscontrati e le soluzioni adottate.

## Regole Fondamentali

1.  **Non modificare MAI il layout delle pagine.** Non è permesso modificare, eliminare, aggiungere o creare nemmeno una virgola di codice relativo alla struttura visiva (es. Grid, Box, layout CSS) se non esplicitamente richiesto.
2.  **Focus sulla logica:** Il mio compito è intervenire sulla logica dei dati, sui flussi di lavoro e sulla correzione di bug funzionali, non sull'estetica.
3.  **Mai Dare Niente per Scontato:** Prima di modificare un file, leggerlo sempre. Prima di usare una funzione, verificarne la firma. Questo previene errori di refactoring e ipotesi errate.

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
- **Causa Radice:** La query di recupero notifiche è errata e filtra solo per `tecnicoId`. Inoltre, l'app non scarica le informazioni sulla categoria di appartenenza del tecnico.

### Investigazione e Soluzione

- **Analisi Modello Dati:** L'analisi del file `src/models/definitions.ts` ha rivelato che l'identificativo della categoria di un tecnico (`categoriaId`) è memorizzato direttamente nel suo profilo (`Tecnico`).
- **Conclusione:** Non sono necessarie tabelle di collegamento intermedie come `tecniciQualifiche`. La soluzione risiede nel sincronizzare le anagrafiche corrette.

### Piano d'Azione Definitivo (Client-Side)

1.  **Identificare il Responsabile:** Individuato il service `offlineSync.ts` come gestore della sincronizzazione.
2.  **Definire le Anagrafiche Obbligatorie:** La lista completa e definitiva delle collezioni da sincronizzare è:
    - `navi`
    - `luoghi`
    - `categorie`
    - `tipiGiornata`
    - `veicoli`
    - `tecnici`
3.  **Estendere la Sincronizzazione:** Modificato la funzione `syncAllAnagrafiche` in `offlineSync.ts` per scaricare **tutte e sei** le collezioni elencate.
4.  **Correggere la Logica Notifiche:** Modificato la query in `NotifichePage.tsx` per includere le notifiche per categoria e quelle globali, utilizzando il `categoriaId` ottenuto dal profilo del tecnico.
5.  **Risoluzione Errori di Refactoring:** Corretti molteplici errori di importazione causati da ipotesi errate sui nomi e percorsi dei file. Questo ha portato all'aggiunta della Regola Fondamentale n.3.