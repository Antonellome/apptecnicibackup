
import { Rapportino, DettaglioOreData } from '@/models/definitions';

// NOTA: Rimosso l'import di Timestamp perché non più necessario e causa di errore.

export const getInitialRapportinoState = (tecnicoId: string): Rapportino => ({
    id: '',
    nome: '', // Aggiunto per conformità al tipo
    data: new Date(), // CORREZIONE: da Timestamp.fromDate(new Date()) a new Date()
    tecnicoId: tecnicoId,
    tipoGiornataId: '',
    isTrasferta: false,
    oraInizio: '07:30',
    oraFine: '16:00',
    pausa: 60,

    // Adeguato alla struttura piatta del tipo Rapportino
    dettaglioOreTecnici: [{
        tecnicoId: tecnicoId,
        nome: '', // Sarà popolato dal profilo utente
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

    // Aggiunto per conformità
    firmaFirmatarioNome: '',
    firmaFirmatarioSocieta: '',
    firmaVettoriale: null,
    createdAt: new Date(),
    updatedAt: new Date(),
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
