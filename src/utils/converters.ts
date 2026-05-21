
import { Timestamp } from 'firebase/firestore';
// Corretto l'import: Report -> Rapportino
import { GenericItem, Tecnico, Veicolo, Rapportino, Ditta, Categoria, Documento } from '@/models/definitions';

const createConverter = <T extends GenericItem>(defaultValues: Omit<T, 'id'>) => ({
    toFirestore: (data: Partial<T>): T => {
        const firestoreData: any = {};
        for (const key in defaultValues) {
            if (Object.prototype.hasOwnProperty.call(defaultValues, key)) {
                const value = (data as any)[key];
                if (value !== undefined) {
                    firestoreData[key] = value;
                } else if (defaultValues[key] !== undefined) {
                    firestoreData[key] = defaultValues[key];
                }
            }
        }
        return firestoreData as T;
    },
    fromFirestore: (snapshot: any, options: any): T => {
        const data = snapshot.data(options);
        const result = { ...defaultValues, ...data, id: snapshot.id } as T;
        
        // Conversione specifica per campi Timestamp, se necessario
        if ('data' in result && result.data instanceof Timestamp) {
            (result as any).data = result.data.toDate();
        }
        if ('dataInizio' in result && result.dataInizio instanceof Timestamp) {
            (result as any).dataInizio = result.dataInizio.toDate();
        }
        if ('dataFine' in result && result.dataFine instanceof Timestamp) {
            (result as any).dataFine = result.dataFine.toDate();
        }
        
        return result;
    }
});

export const tecnicoConverter = createConverter<Tecnico>({
    nome: '',
    cognome: '',
    email: '',
    attivo: true,
    sincronizzazioneAttiva: false,
});

export const veicoloConverter = createConverter<Veicolo>({
    nome: '',
});

// Rinominato per coerenza e corretto il tipo generico
export const rapportinoConverter = createConverter<Rapportino>({
    nome: '', // La prop 'nome' è ereditata da GenericItem, ma non usata. La lascio per compatibilità con createConverter.
    data: Timestamp.now(),
    tecnicoId: '',
    tipoGiornataId: '', 
    oreLavoro: 8,
    isTrasferta: false,
    presenze: [],
    dettaglioOreTecnici: [],
    veicoliUtilizzati: [],
    completed: false,
    // I campi opzionali possono essere omessi se il loro valore di default è `undefined`
});

export const dittaConverter = createConverter<Ditta>({
    nome: ''
});

export const categoriaConverter = createConverter<Categoria>({
    nome: ''
});

export const documentoConverter = createConverter<Documento>({
    nome: '',
    url: '',
    tecnicoId: ''
});
