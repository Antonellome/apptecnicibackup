import { format, getDay, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, getYear, addDays } from 'date-fns';
import { Rapportino, Dipendente, TipoGiornata, Festivita, SaldiContatori, RisultatoCalcoloGiornaliero, DettaglioOreTecnico } from '@/models/definitions';
import { toDateSafe, parseTimeString, timeToMinutes } from '@/utils/dateUtils';
import { MasterData } from '@/hooks/useMasterData';

const ORARIO_TEORICO_GIORNALIERO = 8;

const analizzaIntervallo = (dettaglio: DettaglioOreTecnico, data: Date, allFestivita: Festivita[]): { oreDiurne: number; oreNotturnoSerale: number; oreNotturnoPieno: number; } => {
    if (dettaglio.isManual || !dettaglio.oraInizio || !dettaglio.oraFine) {
        return { oreDiurne: dettaglio.ore || 0, oreNotturnoSerale: 0, oreNotturnoPieno: 0 };
    }
    const start = parseTimeString(dettaglio.oraInizio, data);
    let end = parseTimeString(dettaglio.oraFine, data);
    if (!start || !end) return { oreDiurne: 0, oreNotturnoSerale: 0, oreNotturnoPieno: 0 };
    if (end <= start) end = addDays(end, 1);

    let minutiDiurni = 0, minutiNotturnoSerale = 0, minutiNotturnoPieno = 0;
    const startTotalMinutes = timeToMinutes(format(start, 'HH:mm'));
    const endTotalMinutes = (Math.floor(end.getTime() - start.getTime()) / (1000 * 60)) + startTotalMinutes;

    for (let min = startTotalMinutes; min < endTotalMinutes; min++) {
        const currentMinuteDayOffset = Math.floor(min / 1440);
        const currentDay = addDays(data, currentMinuteDayOffset);
        const currentHour = Math.floor((min % 1440) / 60);
        const isFestivoOrDomenica = getDay(currentDay) === 0 || allFestivita.some(f => isSameDay(toDateSafe(f.data), currentDay));

        if (isFestivoOrDomenica) {
            if (currentHour >= 22 || currentHour < 6) minutiNotturnoPieno++;
            else minutiDiurni++;
        } else {
            if (currentHour >= 22 || currentHour < 6) minutiNotturnoPieno++;
            else if (currentHour >= 20) minutiNotturnoSerale++;
            else minutiDiurni++;
        }
    }
    return { oreDiurne: minutiDiurni / 60, oreNotturnoSerale: minutiNotturnoSerale / 60, oreNotturnoPieno: minutiNotturnoPieno / 60 };
}

// ===============================================================
// VERSIONE DEFINITIVA DI calcolaGiorno
// ===============================================================
const calcolaGiorno = (
    oreLavorate: { oreDiurne: number, oreNotturnoSerale: number, oreNotturnoPieno: number },
    assenze: { ferie: number, rol: number, l104: number, malattia: number },
    pausaOre: number,
    data: Date,
    isFestivo: boolean,
    saldi: SaldiContatori
): { risultato: RisultatoCalcoloGiornaliero, saldiAggiornati: SaldiContatori } => {
    const giornoISO = format(data, 'yyyy-MM-dd');
    const dayIndex = getDay(data);
    const isSabato = dayIndex === 6;
    const isDomenicaOFestivo = isFestivo || dayIndex === 0;

    let risultato: RisultatoCalcoloGiornaliero = { 
        data: giornoISO, pagaBaseOre: 0, strDiu12Intero: 0, strDiuSuccessIntero: 0, 
        straordinarioSabatoDiurno50: 0, straordinarioNotturno50: 0, straordinarioFestivo55: 0, 
        straordinarioNotturnoFestivo75: 0, oreNotturnoSeraleOrd: 0, oreNotturnoPienoOrd: 0, 
        ferie: 0, rol: 0, legge104: 0, 
        ferieScalate: 0, rolScalati: 0, exFestivitaScalate: 0, permessiScalati: 0, 
        legge104Scalate: 0, oreMalattiaCarenzaAzienda: 0, oreMalattiaIntegrazione: 0, 
        anomaliaDebitoUncovered: 0, trasfertaOre: 0, bancaOreSolaMaggiorazione25: 0, bancaOreSolaMaggiorazione30: 0,
    };
    let saldiAggiornati = { ...saldi };

    if (assenze.malattia > 0) {
        risultato.oreMalattiaCarenzaAzienda = ORARIO_TEORICO_GIORNALIERO;
        saldiAggiornati.malattiaGiorniAnno += 1;
        return { risultato, saldiAggiornati };
    }
    if (assenze.ferie > 0) {
        risultato.ferie = ORARIO_TEORICO_GIORNALIERO;
        risultato.ferieScalate = ORARIO_TEORICO_GIORNALIERO;
        saldiAggiornati.ferie -= ORARIO_TEORICO_GIORNALIERO;
        return { risultato, saldiAggiornati };
    }
    if (assenze.l104 >= ORARIO_TEORICO_GIORNALIERO) {
        risultato.legge104 = ORARIO_TEORICO_GIORNALIERO;
        risultato.legge104Scalate = ORARIO_TEORICO_GIORNALIERO;
        return { risultato, saldiAggiornati };
    }

    let oreDiurneNette = Math.max(0, oreLavorate.oreDiurne - pausaOre);
    let pausaResidua = Math.max(0, pausaOre - oreLavorate.oreDiurne);
    let oreNotturnoSeraliNette = Math.max(0, oreLavorate.oreNotturnoSerale - pausaResidua);
    pausaResidua = Math.max(0, pausaResidua - oreLavorate.oreNotturnoSerale);
    let oreNotturnoPieneNette = Math.max(0, oreLavorate.oreNotturnoPieno - pausaResidua);
    let totaleLavoratoNetto = oreDiurneNette + oreNotturnoSeraliNette + oreNotturnoPieneNette;
    
    risultato.legge104 = assenze.l104;
    risultato.rol = assenze.rol;
    risultato.legge104Scalate = assenze.l104;
    risultato.rolScalati = assenze.rol;

    if (isDomenicaOFestivo) {
        risultato.straordinarioFestivo55 = oreDiurneNette + oreNotturnoSeraliNette;
        risultato.straordinarioNotturnoFestivo75 = oreNotturnoPieneNette;
    } else if (isSabato) {
        if (totaleLavoratoNetto > 2) {
            risultato.straordinarioSabatoDiurno50 = oreDiurneNette + oreNotturnoSeraliNette;
            risultato.straordinarioNotturno50 = oreNotturnoPieneNette;
        } else {
            risultato.strDiu12Intero = totaleLavoratoNetto;
        }
    } else { // Feriale
        const oreGiustificateDaAssenzeParziali = assenze.rol + assenze.l104;
        const oreOrdinarieLavorate = Math.min(totaleLavoratoNetto, ORARIO_TEORICO_GIORNALIERO - oreGiustificateDaAssenzeParziali);
        
        let straordinarioPotenziale = Math.max(0, totaleLavoratoNetto - oreOrdinarieLavorate);
        let debitoOrdinario = Math.max(0, ORARIO_TEORICO_GIORNALIERO - oreOrdinarieLavorate - oreGiustificateDaAssenzeParziali);

        if (debitoOrdinario > 0.01 && straordinarioPotenziale > 0.01) {
            const oreDaCompensare = Math.min(debitoOrdinario, straordinarioPotenziale);
            risultato.pagaBaseOre += oreDaCompensare;
            const capienzaPrime2Ore = 2.0;
            const oreInBancaOre25 = Math.min(oreDaCompensare, capienzaPrime2Ore);
            const oreInBancaOre30 = Math.max(0, oreDaCompensare - oreInBancaOre25);
            risultato.bancaOreSolaMaggiorazione25 = (risultato.bancaOreSolaMaggiorazione25 || 0) + oreInBancaOre25;
            risultato.bancaOreSolaMaggiorazione30 = (risultato.bancaOreSolaMaggiorazione30 || 0) + oreInBancaOre30;
            straordinarioPotenziale -= oreDaCompensare;
            debitoOrdinario -= oreDaCompensare;
        }

        let diurneOrdinarie = Math.min(oreOrdinarieLavorate, oreDiurneNette);
        let notturneSeraliOrdinarie = Math.min(oreOrdinarieLavorate - diurneOrdinarie, oreNotturnoSeraliNette);
        let notturnePieneOrdinarie = Math.min(oreOrdinarieLavorate - diurneOrdinarie - notturneSeraliOrdinarie, oreNotturnoPieneNette);

        // CORREZIONE: pagaBaseOre contiene SOLO le ore lavorate ordinarie.
        risultato.pagaBaseOre += diurneOrdinarie;
        risultato.oreNotturnoSeraleOrd = notturneSeraliOrdinarie;
        risultato.oreNotturnoPienoOrd = notturnePieneOrdinarie;

        const straordinarioResiduoDiurno = Math.max(0, oreDiurneNette - diurneOrdinarie);
        const straordinarioResiduoNotturnoSerali = Math.max(0, oreNotturnoSeraliNette - notturneSeraliOrdinarie);
        const straordinarioResiduoNotturnoPieno = Math.max(0, oreNotturnoPieneNette - notturnePieneOrdinarie);
        const totaleStraordinarioFeriale = straordinarioResiduoDiurno + straordinarioResiduoNotturnoSerali;

        risultato.strDiu12Intero = Math.min(totaleStraordinarioFeriale, 2);
        risultato.strDiuSuccessIntero = Math.max(0, totaleStraordinarioFeriale - 2);
        risultato.straordinarioNotturno50 = straordinarioResiduoNotturnoPieno;

        if (debitoOrdinario > 0.01 && saldi.rol > 0) {
            const rolDaUsare = Math.min(debitoOrdinario, saldi.rol - risultato.rolScalati);
            risultato.rol += rolDaUsare;
            risultato.rolScalati += rolDaUsare;
            debitoOrdinario -= rolDaUsare;
        }

        if (debitoOrdinario > 0.01) {
            risultato.anomaliaDebitoUncovered = debitoOrdinario;
        }
    }

    // CORREZIONE: Aggiorna i saldi usando i nomi corretti delle proprietà
    saldiAggiornati.rol -= risultato.rolScalati;
    // Non si aggiorna il saldo L.104 perché sembra essere un'allocazione mensile/annuale non tracciata qui

    return { risultato, saldiAggiornati };
}


// ===============================================================
// FUNZIONE processaMese OTTIMIZZATA
// ===============================================================
export const processaMese = (
    dipendente: Dipendente,
    rapportini: Rapportino[],
    tipiGiornata: TipoGiornata[],
    saldiIniziali: SaldiContatori,
    currentMonth: Date,
    masterData: MasterData
): { risultati: RisultatoCalcoloGiornaliero[], saldiFinali: SaldiContatori } => {
    const allFestivita = masterData?.festivita || [];
    const giorniDelMese = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
    
    let risultatiFinali: RisultatoCalcoloGiornaliero[] = [];
    let saldiCorrenti = JSON.parse(JSON.stringify(saldiIniziali));

    for (const giorno of giorniDelMese) {
        const festivitaDelGiorno = allFestivita.find(f => isSameDay(toDateSafe(f.data), giorno));
        const rapportiniDelGiorno = rapportini.filter(r => isSameDay(toDateSafe(r.data), giorno) && r.dettaglioOreTecnici?.some(d => d.tecnicoId === dipendente.id));

        let oreLavorate = { oreDiurne: 0, oreNotturnoSerale: 0, oreNotturnoPieno: 0 };
        let assenze = { ferie: 0, rol: 0, l104: 0, malattia: 0 };
        let pausaOre = 0;

        const tipiGiornataDelGiorno = rapportiniDelGiorno.map(r => tipiGiornata.find(t => t.id === r.tipoGiornataId)?.nome.toLowerCase() || 'ordinaria');

        if (tipiGiornataDelGiorno.includes('malattia')) {
            assenze.malattia = ORARIO_TEORICO_GIORNALIERO;
        } else if (tipiGiornataDelGiorno.includes('ferie')) {
            assenze.ferie = ORARIO_TEORICO_GIORNALIERO;
        } else {
            // Nessuna assenza totale: aggrego ore lavorate e permessi parziali
            for (const r of rapportiniDelGiorno) {
                const tipo = tipiGiornata.find(t => t.id === r.tipoGiornataId)?.nome.toLowerCase() || '';
                const dettaglioTecnico = r.dettaglioOreTecnici?.find(d => d.tecnicoId === dipendente.id);
                if (!dettaglioTecnico) continue;
                const oreRapportino = dettaglioTecnico.ore || 0;

                switch (tipo) {
                    case 'rol': assenze.rol += oreRapportino; break;
                    case '104': case 'permesso': assenze.l104 += oreRapportino; break;
                    default: // È lavoro
                        if (dettaglioTecnico.isManual || !dettaglioTecnico.oraInizio || !dettaglioTecnico.oraFine) {
                            oreLavorate.oreDiurne += oreRapportino;
                        } else {
                            const { oreDiurne, oreNotturnoSerale, oreNotturnoPieno } = analizzaIntervallo(dettaglioTecnico, giorno, allFestivita);
                            oreLavorate.oreDiurne += oreDiurne; oreLavorate.oreNotturnoSerale += oreNotturnoSerale; oreLavorate.oreNotturnoPieno += oreNotturnoPieno;
                            pausaOre += (dettaglioTecnico.pausa || 0) / 60;
                        }
                        break;
                }
            }
        }

        const dayIndex = getDay(giorno);
        const isFeriale = dayIndex > 0 && dayIndex < 6 && !festivitaDelGiorno;
        const hasActivity = rapportiniDelGiorno.length > 0;

        if (isFeriale || hasActivity) {
             const { risultato, saldiAggiornati } = calcolaGiorno(oreLavorate, assenze, pausaOre, giorno, !!festivitaDelGiorno, saldiCorrenti);
             risultatiFinali.push(risultato);
             saldiCorrenti = saldiAggiornati;
        }
    }

    const finalResultsFiltered = risultatiFinali.filter(r => {
        const hasData = Object.values(r).some((val, index) => {
            if (index > 0 && typeof val === 'number') { return val > 0.009; }
            return false;
        });
        return hasData;
    });

    return { risultati: finalResultsFiltered, saldiFinali: saldiCorrenti };
};