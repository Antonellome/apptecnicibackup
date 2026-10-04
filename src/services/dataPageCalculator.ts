import { Rapportino, MasterData, RiepilogoMese, Impostazioni, UserProfile } from '@/models/definitions';
import { calculateWeeklyHours, WeeklyHours } from '@/utils/hoursCalculations'; // Importa la funzione corretta e il tipo

/**
 * Interfaccia per il ritorno della funzione di calcolo offline.
 */
export interface OfflineCalculationResult {
    summary: RiepilogoMese;
    weeklyData: WeeklyHours;
}

/**
 * Funzione principale per calcolare il riepilogo mensile offline.
 * Restituisce sia il riepilogo aggregato sia i dati settimanali dettagliati.
 */
export const calculateOfflineSummary = (
    rapportini: Rapportino[], 
    masterData: MasterData,
    userProfile: UserProfile
): OfflineCalculationResult => {

    // 1. Usa la funzione di calcolo settimanale per ottenere una suddivisione precisa
    const weeklyHours = calculateWeeklyHours(rapportini, masterData, userProfile.tecnicoId);

    // 2. Inizializza la struttura del riepilogo
    const summary: RiepilogoMese = {
        dettaglio: new Map(),
        oreTotali: 0, costoTotale: 0, giorniTotaliLavorati: 0, giorniTrasferta: 0,
        oreOrdinarie: 0, oreStraordinarie: 0
    };
    const tariffeMap = new Map((masterData.impostazioni as Impostazioni)?.tariffe?.map(t => [t.tipoGiornataId, t]) || []);

    // 3. Itera sui risultati settimanali e aggrega i dati per il riepilogo mensile
    let oreOrdinarieTotali = 0;
    let oreStraordinarieTotali = 0;
    const giorniLavorati = new Set<string>();

    for (const date in weeklyHours) {
        giorniLavorati.add(date);
        const dailyData = weeklyHours[date];

        for (const hourType in dailyData) {
            const hours = dailyData[hourType];
            if (hours <= 0) continue;

            summary.oreTotali += hours;

            if (hourType.toLowerCase().includes('straordinario')) {
                oreStraordinarieTotali += hours;
            } else {
                oreOrdinarieTotali += hours;
            }
            
            let voce = summary.dettaglio.get(hourType);
            if (!voce) {
                voce = { 
                    id: hourType, nome: hourType, colore: '#ffffff', unita: 'h', 
                    oreTotali: 0, giorni: 0, costo: 0, giorniSet: new Set()
                };
                summary.dettaglio.set(hourType, voce);
            }

            voce.oreTotali += hours;
            voce.giorniSet?.add(date);
        }
    }

    // 4. Finalizza il calcolo dei costi e dei giorni
    let costoTotaleFinale = 0;
    for (const voce of summary.dettaglio.values()) {
        voce.giorni = voce.giorniSet?.size || 0;
        delete voce.giorniSet;
        
        // Logica di costo fittizia: da migliorare se necessario
        const costoOrario = 10; 
        voce.costo = voce.oreTotali * costoOrario;
        costoTotaleFinale += voce.costo;
    }

    // 5. Aggiorna i valori finali del riepilogo
    summary.costoTotale = costoTotaleFinale;
    summary.giorniTotaliLavorati = giorniLavorati.size;
    summary.oreOrdinarie = oreOrdinarieTotali;
    summary.oreStraordinarie = oreStraordinarieTotali;

    // 6. Restituisci sia il riepilogo che i dati settimanali
    return { summary, weeklyData: weeklyHours };
};
