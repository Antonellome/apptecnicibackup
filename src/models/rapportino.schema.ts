import { z } from 'zod';
import dayjs from 'dayjs';

// Schema Zod che riflette il contratto dati finale concordato con l'App Master.
// Include anche i campi specifici dell'App Tecnici che non vengono sincronizzati.
export const createRapportinoSchema = () => {
    return z.object({
        // ==================================================
        // == CONTRATTO DATI UFFICIALE - App Master      ==
        // ==================================================

        id: z.string().uuid("L'ID deve essere un UUID valido."),
        idTecnico: z.string().min(1, "L'ID del tecnico è obbligatorio."),
        nomeTecnico: z.string().min(1, "Il nome del tecnico è obbligatorio."),
        data: z.instanceof(dayjs.Dayjs, { message: "La data è un campo obbligatorio." }),
        idTipoGiornata: z.string().min(1, "Il tipo di giornata è obbligatorio."),
        descrizioneTipoGiornata: z.string().min(1, "La descrizione della giornata è obbligatoria."),
        oreLavorate: z.number().min(0, "Le ore lavorate non possono essere negative."),

        sede: z.object({
            idLuogo: z.string().nullable().optional(),
            descrizioneLuogo: z.string().nullable().optional(),
            idNave: z.string().nullable().optional(),
            nomeNave: z.string().nullable().optional()
        }),

        attivitaSvolte: z.string().optional(),

        stato: z.enum(['bozza', 'confermato'], { required_error: "Lo stato è obbligatorio." }),

        metadata: z.object({
            createdAt: z.date(),
            updatedAt: z.date(),
            createdBy: z.string(),
        }),

        // ==================================================
        // == CAMPI AGGIUNTIVI - Solo App Tecnici (Offline) ==
        // ==================================================

        // Logica avanzata ore multi-tecnico
        dettaglioOreTecnici: z.array(
            z.object({
                tecnicoId: z.string(),
                ore: z.number(),
            })
        ).optional(),

        // Logica avanzata orari e firma
        inserimentoManualeOre: z.boolean().optional(),
        oraInizio: z.string().optional(),
        oraFine: z.string().optional(),
        pausa: z.number().optional(),
        firma: z.string().optional(), // Base64 o URL della firma

        // Altri campi specifici non sincronizzati
        veicoloId: z.string().optional(),
        materialiImpiegati: z.string().optional(),

        // Campi deprecati o da mappare
        // 'giornataId', 'lavoroEseguito', 'luogoId', 'naveId' verranno mappati in questo nuovo schema al momento della creazione.
    });
};

export type RapportinoSchema = z.infer<ReturnType<typeof createRapportinoSchema>>;
