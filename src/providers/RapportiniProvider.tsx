
import React, { useState, ReactNode } from 'react';
import { Rapportino } from '@/models/definitions';
import { RapportiniContext } from '../contexts/RapportiniContext';

interface RapportiniProviderProps {
    children: ReactNode;
}

// Dati mock RICOSTRUITI per essere conformi al 100% con la definizione di Rapportino
const mockRapportini: Rapportino[] = [
    {
        id: '1',
        nome: 'Rapportino Mock Conforme',
        data: new Date(),
        tecnicoId: 'userId1',
        tipoGiornataId: 'lavoro',
        giornataId: 'lavoro',
        dettaglioOreTecnici: [{
            tecnicoId: 'userId1',
            nome: 'Mario Rossi',
            isManual: false,
            oraInizio: '08:00',
            oraFine: '17:00',
            pausa: 60,
            ore: 8,
        }],
        presenze: ['userId1'],
        veicoloId: 'veicolo1',
        naveId: 'nave1',
        luogoId: 'luogo1',
        descrizioneBreve: 'Intervento di prova',
        lavoroEseguito: 'Lavoro di routine mock.',
        materialiImpiegati: 'Nessun materiale',
        includeTrasferta: false,
        firmaFirmatarioNome: 'Cliente Prova',
        firmaFirmatarioSocieta: 'Società Prova',
        firmaVettoriale: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'mockUserId',
        version: 1,
        isLocked: false,
        tecnicoScriventeId: 'userId1',
    }
];

export const RapportiniProvider: React.FC<RapportiniProviderProps> = ({ children }) => {
    const [rapportini, setRapportini] = useState<Rapportino[]>(mockRapportini);
    const [loading] = useState(false);

    const addRapportino = async (rapportino: Rapportino) => {
        const newId = (Math.random() + 1).toString(36).substring(7);
        const newRapportino = { ...rapportino, id: newId };
        setRapportini(prev => [...prev, newRapportino]);
    };

    const updateRapportino = async (rapportino: Rapportino) => {
        setRapportini(prev => prev.map(r => r.id === rapportino.id ? rapportino : r));
    };

    const getRapportinoById = (id: string): Rapportino | undefined => {
        return rapportini.find(r => r.id === id);
    };

    const value = {
        rapportini,
        addRapportino,
        updateRapportino,
        getRapportinoById,
        loading
    };

    return (
        <RapportiniContext.Provider value={value}>
            {children}
        </RapportiniContext.Provider>
    );
};
