
import { collection, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import type { BaseEntity, Tecnico, Veicolo, Rapportino } from '@/models/definitions';

// --- FACTORY DI CONVERTITORI ---
// Funzione generica per creare un convertitore Firestore standard
// allineato con le interfacce definite in \`definitions.ts\`.

const createConverter = <T extends BaseEntity>(defaultValues: Omit<T, 'id'>) => ({
    toFirestore: (data: Partial<T>): T => {
        const firestoreData: any = {};
        // Assicura che solo i campi definiti nel modello di default vengano considerati.
        for (const key in defaultValues) {
            if (Object.prototype.hasOwnProperty.call(defaultValues, key)) {
                const value = (data as any)[key];
                // Se il valore è definito, usalo. Altrimenti, usa il valore di default.
                // Se il valore di default è \`undefined\`, non verrà incluso nell'oggetto finale,
                // che è il comportamento corretto per i campi opzionali in Firestore.
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
        // Ritorna un oggetto completo con tutti i campi, usando i valori di default
        // per quelli mancanti nello snapshot di Firestore.
        return { ...defaultValues, ...data, id: snapshot.id } as T;
    }
});

// --- ISTANZE DEI CONVERTITORI ---

// Convertitore per i Tecnici
export const tecnicoConverter = createConverter<Tecnico>({
    nome: '',
    cognome: '',
    attivo: true,
    sincronizzazioneAttiva: false,
    email: undefined,
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
    lastModified: undefined,
});

// Convertitore per i Veicoli
export const veicoloConverter = createConverter<Veicolo>({
    marca: '',
    modello: '',
targa: '',
    tipo: undefined,
    anno: undefined,
    proprieta: undefined,
    scadenzaAssicurazione: undefined,
    scadenzaBollo: undefined,
    scadenzaRevisione: undefined,
    scadenzaTachimetro: undefined,
    scadenzaTagliando: undefined,
    note: undefined,
});

// Convertitore per i Rapportini
export const rapportoConverter = createConverter<Rapportino>({
    data: Timestamp.now(),
    tecnicoScriventeId: '',
    tipoGiornataId: '', // CIAO: Corretto
    oreLavorate: 8,
    oreViaggio: 0,
    oreStraordinario: 0,
    oreTotali: 8,
    sedePartenza: undefined,
    sedeArrivo: undefined,
    kmInizio: undefined,
    kmFine: undefined,
    kmTotali: undefined,
    veicoloId: undefined,
    naveId: undefined,
    luogoId: undefined,
    breveDescrizione: undefined,
    descrizioneLavoro: undefined,
    materiali: undefined,
    altriTecniciIds: [],
    dettagliViaggio: undefined,
    immagineKmInizioUrl: undefined,
    immagineKmFineUrl: undefined,
    concluso: false,
    approvato: false,
    noteApprovazione: undefined,
});
