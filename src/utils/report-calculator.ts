import { EnrichedRapportino, RiepilogoMese, MasterData, UserProfile, Rapportino } from '@/models/definitions';
import { format } from 'date-fns';

export function calculateMonthlyReportData(
    rapportini: Rapportino[] = [], 
    masterData: MasterData, 
    userProfile: UserProfile
) {
    const tipiGiornataMap = new Map(masterData.tipiGiornata.map(t => [t.id, t]));

    const enrichedRapportini: EnrichedRapportino[] = rapportini.map(r => {
        const tipoGiornata = tipiGiornataMap.get(r.tipoGiornataId);
        let oreEffettive = 0;
        if (r.tecnicoId === userProfile.tecnicoId) {
            oreEffettive = r.oreLavoro || 0;
        } else if (r.presenze && r.orePresenze) {
            const userIndex = r.presenze.indexOf(userProfile.tecnicoId);
            if (userIndex !== -1 && r.orePresenze[userIndex] != null) {
                oreEffettive = r.orePresenze[userIndex];
            }
        }
        
        const isVecchioReportTrasferta = tipoGiornata?.natura === 'trasferta';
        const tipoGiornataDaUsareId = isVecchioReportTrasferta ? 't_ordinaria' : r.tipoGiornataId;
        const trasfertaId = isVecchioReportTrasferta ? r.tipoGiornataId : r.trasfertaId;

        return { 
            ...r, 
            data: new Date(r.data), 
            tipoGiornata: tipiGiornataMap.get(tipoGiornataDaUsareId), // Usa il tipo di giornata corretto
            oreGiorno: oreEffettive,
            trasfertaId, // Passa il trasfertaId corretto
            tipoGiornataId: tipoGiornataDaUsareId, // Passa il tipoGiornataId corretto
        };
    }).filter(r => r.oreGiorno > 0);

    const riepilogo: RiepilogoMese = {
        dettaglio: new Map(),
        oreTotali: 0,
        giorniTotaliLavorati: 0,
        costoTotale: 0,
        oreOrdinarie: 0, // Deprecato, ma lo teniamo per ora
        oreStraordinarie: 0, // Deprecato
    };

    masterData.tipiGiornata.forEach(tipo => {
        riepilogo.dettaglio.set(tipo.id, { id: tipo.id, nome: tipo.nome, colore: tipo.colore, unita: tipo.unita, oreTotali: 0, giorni: 0, costo: 0, giorniSet: new Set() });
    });

    const groupedByDay = enrichedRapportini.reduce((acc, r) => {
        const dayKey = format(r.data, 'yyyy-MM-dd');
        if (!acc[dayKey]) acc[dayKey] = [];
        acc[dayKey].push(r);
        return acc;
    }, {} as Record<string, EnrichedRapportino[]>);

    let costoTotaleTrasferte = 0;
    const voceOrdinaria = riepilogo.dettaglio.get('t_ordinaria');
    const voceStraordinaria = riepilogo.dettaglio.get('t_straordinaria');

    for (const dayKey in groupedByDay) {
        const reports = groupedByDay[dayKey];
        let oreDaSplittareDelGiorno = 0;
        let trasfertaProcessedForDay = false;
        
        reports.forEach(report => {
            if (report.tipoGiornataId !== 't_ordinaria') {
                const voceRiepilogo = riepilogo.dettaglio.get(report.tipoGiornataId);
                if (voceRiepilogo) {
                    voceRiepilogo.oreTotali += report.oreGiorno;
                    voceRiepilogo.giorniSet.add(dayKey);
                }
            } else {
                oreDaSplittareDelGiorno += report.oreGiorno;
                if(voceOrdinaria) voceOrdinaria.giorniSet.add(dayKey);
            }

            if (report.trasfertaId && !trasfertaProcessedForDay) {
                const tipoTrasferta = tipiGiornataMap.get(report.trasfertaId);
                if (tipoTrasferta?.costo) {
                    costoTotaleTrasferte += tipoTrasferta.costo;
                    trasfertaProcessedForDay = true;
                }
            }
        });

        const dailyOrdinarie = Math.min(oreDaSplittareDelGiorno, 8);
        const dailyStraordinarie = Math.max(0, oreDaSplittareDelGiorno - 8);

        if (voceOrdinaria) {
            voceOrdinaria.oreTotali += dailyOrdinarie;
        }
        if (voceStraordinaria) {
            voceStraordinaria.oreTotali += dailyStraordinarie;
            if(dailyStraordinarie > 0) voceStraordinaria.giorniSet.add(dayKey);
        }
    }

    let costoTotaleOre = 0;
    for (const voce of riepilogo.dettaglio.values()) {
        voce.giorni = voce.giorniSet.size;
        const tipo = tipiGiornataMap.get(voce.id);
        if (tipo?.costo) {
            if (tipo.unita === 'g') {
                voce.costo = voce.giorni * tipo.costo;
            } else { // 'h'
                voce.costo = voce.oreTotali * tipo.costo;
            }
            costoTotaleOre += voce.costo;
        }
    }

    riepilogo.costoTotale = costoTotaleOre + costoTotaleTrasferte;
    riepilogo.oreTotali = enrichedRapportini.reduce((sum, r) => sum + r.oreGiorno, 0);
    riepilogo.giorniTotaliLavorati = Object.keys(groupedByDay).length;

    return { rapportiniArricchiti: enrichedRapportini, riepilogoMese: riepilogo };
}
