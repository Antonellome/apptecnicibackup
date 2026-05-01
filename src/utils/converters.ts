
import { Timestamp } from 'firebase/firestore';
import { GenericItem, Tecnico, Veicolo, Report, Ditta, Categoria, Documento } from '@/models/definitions';

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
        return { ...defaultValues, ...data, id: snapshot.id } as T;
    }
});

export const tecnicoConverter = createConverter<Tecnico>({
    nome: '',
    cognome: '',
    email: '',
    attivo: true,
    sincronizzazioneAttiva: false,
    codiceFiscale: undefined,
    indirizzo: undefined,
    citta: undefined,
    cap: undefined,
    provincia: undefined,
    telefono: undefined,
    numeroCartaIdentita: undefined,
    scadenzaCartaIdentita: undefined,
    numeroPassaporto: undefined,
    scadenzaPassaporto: undefined,
    numeroPatente: undefined,
    categoriaPatente: undefined,
    scadenzaPatente: undefined,
    numeroCQC: undefined,
    scadenzaCQC: undefined,
    dittaId: undefined,
    categoriaId: undefined,
    tipoContratto: undefined,
    dataAssunzione: undefined,
    scadenzaContratto: undefined,
    scadenzaUnilav: undefined,
    scadenzaVisita: undefined,
    scadenzaCorsoSicurezza: undefined,
    scadenzaPrimoSoccorso: undefined,
    scadenzaAntincendio: undefined,
    note: undefined,
});

export const veicoloConverter = createConverter<Veicolo>({
    nome: '',
    targa: undefined,
});

export const rapportoConverter = createConverter<Report>({
    nome: '',
    data: Timestamp.now(),
    tecnicoId: '',
    tipoGiornataId: '', 
    oreLavoro: 8,
    isTrasferta: false,
    descrizioneBreve: undefined,
    naveId: undefined,
    luogoId: undefined,
    oraInizio: undefined,
    oraFine: undefined,
    presenze: [],
    createdAt: Timestamp.now(),
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
