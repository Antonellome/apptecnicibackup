import { Rapportino, MasterData } from '@/models/definitions';
import { toDateSafe, parseTimeString, timeToMinutes } from './dateUtils';
import {
  getDay,
  format,
} from 'date-fns';

// --- TIPI DI ORE (COSTANTI) ---
export const ORE_ORDINARIE = 'Ordinarie Diurne';
export const LAVORO_NOTTURNO_ORDINARIO = 'Lavoro Notturno Ordinario';
export const LAVORO_FESTIVO_ORDINARIO = 'Lavoro Festivo Ordinario';
export const LAVORO_FESTIVO_NOTTURNO_ORDINARIO = 'Lavoro Festivo Notturno Ordinario';
export const STRAORDINARIO_DIURNO = 'Straordinario Feriale (Prime 2h) (+25%)';
export const STRAORDINARIO_NOTTURNO = 'Straordinario Notturno Feriale';
export const STRAORDINARIO_FESTIVO = 'Straordinario Festivo Diurno';
export const STRAORDINARIO_FESTIVO_NOTTURNO = 'Straordinario Festivo Notturno';

// --- INTERFACCE ---
export interface DailyHours { [key: string]: number; }
export interface WeeklyHours { [date: string]: DailyHours; }

// --- FUNZIONI HELPER ---
const roundToTwoDecimals = (num: number): number => Math.round((num + Number.EPSILON) * 100) / 100;

const getMinutiPerFascia = (startMinutes: number, endMinutes: number): { minutiDiurni: number; minutiNotturni: number } => {
    let minutiDiurni = 0;
    let minutiNotturni = 0;

    // Fascia Notturna 1 (00:00 -> 06:00)
    minutiNotturni += Math.max(0, Math.min(endMinutes, 6 * 60) - Math.max(startMinutes, 0));
    // Fascia Diurna (06:00 -> 22:00)
    minutiDiurni += Math.max(0, Math.min(endMinutes, 22 * 60) - Math.max(startMinutes, 6 * 60));
    // Fascia Notturna 2 (22:00 -> ...)
    minutiNotturni += Math.max(0, endMinutes - Math.max(startMinutes, 22 * 60));
    
    return { minutiDiurni, minutiNotturni };
}

// --- FUNZIONE DI CALCOLO PRINCIPALE ---
export const calculateWeeklyHours = (
  rapportini: Rapportino[],
  masterData: MasterData,
  tecnicoId: string
): WeeklyHours => {
    const finalResult: WeeklyHours = {};
    const dailyLimitMinutes = 8 * 60;

    const rapportiniByDate: { [date: string]: Rapportino[] } = {};
    for (const r of rapportini) {
        if (r.isDeleted) continue;
        const techDetail = r.dettaglioOreTecnici?.find(d => d.tecnicoId === tecnicoId);
        if(!techDetail) continue; // Salta se non ci sono dettagli per questo tecnico
        const dateFromRapportino = toDateSafe(r.data);
        if (!dateFromRapportino) continue;
        const dateKey = format(dateFromRapportino, 'yyyy-MM-dd');
        if (!rapportiniByDate[dateKey]) {
            rapportiniByDate[dateKey] = [];
        }
        rapportiniByDate[dateKey].push(r);
    }

    for (const dateKey in rapportiniByDate) {
        const rapportiniDelGiorno = rapportiniByDate[dateKey];
        const data = toDateSafe(dateKey);
        if (!data) continue;

        let totalMinutiDiurni = 0;
        let totalMinutiNotturni = 0;
        let totalPausa = 0;

        for (const rapportino of rapportiniDelGiorno) {
            const techDetail = rapportino.dettaglioOreTecnici?.find(d => d.tecnicoId === tecnicoId);
            if (!techDetail) continue;

            if (techDetail.isManual) {
                totalMinutiDiurni += (techDetail.ore || 0) * 60;
            } else if (techDetail.oraInizio && techDetail.oraFine) {
                const start = parseTimeString(techDetail.oraInizio, data);
                const end = parseTimeString(techDetail.oraFine, data);
                if (!start || !end) continue;
                
                let startMinutes = timeToMinutes(format(start, 'HH:mm'));
                let endMinutes = timeToMinutes(format(end, 'HH:mm'));

                if (endMinutes < startMinutes) {
                    endMinutes += 24 * 60;
                }

                const { minutiDiurni, minutiNotturni } = getMinutiPerFascia(startMinutes, endMinutes);
                totalMinutiDiurni += minutiDiurni;
                totalMinutiNotturni += minutiNotturni;
                totalPausa += techDetail.pausa || 0;
            }
        }

        // Sottrai la pausa, prioritariamente dalle ore diurne
        const diurniPostPausa = Math.max(0, totalMinutiDiurni - totalPausa);
        const pausaResidua = Math.max(0, totalPausa - totalMinutiDiurni);
        const notturniPostPausa = Math.max(0, totalMinutiNotturni - pausaResidua);

        if (diurniPostPausa + notturniPostPausa === 0) continue;

        finalResult[dateKey] = {};
        const dayOfWeek = getDay(data);
        const isSaturday = dayOfWeek === 6;
        const isHoliday = masterData.festivita?.some(f => {
            const festivitaDate = toDateSafe(f.data);
            return festivitaDate ? format(festivitaDate, 'yyyy-MM-dd') === dateKey : false;
        }) || dayOfWeek === 0;

        if (isSaturday || isHoliday) {
            if (diurniPostPausa > 0) {
                const category = isHoliday ? STRAORDINARIO_FESTIVO : STRAORDINARIO_DIURNO;
                finalResult[dateKey][category] = roundToTwoDecimals(diurniPostPausa / 60);
            }
            if (notturniPostPausa > 0) {
                const category = isHoliday ? STRAORDINARIO_FESTIVO_NOTTURNO : STRAORDINARIO_NOTTURNO;
                finalResult[dateKey][category] = roundToTwoDecimals(notturniPostPausa / 60);
            }
        } else {
            const totalMinutes = diurniPostPausa + notturniPostPausa;
            const ordinaryMinutes = Math.min(totalMinutes, dailyLimitMinutes);
            const extraordinaryMinutes = totalMinutes - ordinaryMinutes;

            if (ordinaryMinutes > 0) {
                const ordinaryDiurni = Math.min(diurniPostPausa, ordinaryMinutes);
                const ordinaryNotturni = ordinaryMinutes - ordinaryDiurni;
                if(ordinaryDiurni > 0) finalResult[dateKey][ORE_ORDINARIE] = roundToTwoDecimals(ordinaryDiurni / 60);
                if(ordinaryNotturni > 0) finalResult[dateKey][LAVORO_NOTTURNO_ORDINARIO] = roundToTwoDecimals(ordinaryNotturni / 60);
            }
            
            if (extraordinaryMinutes > 0) {
                const extraordinaryDiurni = diurniPostPausa - (finalResult[dateKey][ORE_ORDINARIE] || 0) * 60;
                const extraordinaryNotturni = notturniPostPausa - (finalResult[dateKey][LAVORO_NOTTURNO_ORDINARIO] || 0) * 60;
                if(extraordinaryDiurni > 0) finalResult[dateKey][STRAORDINARIO_DIURNO] = roundToTwoDecimals(extraordinaryDiurni / 60);
                if(extraordinaryNotturni > 0) finalResult[dateKey][STRAORDINARIO_NOTTURNO] = roundToTwoDecimals(extraordinaryNotturni / 60);
            }
        }
    }
    return finalResult;
};