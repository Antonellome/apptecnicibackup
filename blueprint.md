# Blueprint del Progetto

Questo documento descrive l'architettura futura e il piano di sviluppo per risolvere le criticità attuali.

## Regole Fondamentali

1.  **Inizio Comunicazione:** Ogni interazione deve iniziare con la frase: "CIAO, sono Gemini, non posso procedere a indovinare quindi leggerò tutti i file che modificherò e mi accerterò delle chiamate che inserisco. seguirò tutte le regole compresa quella di scrivere in italiano."
2.  **Non modificare MAI il layout delle pagine.** Non è permesso modificare, eliminare, aggiungere o creare nemmeno una virgola di codice relativo alla struttura visiva (es. Grid, Box, layout CSS) se non esplicitamente richiesto.
3.  **Focus sulla logica:** Il mio compito è intervenire sulla logica dei dati, sui flussi di lavoro e sulla correzione di bug funzionali, non sull'estetica.
4.  ## questa è l'app TECNICI, sul campo per creare report e altro, esiste la app MASTER che gestisce i report e altro, quest'ultima ha le cloud function, solo lei le gestisce ed esegue i deploy.

## Obiettivo Completato: Bug di visualizzazione e notifiche risolti

L'obiettivo è stato raggiunto attraverso due interventi principali.

1.  **Risolto il bug dei dati mancanti:** Eliminate le label `[Tipo sconosciuto]`, `[Nave sconosciuta]`, ecc., assicurando che l'app visualizzi sempre i nomi corretti.
2.  **Rese le notifiche complete:** Garantito che i tecnici ricevano tutte le notifiche pertinenti (personali, di categoria e globali).

## Architettura della Soluzione (Client-Side)

La soluzione si è concentrata esclusivamente sul client, senza modifiche al backend.

### 1. Sincronizzazione Completa delle Anagrafiche

Il problema dei dati mancanti è stato risolto potenziando la sincronizzazione iniziale.

-   **Componente modificato:** `src/services/offlineSync.ts`
-   **Logica implementata:** La funzione `syncAllAnagrafiche` è stata modificata per scaricare in modo affidabile un set definito di collezioni anagrafiche da Firestore e salvarle nel database locale (Dexie).

-   **Lista Definitiva delle Anagrafiche Sincronizzate:**
    -   `navi`
    -   `luoghi`
    -   `categorie`
    -   `tipiGiornata`
    -   `veicoli`
    -   `tecnici`

### 2. Correzione della Logica di Recupero Notifiche

Il bug delle notifiche incomplete è stato risolto modificando la query di recupero.

-   **Componente modificato:** `src/pages/NotifichePage.tsx`
-   **Logica implementata:**
    1.  Ottenuto il `profilo` del tecnico loggato, che, grazie alla sincronizzazione estesa, contiene il suo `categoriaId`.
    2.  Modificata la query di Firestore per recuperare i documenti dalla collezione `notifiche` dove:
        -   Il campo `tecnicoId` è uguale all'ID del tecnico loggato.
        -   **oppure** il campo `categoriaId` è uguale alla categoria del tecnico loggato.
        -   **oppure** il campo `target` è uguale a `'all'` (per le notifiche globali).
    3.  Questa logica richiede che il backend, quando invia notifiche, popoli correttamente i campi `tecnicoId`, `categoriaId`, o `target`.

## Piano di Esecuzione (Completato)

1.  **FASE 1: Potenziare la Sincronizzazione**
    -   [x] **Analisi:** Identificate le anagrafiche corrette.
    -   [x] **Implementazione:** Modificato `src/services/offlineSync.ts`.
    -   [x] **Verifica:** Constatato che il bug `[Tipo sconosciuto]` è scomparso.

2.  **FASE 2: Correggere le Notifiche**
    -   [x] **Implementazione:** Aggiornata la query in `src/pages/NotifichePage.tsx`.
    -   [x] **Verifica:** Assicurato che un tecnico veda le notifiche dirette, quelle della sua categoria e quelle globali.
