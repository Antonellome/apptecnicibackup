
import { z } from 'zod';
import dayjs from 'dayjs';

// Schema di validazione definitivo.
// Vengono resi obbligatori SOLO i 2 campi minimi per evitare crash al salvataggio:
// - data: La sua assenza causa un crash irreversibile.
// - giornataId: Essenziale per la logica dell'applicazione.
// Tutto il resto è facoltativo.

export const createRapportinoSchema = () => {
    return z.object({
        // CAMPI OBBLIGATORI MINIMI
        data: z.instanceof(dayjs.Dayjs, { message: "La data è un campo obbligatorio." }),
        giornataId: z.string().min(1, "Il tipo di giornata è un campo obbligatorio."),

        // TUTTI GLI ALTRI CAMPI SONO FACOLTATIVI
        tecnicoScriventeId: z.string().optional(),
        
        inserimentoManualeOre: z.boolean().optional(),
        // Corretto per accettare stringhe, risolvendo il crash di rendering.
        oraInizio: z.string().optional(),
        oraFine: z.string().optional(),
        pausa: z.number().optional(),
        oreLavorate: z.number().optional(),

        naveId: z.any().optional(),
        luogoId: z.any().optional(),
        veicoloId: z.any().optional(),

        breveDescrizione: z.string().max(200, "La descrizione non può superare i 200 caratteri.").optional(),
        lavoroEseguito: z.string().optional(),

        altriTecnici: z.array(z.any()).optional(),
        materialiImpiegati: z.string().optional(),
    });
};

export type RapportinoSchema = z.infer<ReturnType<typeof createRapportinoSchema>>;
