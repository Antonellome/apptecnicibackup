import { Rapportino, MasterData, UserProfile, EnrichedRapportino, RiepilogoMese, Impostazioni, VoceRiepilogo } from '@/models/definitions';
import { format } from 'date-fns';
import { toDateSafe as toDate } from '@/lib/date-utils'; // Corretto: Importa la funzione sicura

// --- Funzioni Pure di Arricchimento e Calcolo ---

export const enrichRapportini = (
    rapportini: Rapportino[], 
    masterData: MasterData, 
    userProfile: UserProfile
): EnrichedRapportino[] => {
    const tipiGiornataMap = new Map(masterData.tipiGiornata.map(t => [t.id, t]));

    return rapportini.map(r => {
        const dataSicura = toDate(r.data);
        if (!dataSicura) return null; // Scarta i rapportini con data non valida

        let oreEffettive = 0;

        const dettaglioTecnico = r.dettaglioOreTecnici?.find(d => d.tecnicoId === userProfile.tecnicoId);
        if (dettaglioTecnico) {
            oreEffettive = dettaglioTecnico.ore || 0;
        } 

        // Gestione di un caso legacy in cui alcuni tipi di giornata erano in realtà trasferte
        const tipoGiornata = tipiGiornataMap.get(r.tipoGiornataId);
        const isVecchioReportTrasferta = tipoGiornata?.categoria === 'trasferta';
        const tipoGiornataIdCorretto = isVecchioReportTrasferta ? 't_ordinaria' : r.tipoGiornataId;
        const trasfertaIdCorretto = isVecchioReportTrasferta ? r.tipoGiornataId : r.trasfertaId;

        const enriched = {
            ...r,
            data: dataSicura,
            tipoGiornata: tipiGiornataMap.get(tipoGiornataIdCorretto),
            oreGiorno: oreEffettive,
            trasfertaId: trasfertaIdCorretto,
            trasferta: tipiGiornataMap.get(trasfertaIdCorretto),
            tipoGiornataId: tipoGiornataIdCorretto,
            isEditable: r.tecnicoScriventeId === userProfile.tecnicoId, // Logica di editabilità
            isOwner: r.tecnicoId === userProfile.tecnicoId,
            hasFirma: !!r.firmaVettoriale,
        } as EnrichedRapportino;

        return enriched;

    }).filter((r): r is EnrichedRapportino => 
        r !== null && 
        !r.isDeleted && 
        (r.oreGiorno > 0 || !!r.trasfertaId) // Filtra solo quelli con ore o trasferta
    );
};


export const calculateMonthlyReportData = (
    rapportini: Rapportino[],
    masterData: MasterData,
    userProfile: UserProfile,
    tariffe: any[]
) => {
    const enrichedRapportini = enrichRapportini(rapportini, masterData, userProfile);

    const tariffeMap = new Map(tariffe.map(t => [t.tipoGiornataId, t]));

    const riepilogo: RiepilogoMese = {
        dettaglio: new Map<string, VoceRiepilogo>(),
        oreTotali: 0, oreOrdinarie: 0, oreStraordinarie: 0,
        giorniTotaliLavorati: 0, giorniTrasferta: 0, costoTotale: 0,
    };

    // Inizializza il dettaglio del riepilogo con tutte le possibili voci
    masterData.tipiGiornata.forEach(tipo => {
        const tariffa = tariffeMap.get(tipo.id);
        riepilogo.dettaglio.set(tipo.id, {
            tipoId: tipo.id,
            nome: tipo.nome,
            valore: 0,
            unita: tariffa?.unita || 'h',
            giorni: new Set<string>(),
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

    for (const dayKey in groupedByDay) {
        const reportsInDay = groupedByDay[dayKey];
        let oreLavorateDaSplittare = 0;
        let trasfertaGiaProcessata = false;

        reportsInDay.forEach(report => {
            // Somma le ore da "splittare" o accredita le ore a voci specifiche
            if (report.tipoGiornataId === 't_ordinaria') {
                oreLavorateDaSplittare += report.oreGiorno;
            } else {
                const voce = riepilogo.dettaglio.get(report.tipoGiornataId);
                if (voce) {
                    voce.valore += report.oreGiorno;
                    voce.giorni.add(dayKey);
                }
            }

            // Processa la trasferta una sola volta al giorno
            if (report.trasfertaId && !trasfertaGiaProcessata) {
                const voceTrasferta = riepilogo.dettaglio.get(report.trasfertaId);
                if (voceTrasferta) {
                    voceTrasferta.giorni.add(dayKey);
                    trasfertaGiaProcessata = true;
                }
            }
        });

        // Gestione split ore ordinarie/straordinarie
        if (oreLavorateDaSplittare > 0 && voceOrdinaria) {
            voceOrdinaria.giorni.add(dayKey);
            const ordinarieDelGiorno = Math.min(oreLavorateDaSplittare, 8);
            const straordinarieDelGiorno = Math.max(0, oreLavorateDaSplittare - 8);

            voceOrdinaria.valore += ordinarieDelGiorno;
            if (straordinarieDelGiorno > 0 && voceStraordinaria) {
                voceStraordinaria.valore += straordinarieDelGiorno;
                voceStraordinaria.giorni.add(dayKey);
            }
        }
    }

    // Calcoli finali
    riepilogo.oreTotali = enrichedRapportini.reduce((sum, r) => sum + r.oreGiorno, 0);
    
    let costoTotaleFinale = 0;
    const giorniLavoratiUnici = new Set<string>();

    for (const voce of riepilogo.dettaglio.values()) {
        const tariffa = tariffeMap.get(voce.tipoId);
        let costoVoce = 0;
        if (tariffa && tariffa.costo > 0) {
            costoVoce = (voce.unita === 'g') 
                ? (voce.giorni.size * tariffa.costo) 
                : (voce.valore * tariffa.costo);
        }
        costoTotaleFinale += costoVoce;

        // Aggiunge i giorni di questa voce al set totale dei giorni lavorati
        voce.giorni.forEach(giorno => giorniLavoratiUnici.add(giorno));
    }

    riepilogo.costoTotale = costoTotaleFinale;
    riepilogo.giorniTotaliLavorati = giorniLavoratiUnici.size;

    // Aggiornamento totali specifici
    if (voceOrdinaria) riepilogo.oreOrdinarie = voceOrdinaria.valore;
    if (voceStraordinaria) riepilogo.oreStraordinarie = voceStraordinaria.valore;
    
    const giorniTrasfertaUnici = new Set<string>();
    const tipiGiornataTrasferta = masterData.tipiGiornata.filter(t => t.categoria === 'trasferta');

    for (const tipo of tipiGiornataTrasferta) {
        const voce = riepilogo.dettaglio.get(tipo.id);
        if (voce) {
            voce.giorni.forEach(giorno => giorniTrasfertaUnici.add(giorno));
        }
    }
    riepilogo.giorniTrasferta = giorniTrasfertaUnici.size;


    return { rapportiniArricchiti: enrichedRapportini, riepilogoMese: riepilogo };
};