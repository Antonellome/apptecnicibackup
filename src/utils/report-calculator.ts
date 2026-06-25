import { EnrichedRapportino, RiepilogoMese, MasterData, UserProfile, Rapportino, Impostazioni } from '@/models/definitions';
import { format } from 'date-fns';

export function calculateMonthlyReportData(
    rapportini: Rapportino[] = [], 
    masterData: MasterData, 
    userProfile: UserProfile
) {
    const tipiGiornataMap = new Map(masterData.tipiGiornata.map(t => [t.id, t]));
    const tariffeMap = new Map((masterData.impostazioni as Impostazioni).tariffe.map(t => [t.tipoGiornataId, t]));

    const enrichedRapportini: EnrichedRapportino[] = rapportini.map(r => {
        const tipoGiornata = tipiGiornataMap.get(r.tipoGiornataId);
        let oreEffettive = 0;

        // Calcola le ore effettive per il tecnico corrente
        const dettaglioTecnico = r.dettaglioOreTecnici?.find(d => d.tecnicoId === userProfile.tecnicoId);
        if (dettaglioTecnico) {
            oreEffettive = dettaglioTecnico.ore || 0;
        } else if (r.tecnicoId === userProfile.tecnicoId) {
            oreEffettive = r.oreLavoro || 0; // Fallback per vecchi report
        }

        // Gestione retrocompatibilità per vecchi report di trasferta
        const isVecchioReportTrasferta = tipoGiornata?.categoria === 'trasferta';
        const tipoGiornataDaUsareId = isVecchioReportTrasferta ? 't_ordinaria' : r.tipoGiornataId;
        const trasfertaId = isVecchioReportTrasferta ? r.tipoGiornataId : r.trasfertaId;

        return { 
            ...r, 
            data: new Date(r.data), 
            tipoGiornata: tipiGiornataMap.get(tipoGiornataDaUsareId),
            oreGiorno: oreEffettive,
            trasfertaId,
            tipoGiornataId: tipoGiornataDaUsareId,
            isEditable: r.tecnicoId === userProfile.tecnicoId, // Logica di modifica corretta
        };
    }).filter(r => r.oreGiorno > 0 || r.trasfertaId); // Includi anche giorni di sola trasferta

    const riepilogo: RiepilogoMese = {
        dettaglio: new Map(),
        oreTotali: 0,
        giorniTotaliLavorati: 0,
        costoTotale: 0,
        oreOrdinarie: 0,
        oreStraordinarie: 0,
    };

    // Inizializza il riepilogo con tutte le voci possibili
    masterData.tipiGiornata.forEach(tipo => {
        const tariffa = tariffeMap.get(tipo.id);
        riepilogo.dettaglio.set(tipo.id, { 
            id: tipo.id, 
            nome: tipo.nome, 
            colore: tipo.colore, 
            unita: tariffa?.unita || 'h', // Prendi l'unità dalla tariffa
            oreTotali: 0, 
            giorni: 0, 
            costo: 0, 
            giorniSet: new Set() 
        });
    });

    const groupedByDay = enrichedRapportini.reduce((acc, r) => {
        const dayKey = format(r.data, 'yyyy-MM-dd');
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
            // Somma le ore per tipo di giornata
            if (report.tipoGiornataId === 't_ordinaria') {
                oreDaSplittareDelGiorno += report.oreGiorno;
                if(voceOrdinaria) voceOrdinaria.giorniSet?.add(dayKey);
            } else {
                const voceRiepilogo = riepilogo.dettaglio.get(report.tipoGiornataId);
                if (voceRiepilogo) {
                    voceRiepilogo.oreTotali += report.oreGiorno;
                    voceRiepilogo.giorniSet?.add(dayKey);
                }
            }

            // Gestisce la presenza della trasferta (una sola volta al giorno)
            if (report.trasfertaId && !trasfertaProcessedForDay) {
                const voceTrasferta = riepilogo.dettaglio.get(report.trasfertaId);
                if (voceTrasferta) {
                    voceTrasferta.giorniSet?.add(dayKey);
                    trasfertaProcessedForDay = true;
                }
            }
        });

        // Splitting delle ore ordinarie/straordinarie
        const dailyOrdinarie = Math.min(oreDaSplittareDelGiorno, 8);
        const dailyStraordinarie = Math.max(0, oreDaSplittareDelGiorno - 8);

        if (voceOrdinaria) {
            voceOrdinaria.oreTotali += dailyOrdinarie;
        }
        if (voceStraordinaria) {
            voceStraordinaria.oreTotali += dailyStraordinarie;
            if(dailyStraordinarie > 0) voceStraordinaria.giorniSet?.add(dayKey);
        }
    }

    let costoTotaleFinale = 0;
    let oreTotaliComplessive = 0;

    // Calcolo finale dei costi e dei totali
    for (const voce of riepilogo.dettaglio.values()) {
        voce.giorni = voce.giorniSet?.size || 0;
        delete voce.giorniSet; // Rimuovi la proprietà temporanea

        const tariffa = tariffeMap.get(voce.id);
        if (tariffa && tariffa.costo > 0) {
            if (tariffa.unita === 'g') {
                voce.costo = voce.giorni * tariffa.costo;
            } else { // 'h'
                voce.costo = voce.oreTotali * tariffa.costo;
            }
            costoTotaleFinale += voce.costo;
        }
        
        // Somma le ore totali escludendo le trasferte (che sono solo di presenza/costo)
        const tipo = tipiGiornataMap.get(voce.id);
        if(tipo?.categoria !== 'trasferta') {
            oreTotaliComplessive += voce.oreTotali;
        }
    }

    riepilogo.costoTotale = costoTotaleFinale;
    riepilogo.oreTotali = oreTotaliComplessive;
    riepilogo.giorniTotaliLavorati = Object.keys(groupedByDay).length;
    if(voceOrdinaria) riepilogo.oreOrdinarie = voceOrdinaria.oreTotali;
    if(voceStraordinaria) riepilogo.oreStraordinarie = voceStraordinaria.oreTotali;

    return { rapportiniArricchiti: enrichedRapportini, riepilogoMese: riepilogo };
}
