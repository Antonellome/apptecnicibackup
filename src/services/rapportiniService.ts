
import { auth } from '@/utils/firebase';

const getAuthToken = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Utente non autenticato. Impossibile procedere con la richiesta.');
    return await currentUser.getIdToken();
};

const callCloudFunction = async (url: string, data: any) => {
    const token = await getAuthToken();
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        // Modifica: Invia l'oggetto dati direttamente, senza l'involucro { data: ... }.
        // Questo si allinea a come le funzioni HTTPS standard di Firebase si aspettano il corpo della richiesta.
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error('Errore dalla Cloud Function:', {
            status: response.status,
            statusText: response.statusText,
            body: errorBody,
        });
        throw new Error(`Errore dalla funzione server: ${response.statusText}`);
    }

    return await response.json();
};

/**
 * Chiama la Cloud Function per creare un nuovo rapportino.
 * @param rapportinoData I dati del rapportino da creare.
 */
export const createRapportino = async (rapportinoData: any) => {
    const url = 'https://createrapportino-2xbiermwyq-oa.a.run.app';
    return await callCloudFunction(url, rapportinoData);
};

/**
 * Chiama la Cloud Function per aggiornare un rapportino esistente.
 * @param reportId L'ID del rapportino da aggiornare.
 * @param rapportinoData I dati aggiornati del rapportino.
 */
export const updateRapportino = async (reportId: string, rapportinoData: any) => {
    const url = 'https://updaterapportino-2xbiermwyq-oa.a.run.app';
    // La funzione si aspetta l'ID nel payload dei dati
    const dataWithId = { ...rapportinoData, id: reportId };
    return await callCloudFunction(url, dataWithId);
};
