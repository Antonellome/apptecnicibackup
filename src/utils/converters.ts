
import {
    Timestamp,
    WithFieldValue,
    serverTimestamp,
    DocumentData,
    FirestoreDataConverter,
    QueryDocumentSnapshot
} from 'firebase/firestore';
import { Rapportino, Tecnico, Veicolo, Ditta, Categoria, Documento, TipoGiornata, Luogo, Nave, GenericItem } from '@/models/definitions';

// =================================================================
// CONVERTER SPECIFICO E ROBUSTO PER RAPPORTINO
// =================================================================

export const rapportinoConverter: FirestoreDataConverter<Rapportino> = {
    toFirestore: (rapportino: WithFieldValue<Rapportino>): DocumentData => {
        // Rimuove l'ID prima di salvare, perché è gestito da Firestore
        const data = { ...rapportino };
        delete (data as any).id;
        const firestoreData: DocumentData = { ...data };

        // Rimuove i campi con valore undefined (Firestore non accetta undefined)
        Object.keys(firestoreData).forEach(key => {
            if (firestoreData[key] === undefined) {
                delete firestoreData[key];
            }
        });

        // Converte i campi Date in Timestamp di Firestore
        Object.keys(firestoreData).forEach(key => {
            if (firestoreData[key] instanceof Date) {
                firestoreData[key] = Timestamp.fromDate(firestoreData[key]);
            }
        });

        // Imposta i timestamp del server per la creazione e l'aggiornamento
        if (!firestoreData.createdAt) {
            firestoreData.createdAt = serverTimestamp();
        }
        firestoreData.updatedAt = serverTimestamp();

        return firestoreData;
    },

    fromFirestore: (snapshot: QueryDocumentSnapshot, options: any): Rapportino => {
        const rawData = snapshot.data(options) || {};

        // Costruisce l'oggetto Rapportino con valori di default sicuri
        const rapportino: Rapportino = {
            id: snapshot.id,
            nome: rawData.nome || '',
            data: rawData.data instanceof Timestamp ? rawData.data.toDate() : new Date(),
            tecnicoId: rawData.tecnicoId || '',
            tipoGiornataId: rawData.tipoGiornataId || '',
            trasfertaId: rawData.trasfertaId || undefined,
            oraInizio: rawData.oraInizio || '',
            oraFine: rawData.oraFine || '',
            pausa: typeof rawData.pausa === 'number' ? rawData.pausa : 0,
            dettaglioOreTecnici: Array.isArray(rawData.dettaglioOreTecnici) ? rawData.dettaglioOreTecnici : [],
            presenze: Array.isArray(rawData.presenze) ? rawData.presenze : [],
            veicoloId: rawData.veicoloId || undefined,
            naveId: rawData.naveId || undefined,
            luogoId: rawData.luogoId || undefined,
            descrizioneBreve: rawData.descrizioneBreve || '',
            lavoroEseguito: rawData.lavoroEseguito || '',
            materialiImpiegati: rawData.materialiImpiegati || '',
            firmaFirmatarioNome: rawData.firmaFirmatarioNome || '',
            firmaFirmatarioSocieta: rawData.firmaFirmatarioSocieta || '',
            firmaVettoriale: rawData.firmaVettoriale || null,
            createdAt: rawData.createdAt instanceof Timestamp ? rawData.createdAt.toDate() : new Date(),
            updatedAt: rawData.updatedAt instanceof Timestamp ? rawData.updatedAt.toDate() : new Date(),
            isMultiDay: rawData.isMultiDay === true, // Default to false
            oreLavoro: typeof rawData.oreLavoro === 'number' ? rawData.oreLavoro : undefined, // Campo legacy
        };

        return rapportino;
    }
};

// =================================================================
// CONVERTER GENERICO PER ALTRE COLLEZIONI (ANAGRAFICHE)
// =================================================================

const createGenericConverter = <T extends GenericItem>(): FirestoreDataConverter<T> => ({
    toFirestore: (data: WithFieldValue<T>): DocumentData => {
        const rest = { ...data };
        delete (rest as any).id;
        const firestoreData: { [key: string]: any } = { ...rest };

        Object.keys(firestoreData).forEach(key => {
            if (firestoreData[key] instanceof Date) {
                firestoreData[key] = Timestamp.fromDate(firestoreData[key]);
            }
        });

        if (!firestoreData.createdAt) {
            firestoreData.createdAt = serverTimestamp();
        }
        firestoreData.updatedAt = serverTimestamp();

        return firestoreData;
    },

    fromFirestore: (snapshot: QueryDocumentSnapshot, options: any): T => {
        const data = snapshot.data(options);
        const convertedData: { [key: string]: any } = {};
        
        Object.keys(data).forEach(key => {
            const value = data[key];
            if (value instanceof Timestamp) {
                convertedData[key] = value.toDate();
            } else {
                convertedData[key] = value;
            }
        });

        return {
            id: snapshot.id,
            ...convertedData,
        } as T;
    }
});

// --- ESPORTAZIONE DEI CONVERTER --- 
export const tecnicoConverter = createGenericConverter<Tecnico>();
export const veicoloConverter = createGenericConverter<Veicolo>();
export const dittaConverter = createGenericConverter<Ditta>();
export const categoriaConverter = createGenericConverter<Categoria>();
export const documentoConverter = createGenericConverter<Documento>();
export const tipoGiornataConverter = createGenericConverter<TipoGiornata>();
export const luogoConverter = createGenericConverter<Luogo>();
export const naveConverter = createGenericConverter<Nave>();
