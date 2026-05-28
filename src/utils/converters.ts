
import { 
    Timestamp, 
    WithFieldValue, 
    serverTimestamp, 
    DocumentData, 
    FirestoreDataConverter, 
    QueryDocumentSnapshot 
} from 'firebase/firestore';
import { GenericItem, Tecnico, Veicolo, Rapportino, Ditta, Categoria, Documento } from '@/models/definitions';

const createConverter = <T extends GenericItem>(): FirestoreDataConverter<T> => ({
    toFirestore: (data: WithFieldValue<T>): DocumentData => {
        const firestoreData: { [key: string]: any } = {};

        // Assegna un timestamp del server per la data di aggiornamento
        firestoreData.updatedAt = serverTimestamp();

        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                const value = (data as any)[key];
                
                // Se il valore è una Date, convertilo in Timestamp
                if (value instanceof Date) {
                    firestoreData[key] = Timestamp.fromDate(value);
                } else {
                    firestoreData[key] = value;
                }
            }
        }

        // Non sovrascrivere createdAt se è già un valore (es. in modifica)
        if (!firestoreData.createdAt) {
            firestoreData.createdAt = serverTimestamp();
        }

        return firestoreData;
    },
    fromFirestore: (snapshot: QueryDocumentSnapshot, options: any): T => {
        const data = snapshot.data(options);
        const result: { [key: string]: any } = { id: snapshot.id };

        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                const value = data[key];
                
                // Se il valore è un Timestamp, convertilo in Date
                if (value instanceof Timestamp) {
                    result[key] = value.toDate();
                } else {
                    result[key] = value;
                }
            }
        }
        return result as T;
    }
});

// --- ISTANZE DEI CONVERTER ---

export const tecnicoConverter = createConverter<Tecnico>();
export const veicoloConverter = createConverter<Veicolo>();
export const rapportinoConverter = createConverter<Rapportino>();
export const dittaConverter = createConverter<Ditta>();
export const categoriaConverter = createConverter<Categoria>();
export const documentoConverter = createConverter<Documento>();
