import { Rapportino, MasterData } from '@/models/definitions';
import { toDateSafe, parseTimeString } from './dateUtils';
import {
  getDay,
  startOfDay,
  endOfDay,
  differenceInMinutes,
  format,
  set,
  addDays,
  isBefore,
  isAfter,
  min,
  max,
  startOfWeek,
} from 'date-fns';

// --- TIPI DI ORE (COSTANTI) ---
export const ORE_ORDINARIE = 'Ore Ordinarie';
export const LAVORO_NOTTURNO_ORDINARIO = 'Lavoro Notturno Ordinario';
export const LAVORO_FESTIVO_ORDINARIO = 'Lavoro Festivo Ordinario';
export const LAVORO_FESTIVO_NOTTURNO_ORDINARIO = 'Lavoro Festivo Notturno Ordinario';
export const STRAORDINARIO_DIURNO = 'Straordinario Diurno';
export const STRAORDINARIO_NOTTURNO = 'Straordinario Notturno';
export const STRAORDINARIO_FESTIVO = 'Straordinario Festivo';
export const STRAORDINARIO_FESTIVO_NOTTURNO = 'Straordinario Festivo Notturno';

// --- INTERFACCE ---
export interface DailyHours { [key: string]: number; }
export interface WeeklyHours { [date: string]: DailyHours; }
interface WorkInterval { start: Date; end: Date; }

// --- FUNZIONI HELPER ---
const roundToTwoDecimals = (num: number): number => Math.round((num + Number.EPSILON) * 100) / 100;

const mergeOverlappingIntervals = (intervals: WorkInterval[]): WorkInterval[] => {
    if (intervals.length <= 1) return intervals;
    const sorted = [...intervals].sort((a, b) => a.start.getTime() - b.start.getTime());
    const merged: WorkInterval[] = [sorted[0]];
    for (let i = 1; i < sorted.length; i++) {
        const last = merged[merged.length - 1];
        const current = sorted[i];
        if (current.start.getTime() < last.end.getTime()) {
            last.end = max([last.end, current.end]);
        } else {
            merged.push(current);
        }
    }
    return merged;
};

// --- FUNZIONE DI CALCOLO (FINALE E CORRETTA) ---
export const calculateWeeklyHours = (
  rapportini: Rapportino[],
  masterData: MasterData,
  tecnicoId: string
): WeeklyHours => {
    const weeklyLimitMinutes = 40 * 60;
    const dailyLimitMinutes = 8 * 60;
    const finalResult: WeeklyHours = {};

    if (!rapportini || rapportini.length === 0) return {};

    const allIntervals: WorkInterval[] = rapportini.flatMap(r => {
        if (r.isDeleted) return [];
        const rapportinoDate = toDateSafe(r.data);
        if (!rapportinoDate) return [];
        const techDetail = r.dettaglioOreTecnici?.find(d => d.tecnicoId === tecnicoId);
        if (!techDetail || !techDetail.oraInizio || !techDetail.oraFine) return [];
        
        const start = parseTimeString(techDetail.oraInizio, rapportinoDate);
        let end = parseTimeString(techDetail.oraFine, rapportinoDate);
        if (!start || !end) return [];

        if (isBefore(end, start)) {
            end = addDays(end, 1);
        }
        if (!isAfter(end, start)) return [];

        const pause = techDetail.pausa || 0;
        const netDuration = differenceInMinutes(end, start) - pause;
        if (netDuration <= 0) return [];

        return [{ start, end: new Date(start.getTime() + netDuration * 60000) }];
    });

    const mergedIntervals = mergeOverlappingIntervals(allIntervals);
    if (mergedIntervals.length === 0) return {};
    
    // --- LOGICA DI SUDDIVISIONE GIORNALIERA (CORRETTA) ---
    const dailyIntervals: Record<string, WorkInterval[]> = {};
    mergedIntervals.forEach(interval => {
        let cursor = interval.start;
        while (isBefore(cursor, interval.end)) {
            const dayKey = format(cursor, 'yyyy-MM-dd');
            const nextDayStart = startOfDay(addDays(cursor, 1));
            const endOfChunk = min([interval.end, nextDayStart]);

            if (!dailyIntervals[dayKey]) {
                dailyIntervals[dayKey] = [];
            }
            dailyIntervals[dayKey].push({ start: cursor, end: endOfChunk });
            cursor = endOfChunk;
        }
    });

    const weeks = Object.keys(dailyIntervals).reduce((acc, dayKey) => {
        const weekKey = format(startOfWeek(toDateSafe(dayKey), { weekStartsOn: 1 }), 'yyyy-MM-dd');
        if (!acc[weekKey]) acc[weekKey] = [];
        acc[weekKey].push(dayKey);
        return acc;
    }, {} as Record<string, string[]>);

    for (const weekKey in weeks) {
        let weeklyBaseMinutes = 0;
        const weekDays = weeks[weekKey].sort();

        for (const dayKey of weekDays) {
            let dailyTotalMinutes = 0;
            finalResult[dayKey] = {};
            const intervalsForDay = mergeOverlappingIntervals(dailyIntervals[dayKey] || []);

            for (const interval of intervalsForDay) {
                let cursor = interval.start;
                while (isBefore(cursor, interval.end)) {
                    const h = cursor.getHours();
                    const day = startOfDay(cursor);
                    const sliceEnd = min([interval.end, (h >= 6 && h < 22) ? set(day, { hours: 22 }) : (h < 6 ? set(day, { hours: 6 }) : set(addDays(day, 1), { hours: 6 }))]);
                    
                    let chunkDuration = differenceInMinutes(sliceEnd, cursor);
                    if (chunkDuration <= 0) { cursor = sliceEnd; continue; }
                    
                    const dayOfWeek = getDay(cursor);
                    const isHoliday = masterData.festivi?.includes(dayKey) || dayOfWeek === 0;
                    const type = (h >= 6 && h < 22) ? 'diurno' : 'notturno';

                    const minutesToProcess = chunkDuration;
                    let minutesRemainingInChunk = minutesToProcess;

                    const dailyOvertimeStart = dailyLimitMinutes - dailyTotalMinutes;
                    const dailyOvertimeMinutes = Math.max(0, minutesRemainingInChunk - Math.max(0, dailyOvertimeStart));

                    if (dailyOvertimeMinutes > 0) {
                        let category = isHoliday ? (type === 'notturno' ? STRAORDINARIO_FESTIVO_NOTTURNO : STRAORDINARIO_FESTIVO) : (type === 'notturno' ? STRAORDINARIO_NOTTURNO : STRAORDINARIO_DIURNO);
                        finalResult[dayKey][category] = (finalResult[dayKey][category] || 0) + dailyOvertimeMinutes / 60;
                        minutesRemainingInChunk -= dailyOvertimeMinutes;
                    }

                    const baseMinutesInChunk = minutesRemainingInChunk;
                    if (baseMinutesInChunk > 0) {
                        const weeklyOvertimeStart = weeklyLimitMinutes - weeklyBaseMinutes;
                        const weeklyOvertimeMinutes = Math.max(0, baseMinutesInChunk - Math.max(0, weeklyOvertimeStart));

                        if (weeklyOvertimeMinutes > 0) {
                            let category = isHoliday ? (type === 'notturno' ? STRAORDINARIO_FESTIVO_NOTTURNO : STRAORDINARIO_FESTIVO) : (type === 'notturno' ? STRAORDINARIO_NOTTURNO : STRAORDINARIO_DIURNO);
                            finalResult[dayKey][category] = (finalResult[dayKey][category] || 0) + weeklyOvertimeMinutes / 60;
                        }

                        const ordinaryMinutes = baseMinutesInChunk - weeklyOvertimeMinutes;
                        if (ordinaryMinutes > 0) {
                            let category = isHoliday ? (type === 'notturno' ? LAVORO_FESTIVO_NOTTURNO_ORDINARIO : LAVORO_FESTIVO_ORDINARIO) : (type === 'notturno' ? LAVORO_NOTTURNO_ORDINARIO : ORE_ORDINARIE);
                            finalResult[dayKey][category] = (finalResult[dayKey][category] || 0) + ordinaryMinutes / 60;
                            weeklyBaseMinutes += ordinaryMinutes;
                        }
                    }
                    dailyTotalMinutes += minutesToProcess;
                    cursor = sliceEnd;
                }
            }
        }
    }

    for (const date in finalResult) {
        for (const type in finalResult[date]) {
            finalResult[date][type] = roundToTwoDecimals(finalResult[date][type]);
        }
    }
    return finalResult;
};