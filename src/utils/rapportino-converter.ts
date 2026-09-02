import { Rapportino, EnrichedRapportino, MasterData, TipoGiornata } from '@/models/definitions';
import { Timestamp } from 'firebase/firestore';

export const enrichRapportino = (rapportino: Rapportino, masterData: MasterData, currentTecnicoId: string): EnrichedRapportino => {
    const tipiGiornataMap = new Map(masterData.tipiGiornata.map((t) => [t.id, t]));
    const naviMap = new Map(masterData.navi.map((n) => [n.id, n.nome]));
    const luoghiMap = new Map(masterData.luoghi.map((l) => [l.id, l.nome]));
    const tecniciMap = new Map(masterData.tecnici.map((t) => [t.id, `${t.nome} ${t.cognome}`]));

    const reportDate = rapportino.data instanceof Timestamp ? rapportino.data.toDate() : new Date(rapportino.data as any);
    
    const tipoGiornata = tipiGiornataMap.get(rapportino.tipoGiornataId!) as TipoGiornata || { id: '', nome: 'N/D', colore: '', sigla: '', tipo: 'oraria', lavorativo: false, icona: '' };

    let oreDisplay = '';
    let oreGiorno = 0;
    const dettaglioTecnico = rapportino.dettaglioOreTecnici.find(d => d.tecnicoId === currentTecnicoId);

    if (dettaglioTecnico) {
        if (dettaglioTecnico.isManual) {
            oreDisplay = `${dettaglioTecnico.ore}h`;
            oreGiorno = dettaglioTecnico.ore;
        } else {
            oreDisplay = `${dettaglioTecnico.oraInizio}-${dettaglioTecnico.oraFine} (${dettaglioTecnico.pausa}p)`;
            const [startH, startM] = dettaglioTecnico.oraInizio.split(':').map(Number);
            const [endH, endM] = dettaglioTecnico.oraFine.split(':').map(Number);
            oreGiorno = (endH + endM / 60) - (startH + startM / 60) - (dettaglioTecnico.pausa / 60);
        }
    }

    return {
        ...rapportino,
        id: rapportino.id,
        data: reportDate,
        tipoGiornata: tipoGiornata,
        naveNome: rapportino.naveId ? naviMap.get(rapportino.naveId) : undefined,
        luogoNome: rapportino.luogoId ? luoghiMap.get(rapportino.luogoId) : undefined,
        isOffline: rapportino.isOffline || false,
        isEditable: true,
        oreDisplay: oreDisplay,
        oreGiorno: oreGiorno,
        creatore: tecniciMap.get(rapportino.tecnicoId) || 'N/D',
    };
};