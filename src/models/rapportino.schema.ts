
import { z } from 'zod';
import dayjs from 'dayjs';

// Schema di validazione aggiornato per supportare le ore multi-tecnico.
export const createRapportinoSchema = () => {
    return z.object({
        // CAMPI OBBLIGATORI MINIMI
        data: z.instanceof(dayjs.Dayjs, { message: "La data è un campo obbligatorio." }),
        giornataId: z.string().min(1, "Il tipo di giornata è un campo obbligatorio."),

        // CAMPI FACOLTATIVI
        tecnicoScriventeId: z.string().optional(),
        
        inserimentoManualeOre: z.boolean().optional(),
        oraInizio: z.string().optional(),
        oraFine: z.string().optional(),
        pausa: z.number().optional(),

        // ===== MODIFICA STRUTTURALE PER ORE MULTI-TECNICO =====
        
        // [NUOVO CAMPO] Contiene il dettaglio ore per ogni tecnico.
        // Questa è la nuova fonte della verità.
        dettaglioOreTecnici: z.array(
            z.object({
                tecnicoId: z.string(),
                ore: z.number()
            })
        ).optional(),

        // [CAMPO "PONTE"] Mantenuto per retrocompatibilità.
        // L'App Master e il Report Mensile continueranno a leggerlo senza crashare.
        // Verrà popolato con la somma delle ore prese da 'dettaglioOreTecnici'.
        oreLavoro: z.number().optional(),

        // ==========================================================

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
