import { z } from 'zod';
import dayjs from 'dayjs';
import { TipoGiornata } from './definitions';

// Funzione che crea lo schema dinamicamente in base ai tipi di giornata
export const createRapportinoSchema = (tipiGiornata: TipoGiornata[]) => {
    
    // Trova il tipo di giornata che è considerato "lavorativa"
    const isLavorativa = (giornataId: string) => {
        const tipo = tipiGiornata.find(t => t.id === giornataId);
        return tipo ? tipo.lavorativa : false;
    };

    return z.object({
        data: z.instanceof(dayjs.Dayjs, { message: "Data richiesta" }),
        tecnicoScriventeId: z.string().min(1, "Il tecnico responsabile è obbligatorio"),
        
        giornataId: z.string().min(1, "Il tipo di giornata è obbligatorio"),
        
        inserimentoManualeOre: z.boolean(),
        oraInizio: z.any().nullable(),
        oraFine: z.any().nullable(),
        pausa: z.number().nullable(),
        oreLavorate: z.number().min(0, "Le ore non possono essere negative"),

        naveId: z.string().nullable(),
        luogoId: z.string().nullable(),
        
        breveDescrizione: z.string().max(100, "Descrizione troppo lunga"),
        lavoroEseguito: z.string(),
        
        // Campi opzionali
        tecniciAggiuntiIds: z.array(z.string()).optional(),
        veicoloId: z.string().nullable().optional(),
        materialiImpiegati: z.string().optional(),
    })
    .refine(data => {
        // Se la giornata è lavorativa, nave o luogo sono obbligatori
        if (isLavorativa(data.giornataId)) {
            return data.naveId || data.luogoId;
        }
        return true;
    }, {
        message: "Per una giornata lavorativa, specificare almeno Nave o Luogo",
        path: ["naveId"], // O path: ["luogoId"]
    })
    .refine(data => {
        // Se la giornata è lavorativa, la descrizione e il lavoro eseguito sono obbligatori
        if (isLavorativa(data.giornataId)) {
            return data.breveDescrizione.length > 0 && data.lavoroEseguito.length > 0;
        }
        return true;
    }, {
        message: "Campo obbligatorio per giornate lavorative",
        path: ["lavoroEseguito"], // O path: ["breveDescrizione"]
    });
};

export type RapportinoSchema = z.infer<ReturnType<typeof createRapportinoSchema>>;
