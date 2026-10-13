import { set } from 'date-fns';

const toDateSafe = (date: any): Date | null => {
  if (!date) return null;
  if (date instanceof Date) return date;
  if (typeof date.toDate === 'function') return date.toDate();
  
  if (typeof date._seconds === 'number' && typeof date._nanoseconds === 'number') {
    return new Date(date._seconds * 1000 + date._nanoseconds / 1000000);
  }
  if (typeof date.seconds === 'number' && typeof date.nanoseconds === 'number') {
    return new Date(date.seconds * 1000 + date.nanoseconds / 1000000);
  }

  const parsedDate = new Date(date);
  return isNaN(parsedDate.getTime()) ? null : parsedDate;
};

/**
 * Converte una stringa oraria (es. "14:30") in un oggetto Date,
 * utilizzando la parte della data da un altro oggetto Date.
 * @param timeString La stringa oraria (HH:mm).
 * @param baseDate L'oggetto Date da cui prendere l'anno, il mese e il giorno.
 * @returns Un nuovo oggetto Date o null se il formato non è valido.
 */
const parseTimeString = (timeString: string, baseDate: Date): Date | null => {
    if (!timeString || !baseDate) return null;
    
    try {
        const [hours, minutes] = timeString.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes)) return null;

        return set(baseDate, { hours, minutes, seconds: 0, milliseconds: 0 });
    } catch (error) {
        console.error("Errore nel parsing dell'ora:", error);
        return null;
    }
};

/**
 * Converte una stringa oraria (es. "14:30") nel numero totale di minuti dall'inizio della giornata.
 * @param timeString La stringa oraria (HH:mm).
 * @returns Il numero totale di minuti.
 */
const timeToMinutes = (timeString: string): number => {
  if (!timeString) return 0;
  try {
    const [hours, minutes] = timeString.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return 0;
    return hours * 60 + minutes;
  } catch (error) {
    console.error("Errore nella conversione dell'ora in minuti:", error);
    return 0;
  }
};

export { toDateSafe, parseTimeString, timeToMinutes };