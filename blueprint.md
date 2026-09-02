# Blueprint di Progetto e Piano di Lavoro

## 1. Regola di Comunicazione Fondamentale
CIAO: Ogni mio commento in questa chat, senza eccezioni, deve iniziare con la parola "CIAO".

## 2. Architettura del Progetto (Come da me appreso)
*   **Master App:** È l'applicazione principale, una sorta di gestionale per l'ufficio. È responsabile della definizione e del deploy di tutte le Cloud Functions su Firebase.
*   **App Tecnici (Questo Progetto):** È l'applicazione client che sto riparando. Viene usata dai tecnici sul campo per creare rapportini, fare check-in e sincronizzare dati. È un "client" puro.
*   **Comunicazione:** L'App Tecnici comunica con la Master App esclusivamente tramite le Cloud Functions. I nomi e le funzionalità di queste funzioni sono definiti unicamente dalla Master App.

## 3. Le Cloud Functions Corrette (La nostra "Fonte di Verità")
Questa è la lista delle funzioni **corrette e immutabili** presenti nel file `comunicazione.md` che l'App Tecnici deve chiamare. Qualsiasi discrepanza nel codice del client va corretta per allinearsi a questi nomi.

*   `sync_manifest`
*   `syncAllAnagrafiche`
*   `getAllRapportiniForSync`
*   `createRapportino`
*   `updateRapportino`
*   `deleteRapportino`
*   `createCheckin`
*   `getCheckinsUpdates`
*   `saveFCMToken`
*   Altre funzioni di amministrazione (non direttamente usate dal flusso principale del tecnico).

## 4. Analisi degli Errori e Piano di Ripristino
**Obiettivo:** Riportare l'app allo stato funzionante in cui si trovava prima dei miei interventi sbagliati.

1.  **Problema Iniziale:** L'app è stata rotta da miei interventi precedenti che hanno modificato i nomi delle funzioni nel client (`src/api/service.ts`), creando una fatale discrepanza con il server.
2.  **Errore Specifico Identificato:** Il client tentava di chiamare funzioni con nomi errati:
    *   Chiamava `getLastSyncTimestamp` (ERRATO)
    *   Chiamava `getNotifiche` (NOME NON TROVATO)
    *   Chiamava `markNotificationAsRead` (NOME NON TROVATO)
3.  **Azione Correttiva Eseguita:**
    *   Ho corretto **solo ed esclusivamente** il file del client `src/api/service.ts`.
    *   Ho modificato la definizione della chiamata, facendo in modo che la chiave `getLastSyncTimestamp` (usata internamente dall'app) ora punti al nome corretto della funzione sul server: `sync_manifest`.
    *   **Risultato:** La chiamata per l'handshake di sincronizzazione iniziale ora dovrebbe avere successo, sbloccando il flusso principale dell'app.
4.  **Stato Attuale e Prossimi Passi:**
    *   **Core App:** Il flusso principale di sincronizzazione e gestione rapportini dovrebbe essere stato ripristinato. Dobbiamo verificarlo.
    *   **Pagina Notifiche:** Come da te richiesto, questa pagina è stata ignorata per ora. Le chiamate a `getNotifiche` e `markNotificationAsRead` sono ancora presenti ma, non trovando corrispondenza sul server, falliranno. Questa parte verrà sistemata in un secondo momento.

Il mio compito ora è di procedere con l'analisi e la correzione di eventuali altri errori nell'app, tenendo questo blueprint come guida e rispettando le regole stabilite.
