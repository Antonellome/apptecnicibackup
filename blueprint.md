# Blueprint del Progetto

Questo documento descrive l'architettura futura e il piano di sviluppo per risolvere le criticità attuali.

## Regole Fondamentali

1.  **Non modificare MAI il layout delle pagine.** Non è permesso modificare, eliminare, aggiungere o creare nemmeno una virgola di codice relativo alla struttura visiva (es. Grid, Box, layout CSS) se non esplicitamente richiesto.
2.  **Focus sulla logica:** Il mio compito è intervenire sulla logica dei dati, sui flussi di lavoro e sulla correzione di bug funzionali, non sull'estetica.

## Obiettivo Corrente: Risolvere bug di visualizzazione e notifiche

L'obiettivo immediato è duplice:
1.  **Risolvere il bug dei dati mancanti:** Eliminare le label `[Tipo sconosciuto]`, `[Nave sconosciuta]`, ecc., assicurando che l'app visualizzi sempre i nomi corretti.
2.  **Rendere le notifiche complete:** Garantire che i tecnici ricevano tutte le notifiche pertinenti (personali, di categoria e globali).

## Architettura della Soluzione (Client-Side)

La soluzione si concentra esclusivamente sul client, senza modifiche al backend.

### 1. Sincronizzazione Completa delle Anagrafiche

Il problema dei dati mancanti sarà risolto potenziando la sincronizzazione iniziale.

-   **Componente da modificare:** `src/services/offlineSync.ts`
-   **Logica da implementare:** La funzione `syncAllAnagrafiche` deve essere modificata per scaricare in modo affidabile un set definito di collezioni anagrafiche da Firestore e salvarle nel database locale (Dexie).

-   **Lista Definitiva delle Anagrafiche da Sincronizzare:**
    -   `navi`
    -   `luoghi`
    -   `categorie`
    -   `tipiGiornata`
    -   `veicoli`
    -   `tecnici`

### 2. Correzione della Logica di Recupero Notifiche

Il bug delle notifiche incomplete sarà risolto modificando la query di recupero.

-   **Componente da modificare:** `src/pages/NotifichePage.tsx`
-   **Logica da implementare:**
    1.  Ottenere il `profilo` del tecnico loggato, che, grazie alla sincronizzazione estesa, conterrà il suo `categoriaId`.
    2.  Modificare la query di Firestore per recuperare i documenti dalla collezione `notifiche` where:
        -   Il campo `tecnicoId` è uguale all'ID del tecnico loggato.
        -   **oppure** il campo `categoriaId` è uguale alla categoria del tecnico loggato.
        -   **oppure** il campo `target` è uguale a `'all'` (per le notifiche globali).
    3.  Questa logica richiede che il backend, quando invia notifiche, popoli correttamente i campi `tecnicoId`, `categoriaId`, o `target`.

## Piano di Esecuzione

1.  **FASE 1: Potenziare la Sincronizzazione (Azione Immediata)**
    -   [x] **Analisi:** Identificate le anagrafiche corrette (`navi`, `luoghi`, `categorie`, `tipiGiornata`, `veicoli`, `tecnici`).
    -   [x] **Implementazione:** Modificare `src/services/offlineSync.ts` per scaricare le 6 collezioni definite.
    -   [x] **Verifica:** Constatare che il bug `[Tipo sconosciuto]` sia scomparso.

2.  **FASE 2: Correggere le Notifiche**
    -   [x] **Implementazione:** Aggiornare la query in `src/pages/NotifichePage.tsx`.
    -   [x] **Verifica:** Assicurarsi che un tecnico veda le notifiche dirette, quelle della sua categoria e quelle globali.
