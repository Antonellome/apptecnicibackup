
import { isValid } from 'date-fns';

/**
 * Converte in modo sicuro e robusto vari tipi di input in un oggetto Date valido.
 * Gestisce Timestamp di Firestore, stringhe ISO, timestamp numerici e oggetti Date nativi.
 * 
 * @param dateInput L'input da convertire (può essere un oggetto, stringa, numero o Date).
 * @returns Un oggetto Date valido o `null` se l'input è invalido o non riconoscibile.
 */
export const parseAndValidateDate = (dateInput: any): Date | null => {
    if (!dateInput) return null;
    
    let candidateDate: Date;

    // CORREZIONE: Il server Firebase restituisce timestamp con _seconds, non seconds.
    if (typeof dateInput === 'object' && dateInput !== null && typeof dateInput._seconds === 'number') {
        candidateDate = new Date(dateInput._seconds * 1000);
    }
    // Caso 1: Timestamp di Firestore (oggetto con `seconds` e `nanoseconds`)
    else if (typeof dateInput === 'object' && dateInput !== null && typeof dateInput.seconds === 'number') {
        candidateDate = new Date(dateInput.seconds * 1000);
    }
    // Caso 2: Stringa (es. formato ISO) o Numero (timestamp in ms)
    else if (typeof dateInput === 'string' || typeof dateInput === 'number') {
        candidateDate = new Date(dateInput);
    }
    // Caso 3: È già un oggetto Date JavaScript (o un clone da Dexie che si comporta come tale)
    else if (Object.prototype.toString.call(dateInput) === '[object Date]') {
        candidateDate = dateInput as Date;
    } 
    // Caso 4: Oggetto con un metodo .toDate() (come i vecchi timestamp di Firebase)
    else if (typeof dateInput === 'object' && dateInput !== null && typeof dateInput.toDate === 'function') {
        candidateDate = dateInput.toDate();
    }
    else {
        console.error("Formato data non riconoscibile:", dateInput);
        return null;
    }

    if (!isValid(candidateDate)) {
        console.error("Input ha prodotto una data invalida:", dateInput);
        return null;
    }
    
    return candidateDate;
};
