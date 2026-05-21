# Piano di Build e Debug

Questo documento traccia lo stato del processo di build e il piano per la risoluzione degli errori.

## Stato Attuale: Build Fallito

Il build del progetto sta attualmente fallendo con una serie di errori di TypeScript. Molti errori iniziali sono stati risolti, ma ne rimangono alcuni critici che impediscono la compilazione.

### Errori Risolti:

*   **`ReportFormPage.tsx`**: Corretto l'uso del componente `Grid` di Material-UI.
*   **`SettingsPage.tsx`**: Corretto l'accesso al database locale e alla tabella delle tariffe.
*   **`TecniciPage.tsx`**: Aggiunte le proprietà mancanti ai tipi e corretto l'uso dei componenti.
*   **`ProtectedLayout.tsx`**: Risolto il problema del doppio `Outlet`.

### Errori Rimanenti:

1.  **`dataSync.ts`**:
    *   `TS2344`: Il tipo `Impostazioni` non soddisfa il vincolo `{ id: string; }`.
    *   `TS2503`: Namespace `NodeJS` non trovato.
2.  **`converters.ts`**:
    *   `TS2305`: Membro `Report` non esportato da `@/models/definitions`.
3.  **`fcm.ts`**:
    *   `TS6133`: `useNotifications` dichiarato ma non usato.
    *   `TS7006`: Parametro `addNotification` con tipo `any` implicito.

## Piano di Azione

1.  **Correggere `dataSync.ts`**:
    *   Creare una funzione `fetchImpostazioni` per gestire il recupero del documento "singleton" da Firestore.
    *   Usare la nuova funzione in `syncMasterData`.
2.  **Correggere `tsconfig.json`**:
    *   Aggiungere `"node"` all'array `compilerOptions.types` per risolvere il problema del namespace `NodeJS`.
3.  **Correggere `converters.ts`**:
    *   Rinominare l'import da `Report` a `Rapportino` per allinearsi con la definizione del modello.
4.  **Correggere `fcm.ts`**:
    *   Rimuovere l'import non utilizzato di `useNotifications`.
    *   Aggiungere un tipo esplicito al parametro `addNotification`.
5.  **Build Finale**:
    *   Eseguire `npm run build` per verificare che tutti gli errori siano stati risolti.
