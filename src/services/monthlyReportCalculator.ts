import { Rapportino, MasterData, UserProfile, EnrichedRapportino, RiepilogoMese, Impostazioni } from '@/models/definitions';
import { format } from 'date-fns';
import { toDateSafe } from '@/utils/dateUtils'; // Importa la funzione sicura

// --- Funzioni Pure di Arricchimento e Calcolo ---

export const enrichRapportini = (
    rapportini: Rapportino[], 
    masterData: MasterData, 
    userProfile: UserProfile
): EnrichedRapportino[] => {
    const tipiGiornataMap = new Map(masterData.tipiGiornata.map(t => [t.id, t]));

    return rapportini.map(r => {
        const dataSicura = toDateSafe(r.data);
        if (!dataSicura) return null; // Scarta i rapportini con data non valida

        const tipoGiornata = tipiGiornataMap.get(r.tipoGiornataId);
        let oreEffettive = 0;

        const dettaglioTecnico = r.dettaglioOreTecnici?.find(d => d.tecnicoId === userProfile.tecnicoId);
        if (dettaglioTecnico) {
            oreEffettive = dettaglioTecnico.ore || 0;
        } else if (r.tecnicoId === userProfile.tecnicoId) {
            oreEffettive = r.oreLavoro || 0;
        }

        const isVecchioReportTrasferta = tipoGiornata?.categoria === 'trasferta';
        const tipoGiornataDaUsareId = isVecchioReportTrasferta ? 't_ordinaria' : r.tipoGiornataId;
        const trasfertaId = isVecchioReportTrasferta ? r.tipoGiornataId : r.trasfertaId;

        return { 
            ...r, 
            data: dataSicura, // Usa la data sicura
            tipoGiornata: tipiGiornataMap.get(tipoGiornataDaUsareId),
            oreGiorno: oreEffettive,
            trasfertaId,
            tipoGiornataId: tipoGiornataDaUsareId,
            isEditable: r.tecnicoId === userProfile.tecnicoId,
        };
    }).filter((r): r is EnrichedRapportino => r !== null && (r.oreGiorno > 0 || !!r.trasfertaId));
};

export const calculateSummary = (
    enrichedRapportini: EnrichedRapportino[],
    masterData: MasterData
): RiepilogoMese => {
    const tariffeMap = new Map((masterData.impostazioni as Impostazioni).tariffe.map(t => [t.tipoGiornataId, t]));
    
    const riepilogo: RiepilogoMese = {
        dettaglio: new Map(),
        oreTotali: 0, giorniTotaliLavorati: 0, giorniTrasferta: 0,
        costoTotale: 0, oreOrdinarie: 0, oreStraordinarie: 0,
    };

    masterData.tipiGiornata.forEach(tipo => {
        const tariffa = tariffeMap.get(tipo.id);
        riepilogo.dettaglio.set(tipo.id, { 
            id: tipo.id, nome: tipo.nome, colore: tipo.colore, unita: tariffa?.unita || 'h',
            oreTotali: 0, giorni: 0, costo: 0, giorniSet: new Set()
        });
    });

    const groupedByDay = enrichedRapportini.reduce((acc, r) => {
        const date = toDateSafe(r.data);
        if (!date) return acc; // Salta se la data non è valida
        const dayKey = format(date, 'yyyy-MM-dd');
        if (!acc[dayKey]) acc[dayKey] = [];
        acc[dayKey].push(r);
        return acc;
    }, {} as Record<string, EnrichedRapportino[]>);

    const voceOrdinaria = riepilogo.dettaglio.get('t_ordinaria');
    const voceStraordinaria = riepilogo.dettaglio.get('t_straordinaria');

    for (const dayKey in groupedByDay) {
        const reports = groupedByDay[dayKey];
        let oreDaSplittareDelGiorno = 0;
        let trasfertaProcessedForDay = false;
        
        reports.forEach(report => {
            if (report.tipoGiornataId === 't_ordinaria') {
                oreDaSplittareDelGiorno += report.oreGiorno;
            } else {
                const voceRiepilogo = riepilogo.dettaglio.get(report.tipoGiornataId);
                if (voceRiepilogo) {
                    voceRiepilogo.oreTotali += report.oreGiorno;
                    voceRiepilogo.giorniSet?.add(dayKey);
                }
            }

            if (report.trasfertaId && !trasfertaProcessedForDay) {
                const voceTrasferta = riepilogo.dettaglio.get(report.trasfertaId);
                if (voceTrasferta) {
                    voceTrasferta.giorniSet?.add(dayKey);
                    trasfertaProcessedForDay = true;
                }
            }
        });
        
        if(oreDaSplittareDelGiorno > 0 && voceOrdinaria) {
            voceOrdinaria.giorniSet?.add(dayKey);
        }

        const dailyOrdinarie = Math.min(oreDaSplittareDelGiorno, 8);
        const dailyStraordinarie = Math.max(0, oreDaSplittareDelGiorno - 8);

        if (voceOrdinaria) voceOrdinaria.oreTotali += dailyOrdinarie;
        if (voceStraordinaria) {
            voceStraordinaria.oreTotali += dailyStraordinarie;
            if(dailyStraordinarie > 0) voceStraordinaria.giorniSet?.add(dayKey);
        }
    }

    riepilogo.oreTotali = enrichedRapportini.reduce((sum, r) => sum + r.oreGiorno, 0);

    const giorniTrasfertaUnici = new Set<string>();
    enrichedRapportini.forEach(r => {
        if (r.trasfertaId) {
            const date = toDateSafe(r.data);
            if (date) giorniTrasfertaUnici.add(format(date, 'yyyy-MM-dd'));
        }
    });
    riepilogo.giorniTrasferta = giorniTrasfertaUnici.size;

    let costoTotaleFinale = 0;
    for (const voce of riepilogo.dettaglio.values()) {
        voce.giorni = voce.giorniSet?.size || 0;
        delete voce.giorniSet;

        const tariffa = tariffeMap.get(voce.id);
        if (tariffa && tariffa.costo > 0) {
            voce.costo = (tariffa.unita === 'g') ? (voce.giorni * tariffa.costo) : (voce.oreTotali * tariffa.costo);
        } else {
            voce.costo = 0;
        }
        costoTotaleFinale += voce.costo;
    }

    riepilogo.costoTotale = costoTotaleFinale;
    riepilogo.giorniTotaliLavorati = Object.keys(groupedByDay).length;
    if(voceOrdinaria) riepilogo.oreOrdinarie = voceOrdinaria.oreTotali;
    if(voceStraordinaria) riepilogo.oreStraordinarie = voceStraordinaria.oreTotali;

    return riepilogo;
};
