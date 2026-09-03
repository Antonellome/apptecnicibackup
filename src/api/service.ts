
/**
 * @file Questo modulo centralizza tutte le chiamate HTTP al backend v2.
 * Logging migliorato per tracciare con precisione quale funzione viene chiamata.
 */

import { functions } from '../utils/firebase'; // <-- CORREZIONE: Importa dal percorso corretto.
import { httpsCallable } from 'firebase/functions';

// --- Oggetto mappatura funzioni per logging e chiamate ---
const callableFunctions = {
    syncAllAnagrafiche: httpsCallable(functions, 'syncAllAnagrafiche'),
    getAllRapportiniForSync: httpsCallable(functions, 'getAllRapportiniForSync'),
    createRapportino: httpsCallable(functions, 'createRapportino'),
    updateRapportino: httpsCallable(functions, 'updateRapportino'),
    deleteRapportino: httpsCallable(functions, 'deleteRapportino'),
    createCheckin: httpsCallable(functions, 'createCheckin'),
    getCheckinsUpdates: httpsCallable(functions, 'getCheckinsUpdates'),
    getNotifiche: httpsCallable(functions, 'getNotifiche'),
    markNotificationAsRead: httpsCallable(functions, 'markNotificationAsRead'),
    getLastSyncTimestamp: httpsCallable(functions, 'sync_manifest'),
};

/**
 * Funzione generica per eseguire una chiamata al backend.
 * @param functionName Il nome esatto della funzione da chiamare (deve essere una chiave di callableFunctions).
 * @param payload Dati da inviare alla funzione.
 * @returns I dati restituiti dalla funzione.
 */
const callFunction = async (functionName: keyof typeof callableFunctions, payload: any = {}): Promise<any> => {
    const callableFn = callableFunctions[functionName];
    if (!callableFn) {
        const errorMsg = `[API_SERVICE] ERRORE: Funzione \"${functionName}\" non trovata.`
        console.error(errorMsg);
        throw new Error(errorMsg);
    }

    try {
        console.log(`[API_SERVICE] Chiamata a --> ${functionName} <-- con payload:`, JSON.stringify(payload, null, 2));
        const result = await callableFn(payload);
        console.log(`[API_SERVICE] Risposta da <-- ${functionName} -->:`, JSON.stringify(result.data, null, 2));
        return result.data;
    } catch (error) {
        // @ts-expect-error Utilizzato per gestire l'errore di Firebase che non ha un tipo standard
        console.error(`[API_SERVICE] ERRORE GRAVE durante la chiamata a \"${functionName}\"`, JSON.stringify({ message: error.message, details: error.details }, null, 2));
        throw error;
    }
};

// --- API Esportate con prefisso "api" per chiarezza ---

// RIPRISTINO: Rimuovo la forzatura del payload. L'errore 'internal' era dovuto alla regione,
// non al payload. Ripristiniamo la logica originale.
export const apiSyncAllAnagrafiche = (localTimestamps: Record<string, number>, tecnicoId: string): Promise<any> => {
  return callFunction('syncAllAnagrafiche', { localTimestamps, tecnicoId });
};

export const apiGetAllRapportiniForSync = (payload: { lastSyncTimestamp: number, tecnicoId: string }): Promise<any> => {
    return callFunction('getAllRapportiniForSync', payload);
};

export const apiCreateRapportino = (data: any): Promise<any> => {
    return callFunction('createRapportino', data);
};

export const apiUpdateRapportino = (data: any): Promise<any> => {
    return callFunction('updateRapportino', data);
};

export const apiDeleteRapportino = (rapportinoId: string): Promise<any> => {
    return callFunction('deleteRapportino', { rapportinoId });
};

export const apiCreateCheckin = (data: any): Promise<any> => {
    return callFunction('createCheckin', data);
};

export const apiGetCheckinsUpdates = (payload: { lastSyncTimestamp: number, tecnicoId: string }): Promise<any> => {
    return callFunction('getCheckinsUpdates', payload);
}

export const apiGetNotifiche = (): Promise<any> => {
    return callFunction('getNotifiche');
};

export const apiMarkNotificationAsRead = (notificationId: string): Promise<any> => {
    return callFunction('markNotificationAsRead', { notificationId });
};

export const apiGetLastSyncTimestamp = async (tecnicoId: string): Promise<{ timestamp: number } | null> => {
    try {
        return await callFunction('getLastSyncTimestamp', { tecnicoId });
    } catch (error) {
        console.warn(`[API_SERVICE] Fallback attivato per apiGetLastSyncTimestamp a causa di un errore del backend. Si procederà con una sincronizzazione completa.`, error);
        return { timestamp: 0 }; 
    }
};
