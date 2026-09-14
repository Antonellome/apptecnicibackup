import { db } from './local-db';
import { TipoGiornata } from '@/models/definitions';

// --- TIPI GIORNATA PREDEFINITI ---
// Corretto per corrispondere all'interfaccia TipoGiornata. Rimossi campi obsoleti.
export const TIPI_GIORNATA_PREDEFINITI: Omit<TipoGiornata, 'id'>[] = [
    { nome: 'Ordinaria', colore: '#4caf50', tipo: 'oraria', sigla: 'O' },
    { nome: 'Straordinario', colore: '#f44336', tipo: 'oraria', sigla: 'S' },
    { nome: 'Trasferta Italia', colore: '#2196f3', tipo: 'giornaliera', sigla: 'TI' },
    { nome: 'Trasferta Europa', colore: '#ff9800', tipo: 'giornaliera', sigla: 'TE' },
    { nome: 'Trasferta ExtraEuropea', colore: '#9c27b0', tipo: 'giornaliera', sigla: 'TX' },
    { nome: 'Festivo', colore: '#e91e63', tipo: 'giornaliera', sigla: 'F' },
    { nome: 'Ferie', colore: '#00bcd4', tipo: 'giornaliera', sigla: 'FE' },
    { nome: 'Malattia', colore: '#607d8b', tipo: 'giornaliera', sigla: 'M' },
    { nome: 'Legge 104', colore: '#795548', tipo: 'oraria', sigla: 'L' },
    { nome: 'Permesso', colore: '#ffc107', tipo: 'oraria', sigla: 'P' },
];


// --- IMPOSTAZIONI PREDEFINITE ---
const IMPOSTAZIONI_PREDEFINITE = {
    tariffe: [
        { tipoGiornataId: 'Ordinaria', costo: 10.00, unita: 'h' as const },
        { tipoGiornataId: 'Straordinario', costo: 15.00, unita: 'h' as const },
        { tipoGiornataId: 'Trasferta Italia', costo: 20.00, unita: 'g' as const },
        { tipoGiornataId: 'Trasferta Europa', costo: 40.00, unita: 'g' as const },
        { tipoGiornataId: 'Trasferta ExtraEuropea', costo: 80.00, unita: 'g' as const },
        { tipoGiornataId: 'Festivo', costo: 80.00, unita: 'g' as const },
        { tipoGiornataId: 'Ferie', costo: 80.00, unita: 'g' as const },
        { tipoGiornataId: 'Malattia', costo: 80.00, unita: 'g' as const },
        { tipoGiornataId: 'Legge 104', costo: 10.00, unita: 'h' as const },
        { tipoGiornataId: 'Permesso', costo: 10.00, unita: 'h' as const },
    ]
};

export const seedInitialData = async () => {
    console.log('Avvio procedura di seeding/aggiornamento forzato...');

    await db.transaction('rw', db.tipiGiornata, db.impostazioni, async () => {
        // 1. Cancellazione forzata dei dati di configurazione vecchi
        await db.tipiGiornata.clear();
        await db.impostazioni.clear();
        console.log('Dati di configurazione precedenti rimossi.');

        // 2. Aggiunta dei nuovi tipi giornata con ID leggibili
        const tipiGiornataToAdd = TIPI_GIORNATA_PREDEFINITI.map(tipo => ({
            ...tipo,
            id: tipo.nome.replace(/\s+/g, '') // Crea un ID stabile, es: 'TrasfertaItalia'
        }));
        await db.tipiGiornata.bulkAdd(tipiGiornataToAdd);
        console.log('Nuovi tipi giornata inseriti.');

        // 3. Associazione tariffe con i nuovi ID
        const tipiGiornataMap = new Map(tipiGiornataToAdd.map(t => [t.nome, t.id]));
        const tariffeConId = IMPOSTAZIONI_PREDEFINITE.tariffe.map(tariffa => ({
            id: tipiGiornataMap.get(tariffa.tipoGiornataId) || '',
            tipoGiornataId: tipiGiornataMap.get(tariffa.tipoGiornataId) || '',
            nome: tariffa.tipoGiornataId, // Aggiunto per conformità
            tariffa: tariffa.costo, // Aggiunto per conformità
            costo: tariffa.costo,
            unita: tariffa.unita
        })).filter(t => t.id);

        // 4. Salvataggio delle impostazioni
        // Errore corretto: id deve essere 'main' come da interfaccia Impostazioni
        await db.impostazioni.add({ id: 'main', tariffe: tariffeConId, version: 8 });
        console.log('Tariffe aggiornate nelle impostazioni locali.');
    });

    console.log('Seeding completato.');
};
