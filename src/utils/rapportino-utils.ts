
import { Rapportino, DettaglioOreData } from '@/models/definitions';

export const getInitialRapportinoState = (tecnicoId: string, tecnicoNome: string): Rapportino => ({
    id: '',
    nome: '',
    data: new Date(),
    tecnicoId: tecnicoId,
    tipoGiornataId: '',
    giornataId: '',
    dettaglioOreTecnici: [{
        tecnicoId: tecnicoId,
        nome: tecnicoNome,
        oraInizio: '07:30',
        oraFine: '16:00',
        pausa: 60,
        ore: 8,
        isManual: false,
    }],
    presenze: [tecnicoId],
    veicoloId: '',
    naveId: '',
    luogoId: '',
    descrizioneBreve: '',
    lavoroEseguito: '',
    materialiImpiegati: '',
    includeTrasferta: false,
    trasfertaId: undefined,
    firmaFirmatarioNome: '',
    firmaFirmatarioSocieta: '',
    firmaVettoriale: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: tecnicoId,
    version: 1,
    isLocked: false,
    isMultiDay: false,
    tecnicoScriventeId: tecnicoId,
});


export const calculateOre = (dettaglio: Partial<DettaglioOreData>): number => {
    if (dettaglio.isManual) {
        return parseFloat(String(dettaglio.ore)) || 0;
    }

    const inizio = new Date(`1970-01-01T${dettaglio.oraInizio || '00:00'}`);
    const fine = new Date(`1970-01-01T${dettaglio.oraFine || '00:00'}`);

    if (fine <= inizio) {
        fine.setDate(fine.getDate() + 1);
    }

    const diffMs = fine.getTime() - inizio.getTime();
    const diffMin = diffMs / (1000 * 60);

    const pausa = dettaglio.pausa || 0;

    const oreLavorate = (diffMin - pausa) / 60;

    return Math.round(oreLavorate * 4) / 4;
};
