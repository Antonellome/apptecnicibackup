
import { auth } from '@/utils/firebase';

const getAuthToken = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Utente non autenticato. Impossibile procedere con la richiesta.');
    return await currentUser.getIdToken();
};

const prepareDataForJson = (data: any): any => {
  if (data instanceof Date) {
    return data.toISOString();
  }
  if (Array.isArray(data)) {
    return data.map(item => prepareDataForJson(item));
  }
  if (data !== null && typeof data === 'object') {
    const newData: { [key: string]: any } = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        newData[key] = prepareDataForJson(data[key]);
      }
    }
    return newData;
  }
  return data;
};

const callCloudFunction = async (url: string, payload: any) => {
    const token = await getAuthToken();
    
    const sanitizedPayload = prepareDataForJson(payload);

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        // CORREZIONE DEFINITIVA: Le funzioni onCall chiamate via HTTPS richiedono un involuto { data: ... }
        body: JSON.stringify({ data: sanitizedPayload }),
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
    // La funzione onCall si aspetta un oggetto { rapportinoData: ... }
    return await callCloudFunction(url, { rapportinoData });
};

/**
 * Chiama la Cloud Function per aggiornare un rapportino esistente.
 * @param reportId L'ID del rapportino da aggiornare.
 * @param rapportinoData I dati aggiornati del rapportino.
 */
export const updateRapportino = async (reportId: string, rapportinoData: any) => {
    const url = 'https://updaterapportino-2xbiermwyq-oa.a.run.app';
    // La funzione onCall si aspetta { id: ..., rapportinoData: ... }
    const payload = { id: reportId, rapportinoData };
    return await callCloudFunction(url, payload);
};
