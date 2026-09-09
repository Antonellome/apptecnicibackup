# Blueprint del Progetto

Questo documento descrive l'architettura e il piano di sviluppo per l'applicazione.

## Regole Fondamentali

1.  **Inizio Comunicazione:** Ogni interazione deve iniziare con la frase: "CIAO, sono Gemini, non posso procedere a indovinare quindi leggerò tutti i file che modificherò e mi accerterò delle chiamate che inserisco. seguirò tutte le regole compresa quella di scrivere in italiano."
2.  **Non modificare MAI la Grid:** Non è permesso modificare, eliminare, aggiungere o creare manualmente codice relativo al componente `Grid` di Material UI. La migrazione e la gestione di tale componente devono avvenire esclusivamente tramite codemod ufficiali.
3.  **Focus sulla logica:** Il mio compito è intervenire sulla logica dei dati, sui flussi di lavoro e sulla correzione di bug funzionali, non sull'estetica o sul layout.

## Architettura Dati Tariffe (Client-Side)

Questa sezione definisce il flusso di gestione delle tariffe, che deve rimanere **esclusivamente locale** al dispositivo.

1.  **Fonte dei Valori di Default:** I valori di base delle tariffe sono definiti nel file `src/providers/GlobalDataProvider.tsx`. Questi valori vengono usati solo per popolare il database locale la prima volta o in caso di corruzione.
2.  **Database Locale:** Le tariffe modificate dal tecnico vengono salvate nel database locale (Dexie) attraverso la pagina `Impostazioni`.
3.  **Nessuna Sincronizzazione con Firestore:** I dati delle tariffe **NON devono MAI** essere sincronizzati o inviati a Firestore. Rimangono un'impostazione puramente locale.
4.  **Flusso di Lettura per Calcoli:** La pagina `Report Mensili`, per calcolare il "costo stimato", **DEVE** leggere le tariffe esclusivamente dal database locale (tramite il `GlobalDataContext`), mai direttamente da Firestore.

### Tabella dei Valori di Default

Questa è la tabella di riferimento che deve essere usata come fonte di verità per i valori iniziali.

| Voce | Valore | Unità |
| :--- | :--- | :--- |
| Ordinaria | 10.00 | € / ora |
| Straordinario | 15.00 | € / ora |
| Trasferta Italia | 20.00 | € / giorno |
| Trasferta Europa | 40.00 | € / giorno |
| Trasferta ExtraEuropea| 80.00 | € / giorno |
| Festivo | 80.00 | € / giorno |
| Ferie | 80.00 | € / giorno |
| Malattia | 80.00 | € / giorno |
| Legge 104 | 10.00 | € / ora |
| Permesso | 10.00 | € / ora |

## Piano di Esecuzione

1.  **FASE 1: Aggiornamento Blueprint**
    *   [x] **Analisi:** Lettura delle nuove istruzioni.
    *   [x] **Implementazione:** Aggiornato `blueprint.md` con le regole per le tariffe e la migrazione della Grid.
    *   [x] **Verifica:** Il documento ora riflette lo stato attuale delle regole.

2.  **FASE 2: Migrazione Componente Grid**
    *   [ ] **Azione:** Eseguire il codemod per la migrazione dalla `GridLegacy` alla nuova `Grid`.
    *   [ ] **Comando:** `npx @mui/codemod@next v7.0.0/grid-props src`

3.  **FASE 3: Correzione Sincronizzazione Anagrafiche e Notifiche**
    *   [x] **Azione:** Estesa la sincronizzazione (`offlineSync.ts`) per includere tutte le anagrafiche necessarie (`navi`, `luoghi`, `categorie`, `tipiGiornata`, `veicoli`, `tecnici`).
    *   [x] **Azione:** Corretta la query in `NotifichePage.tsx` per recuperare le notifiche personali, di categoria e globali.
    *   [x] **Stato:** **Completata.** I problemi di dati mancanti (`[Tipo sconosciuto]`) e notifiche incomplete sono stati risolti.

4.  **FASE 4: Stabilizzazione Sincronizzazione Offline**
    *   [x] **Azione:** Risolto un bug critico in `CheckinPage.tsx` che impediva la sincronizzazione degli eventi di check-in a causa di un ID mancante nel payload.
    *   [x] **Azione:** Resa la funzione `syncCheckin` in `offlineSync.ts` robusta, per gestire e recuperare anche i dati corrotti preesistenti nella coda di sincronizzazione.
    *   [x] **Stato:** **Completata.** La sincronizzazione offline è ora stabile e non si blocca più su dati vecchi.
