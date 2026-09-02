import { Rapportino, MasterData, UserProfile, EnrichedRapportino, RiepilogoMese, Impostazioni } from '@/models/definitions';
import { format } from 'date-fns';

// --- Funzioni Pure di Arricchimento e Calcolo ---

export const enrichRapportini = (
    rapportini: Rapportino[], 
    masterData: MasterData, 
    userProfile: UserProfile
): EnrichedRapportino[] => {
    const tipiGiornataMap = new Map(masterData.tipiGiornata.map(t => [t.id, t]));

    return rapportini.map(r => {
        const tipoGiornata = tipiGiornataMap.get(r.tipoGiornataId);
        let oreEffettive = 0;

        const dettaglioTecnico = r.dettaglioOreTecnici?.find(d => d.tecnicoId === userProfile.tecnicoId);
        if (dettaglioTecnico) {
            oreEffettive = dettaglioTecnico.ore || 0;
        } else if (r.tecnicoId === userProfile.tecnicoId) {
            // Fallback per vecchi rapportini senza dettaglio multiplo
            oreEffettive = r.oreLavoro || 0;
        }

        // Gestione retrocompatibilità per vecchie "trasferte" come tipo giornata
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
            isEditable: r.tecnicoId === userProfile.tecnicoId,
        };
    }).filter(r => r.oreGiorno > 0 || r.trasfertaId); // Filtra i rapportini dove l'utente non ha lavorato e non c'è trasferta
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

    // Inizializza il riepilogo con tutte le voci possibili
    masterData.tipiGiornata.forEach(tipo => {
        const tariffa = tariffeMap.get(tipo.id);
        riepilogo.dettaglio.set(tipo.id, { 
            id: tipo.id, nome: tipo.nome, colore: tipo.colore, unita: tariffa?.unita || 'h',
            oreTotali: 0, giorni: 0, costo: 0, giorniSet: new Set()
        });
    });

    // Raggruppa i rapportini per giorno
    const groupedByDay = enrichedRapportini.reduce((acc, r) => {
        const dayKey = format(r.data, 'yyyy-MM-dd');
        if (!acc[dayKey]) acc[dayKey] = [];
        acc[dayKey].push(r);
        return acc;
    }, {} as Record<string, EnrichedRapportino[]>);

    const voceOrdinaria = riepilogo.dettaglio.get('t_ordinaria');
    const voceStraordinaria = riepilogo.dettaglio.get('t_straordinaria');

    // Calcola ore ordinarie, straordinarie e altre voci per ogni giorno
    for (const dayKey in groupedByDay) {
        const reports = groupedByDay[dayKey];
        let oreDaSplittareDelGiorno = 0;
        let trasfertaProcessedForDay = false;
        
        reports.forEach(report => {
            // Le ore di tipo 'ordinaria' vengono accumulate per essere splittate dopo
            if (report.tipoGiornataId === 't_ordinaria') {
                oreDaSplittareDelGiorno += report.oreGiorno;
            } else {
                // Le altre voci (permessi, malattia) vengono sommate direttamente
                const voceRiepilogo = riepilogo.dettaglio.get(report.tipoGiornataId);
                if (voceRiepilogo) {
                    voceRiepilogo.oreTotali += report.oreGiorno;
                    voceRiepilogo.giorniSet?.add(dayKey);
                }
            }

            // Gestisce il conteggio dei giorni di trasferta (una sola volta al giorno)
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

        // Splitta le ore lavorate in ordinarie (fino a 8) e straordinarie
        const dailyOrdinarie = Math.min(oreDaSplittareDelGiorno, 8);
        const dailyStraordinarie = Math.max(0, oreDaSplittareDelGiorno - 8);

        if (voceOrdinaria) voceOrdinaria.oreTotali += dailyOrdinarie;
        if (voceStraordinaria) {
            voceStraordinaria.oreTotali += dailyStraordinarie;
            if(dailyStraordinarie > 0) voceStraordinaria.giorniSet?.add(dayKey);
        }
    }

    // Finalizza i calcoli
    riepilogo.oreTotali = enrichedRapportini.reduce((sum, r) => sum + r.oreGiorno, 0);

    const giorniTrasfertaUnici = new Set(enrichedRapportini.filter(r => r.trasfertaId).map(r => format(r.data, 'yyyy-MM-dd')));
    riepilogo.giorniTrasferta = giorniTrasfertaUnici.size;

    let costoTotaleFinale = 0;
    for (const voce of riepilogo.dettaglio.values()) {
        voce.giorni = voce.giorniSet?.size || 0;
        delete voce.giorniSet; // Pulisci il set temporaneo

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
