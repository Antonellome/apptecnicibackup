
import { z } from 'zod';

// Funzione di utilità per gestire i timestamp di Firebase, che possono essere null, stringhe o oggetti
const flexibleTimestamp = z.preprocess((arg) => {
    if (!arg) return null; 
    if (arg instanceof Date) return arg; 
    if (typeof arg === 'object' && 'toDate' in arg && typeof (arg as any).toDate === 'function') {
        return (arg as any).toDate();
    }
    if (typeof arg === 'string' || typeof arg === 'number') {
        const date = new Date(arg);
        if (!isNaN(date.getTime())) return date;
    }
    // Supporto per il formato { _seconds: ..., _nanoseconds: ... }
    if (typeof arg === 'object' && '_seconds' in arg && '_nanoseconds' in arg) {
        const seconds = (arg as any)._seconds;
        const nanoseconds = (arg as any)._nanoseconds;
        if (typeof seconds === 'number' && typeof nanoseconds === 'number') {
            return new Date(seconds * 1000 + nanoseconds / 1000000);
        }
    }
    return null; 
}, z.date().nullable());

// Funzione di utilità per gestire stringhe che rappresentano numeri
const stringToNumber = z.preprocess((val) => {
    if (typeof val === 'string' && val.trim() !== '') {
        const num = parseFloat(val);
        return isNaN(num) ? val : num;
    }
    return val;
}, z.number());

// --- SCHEMI DEFINITIVI E CORRETTI ---

export const TipoGiornataSchema = z.object({
    id: z.string(),
    nome: z.string(),
    colore: z.string(),
    ordine: z.number(),
    costoOrario: stringToNumber,
    costoStraordinario: stringToNumber,
    tariffa: stringToNumber,
    lastModified: flexibleTimestamp.optional(),
});

export const CategoriaSchema = z.object({
    id: z.string(),
    nome: z.string(),
    lastModified: flexibleTimestamp.optional(),
});

export const ClienteSchema = z.object({
    id: z.string(),
    nome: z.string(),
    lastModified: flexibleTimestamp.optional(),
});

export const DittaSchema = z.object({
    id: z.string(),
    nome: z.string(),
    lastModified: flexibleTimestamp.optional(),
});

export const LuogoSchema = z.object({
    id: z.string(),
    nome: z.string(),
    lastModified: flexibleTimestamp.optional(),
});

export const NaveSchema = z.object({
    id: z.string(),
    nome: z.string(),
    lastModified: flexibleTimestamp.optional(),
});

export const TecnicoSchema = z.object({
    id: z.string(),
    nome: z.string(),
    cognome: z.string(),
    attivo: z.boolean(),
    // SOLUZIONE: Accetta email valida O stringa vuota
    email: z.string().email().or(z.literal('')).nullable().optional(),
    dittaId: z.string().optional().nullable(),
    categoriaId: z.string().optional().nullable(),
    // Campi opzionali che possono essere stringhe vuote
    codiceFiscale: z.string().optional().nullable(),
    indirizzo: z.string().optional().nullable(),
    cap: z.string().optional().nullable(),
    citta: z.string().optional().nullable(),
    provincia: z.string().optional().nullable(),
    telefono: z.string().optional().nullable(),
    tipoContratto: z.string().optional().nullable(),
    categoriaPatente: z.string().optional().nullable(),
    numeroPatente: z.string().optional().nullable(),
    numeroCartaIdentita: z.string().optional().nullable(),
    numeroPassaporto: z.string().optional().nullable(),
    numeroCQC: z.string().optional().nullable(),
    note: z.string().optional().nullable(),
    // Campi extra che potrebbero esistere
    appAccess: z.boolean().optional().nullable(),
    accessoApp: z.boolean().optional().nullable(), // Alias
    uid: z.string().optional().nullable(),
    // Date che possono essere null
    createdAt: flexibleTimestamp.optional(),
    updatedAt: flexibleTimestamp.optional(),
    dataAssunzione: flexibleTimestamp.optional(),
    scadenzaPatente: flexibleTimestamp.optional(),
    scadenzaCartaIdentita: flexibleTimestamp.optional(),
    scadenzaPassaporto: flexibleTimestamp.optional(),
    scadenzaCQC: flexibleTimestamp.optional(),
    scadenzaVisita: flexibleTimestamp.optional(),
    scadenzaContratto: flexibleTimestamp.optional(),
    scadenzaUnilav: flexibleTimestamp.optional(),
    scadenzaCorsoSicurezza: flexibleTimestamp.optional(),
    scadenzaPrimoSoccorso: flexibleTimestamp.optional(),
    scadenzaAntincendio: flexibleTimestamp.optional(),
    dataSync: flexibleTimestamp.optional(),
});

export const VeicoloSchema = z.object({
    id: z.string(),
    targa: z.string(),
    marca: z.string().optional().nullable(),
    modello: z.string().optional().nullable(),
    tipo: z.string().optional().nullable(),
    attivo: z.boolean().optional().nullable(),
    kmAttuali: z.union([z.string(), z.number()]).optional().nullable(),
    anno: z.union([z.string(), z.number()]).optional().nullable(),
    note: z.string().optional().nullable(),
    // Date che possono essere null, stringhe o Timestamp
    scadenzaAssicurazione: flexibleTimestamp,
    scadenzaBollo: flexibleTimestamp,
    scadenzaRevisione: flexibleTimestamp,
    scadenzaTagliando: flexibleTimestamp,
    scadenzaTachigrafo: flexibleTimestamp,
    // Campi extra osservati nei dati
    veicolo: z.string().optional().nullable(),
    scadenzeSilenced: z.any().optional().nullable(),
    proprieta: z.string().optional().nullable(),
    assicurazione: z.string().optional().nullable(),
});


// Schemi per l'array (usati in offlineSync)
export const TipiGiornataSchema = z.array(TipoGiornataSchema);
export const CategorieSchema = z.array(CategoriaSchema);
export const ClientiSchema = z.array(ClienteSchema);
export const DitteSchema = z.array(DittaSchema);
export const LuoghiSchema = z.array(LuogoSchema);
export const NaviSchema = z.array(NaveSchema);
export const TecniciSchema = z.array(TecnicoSchema);
export const VeicoliSchema = z.array(VeicoloSchema);
