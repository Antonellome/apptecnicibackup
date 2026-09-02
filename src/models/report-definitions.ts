
// src/models/report-definitions.ts

/**
 * Definisce la struttura dei dati per il riepilogo giornaliero,
 * utilizzato sia dalla tabella che dal generatore di PDF.
 */
export interface DailySummary {
    day: Date;
    activities: { nome: string; colore: string | undefined }[];
    insertedHours: number;
    ordinarie: number;
    straordinarie: number;
    otherHours: { [key: string]: number };
}

/**
 * Definisce la struttura dei totali per il riepilogo giornaliero.
 */
export interface Totals {
    insertedHours: number;
    ordinarie: number;
    straordinarie: number;
    [key: string]: number; // Per i tipi di ore dinamici
}
