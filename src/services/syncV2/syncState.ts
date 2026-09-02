/**
 * Questo modulo gestisce uno stato globale e persistente per l'intera durata della sessione dell'app.
 * Serve a garantire che la sincronizzazione iniziale venga eseguita UNA SOLA VOLTA, indipendentemente
 * dai cicli di rendering di React.
 */

let initialSyncHasBeenTriggered = false;

/**
 * Controlla se la sincronizzazione iniziale è già stata avviata in questa sessione.
 * @returns {boolean} True se è già stata avviata, altrimenti false.
 */
export const hasInitialSyncBeenTriggered = () => initialSyncHasBeenTriggered;

/**
 * Contrassegna la sincronizzazione iniziale come avviata. Una volta impostato a true,
 * non può essere resettato per questa sessione.
 */
export const markInitialSyncAsTriggered = () => {
    if (!initialSyncHasBeenTriggered) {
        console.log("[SyncState] Contrassegno la sincronizzazione iniziale come AVVIATA.");
        initialSyncHasBeenTriggered = true;
    }
};
