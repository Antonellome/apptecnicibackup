
import 'fake-indexeddb/auto';
import { vi } from 'vitest';

vi.mock('@/db/local-db', () => ({
    db: {
        tipiGiornata: {
            toArray: vi.fn().mockResolvedValue([
                { id: '1', nome: 'Ordinaria' },
                { id: '2', nome: 'Straordinaria' },
                { id: '3', nome: 'Ferie' },
            ]),
        },
        users: {
            toArray: vi.fn().mockResolvedValue([
                { id: '1', nome: 'User Test' },
            ]),
             where: vi.fn(() => ({
                first: vi.fn().mockResolvedValue({ id: '1', nome: 'User Test' })
            }))
        },
        navi: {
            toArray: vi.fn().mockResolvedValue([
                { id: '1', nome: 'Nave Test' },
            ]),
        },
        veicoli: {
            toArray: vi.fn().mockResolvedValue([
                { id: '1', targa: 'AB123CD', modello: 'Modello Test' },
            ]),
        },
        luoghi: {
            toArray: vi.fn().mockResolvedValue([
                { id: '1', nome: 'Luogo Test' },
            ]),
        },
         rapportini: {
            add: vi.fn().mockResolvedValue('1'),
            update: vi.fn().mockResolvedValue('1'),
            get: vi.fn().mockResolvedValue({ id: '1' }),
            where: vi.fn(() => ({ 
                first: vi.fn().mockResolvedValue(undefined)
            }))
        },
        dettaglioOre: {
            bulkAdd: vi.fn().mockResolvedValue('1'),
            where: vi.fn(() => ({ 
                delete: vi.fn().mockResolvedValue(undefined),
                toArray: vi.fn().mockResolvedValue([]),
            }))
        }
    }
}));
