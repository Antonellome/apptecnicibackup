
import { db } from './local-db';
import { TipoGiornata } from '@/models/definitions';

// --- TIPI GIORNATA PREDEFINITI ---
export const TIPI_GIORNATA_PREDEFINITI: Omit<TipoGiornata, 'id'>[] = [
    { nome: 'Ordinaria', colore: '#4caf50', categoria: 'normale', tipo: 'oraria', lavorativo: true, icona: 'work' },
    { nome: 'Straordinario', colore: '#f44336', categoria: 'straordinario', tipo: 'oraria', lavorativo: true, icona: 'add_alarm' },
    { nome: 'Trasferta Italia', colore: '#2196f3', categoria: 'trasferta', tipo: 'giornaliera', lavorativo: true, icona: 'flight' },
    { nome: 'Trasferta Europa', colore: '#ff9800', categoria: 'trasferta', tipo: 'giornaliera', lavorativo: true, icona: 'public' },
    { nome: 'Trasferta ExtraEuropea', colore: '#9c27b0', categoria: 'trasferta', tipo: 'giornaliera', lavorativo: true, icona: 'language' },
    { nome: 'Festivo', colore: '#e91e63', categoria: 'festivo', tipo: 'giornaliera', lavorativo: false, icona: 'celebration' },
    { nome: 'Ferie', colore: '#00bcd4', categoria: 'ferie', tipo: 'giornaliera', lavorativo: false, icona: 'beach_access' },
    { nome: 'Malattia', colore: '#607d8b', categoria: 'malattia', tipo: 'giornaliera', lavorativo: false, icona: 'sick' },
    { nome: 'Legge 104', colore: '#795548', categoria: 'permesso', tipo: 'oraria', lavorativo: false, icona: 'accessible' },
    { nome: 'Permesso', colore: '#ffc107', categoria: 'permesso', tipo: 'oraria', lavorativo: false, icona: 'hourglass_empty' },
];

// --- IMPOSTAZIONI PREDEFINITE ---
const IMPOSTAZIONI_PREDEFINITE = {
    tariffe: [
        { tipoGiornataId: 'Ordinaria', costo: 10.00, unita: 'h' as const },
        { tipoGiornataId: 'Straordinario', costo: 15.00, unita: 'h' as const },
        { tipoGiornataId: 'Trasferta Italia', costo: 20.00, unita: 'g' as const },
        { tipoGiornataId: 'Trasferta Europa', costo: 40.00, unita: 'g' as const },
        { tipoGiornataId: 'Trasferta ExtraEuropea', costo: 80.00, unita: 'g' as const },
        { tipoGiornataId: 'Festivo', costo: 640.00, unita: 'g' as const },
        { tipoGiornataId: 'Ferie', costo: 640.00, unita: 'g' as const },
        { tipoGiornataId: 'Malattia', costo: 640.00, unita: 'g' as const },
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
        await db.impostazioni.add({ id: 'default', tariffe: tariffeConId });
        console.log('Tariffe aggiornate nelle impostazioni locali.');
    });

    console.log('Seeding completato.');
};
