
import { db } from './local-db';
import { MasterData, TipoGiornata } from '@/models/definitions';

// --- TIPI GIORNATA PREDEFINITI ---
export const TIPI_GIORNATA_PREDEFINITI: Omit<TipoGiornata, 'id'>[] = [
    { nome: 'Ordinaria', colore: '#4caf50', natura: 'oraria' },
    { nome: 'Straordinario', colore: '#f44336', natura: 'oraria' },
    { nome: 'Trasferta Italia', colore: '#2196f3', natura: 'trasferta' },
    { nome: 'Trasferta Europa', colore: '#ff9800', natura: 'trasferta' },
    { nome: 'Trasferta ExtraEuropea', colore: '#9c27b0', natura: 'trasferta' },
    { nome: 'Festivo', colore: '#e91e63', natura: 'giornaliera' },
    { nome: 'Ferie', colore: '#00bcd4', natura: 'giornaliera' },
    { nome: 'Malattia', colore: '#607d8b', natura: 'giornaliera' },
    { nome: 'Legge 104', colore: '#795548', natura: 'oraria' },
    { nome: 'Permesso', colore: '#ffc107', natura: 'oraria' },
];

// --- IMPOSTAZIONI PREDEFINITE ---
const IMPOSTAZIONI_PREDEFINITE = {
    tariffe: [
        { tipoGiornataId: 'Ordinaria', costo: 10.00 },
        { tipoGiornataId: 'Straordinario', costo: 15.00 },
        { tipoGiornataId: 'Trasferta Italia', costo: 20.00 },
        { tipoGiornataId: 'Trasferta Europa', costo: 40.00 },
        { tipoGiornataId: 'Trasferta ExtraEuropea', costo: 80.00 },
        { tipoGiornataId: 'Festivo', costo: 640.00 },
        { tipoGiornataId: 'Ferie', costo: 640.00 },
        { tipoGiornataId: 'Malattia', costo: 640.00 },
        { tipoGiornataId: 'Legge 104', costo: 10.00 },
        { tipoGiornataId: 'Permesso', costo: 10.00 },
    ]
};

export const seedInitialData = async () => {
    console.log('Avvio procedura di seeding/aggiornamento forzato...');

    // 1. Cancellazione forzata dei dati di configurazione vecchi
    await db.tipiGiornata.clear();
    await db.masterData.clear();
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
        id: tipiGiornataMap.get(tariffa.tipoGiornataId) || '', // Usa l'ID stabile
        costo: tariffa.costo,
    })).filter(t => t.id); // Filtra eventuali mancate associazioni

    // 4. Salvataggio delle impostazioni in masterData
    // Si presume che ci sia un solo record in masterData per le impostazioni
    const masterDataEntry = await db.masterData.get('impostazioni');
    if (masterDataEntry) {
        await db.masterData.update('impostazioni', { impostazioni: { tariffe: tariffeConId } });
    } else {
        await db.masterData.add({ id: 'impostazioni', impostazioni: { tariffe: tariffeConId } } as any);
    }
    console.log('Tariffe aggiornate nel masterData locale.');

    console.log('Seeding completato.');
};
