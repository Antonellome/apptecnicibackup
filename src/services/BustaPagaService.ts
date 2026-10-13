import { format, getDay, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, addDays } from 'date-fns';
import { Rapportino, Dipendente, TipoGiornata, Festivita, SaldiContatori, RisultatoCalcoloGiornaliero, DettaglioOreTecnico, MasterData } from '@/models/definitions';
import { toDateSafe, parseTimeString, timeToMinutes } from '@/utils/dateUtils';

const ORARIO_TEORICO_GIORNALIERO = 8;

const isSameDaySafe = (date1: Date | null, date2: Date | number) => {
    if (!date1) return false;
    return isSameDay(date1, date2);
};

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
        const isFestivoOrDomenica = getDay(currentDay) === 0 || allFestivita.some(f => isSameDaySafe(toDateSafe(f.data), currentDay));

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
    const isSabato = dayIndex === 6 && !isFestivo;
    const isDomenicaOFestivo = isFestivo || dayIndex === 0;

    let risultato: RisultatoCalcoloGiornaliero = {
        data: giornoISO, pagaBaseOre: 0, strDiu12Intero: 0, strDiuSuccessIntero: 0,
        straordinarioSabatoDiurno50: 0, straordinarioNotturno50: 0, straordinarioFestivo55: 0,
        straordinarioNotturnoFestivo75: 0, oreNotturnoSeraleOrd: 0, oreNotturnoPienoOrd: 0,
        ferieScalate: 0, rolScalati: 0, exFestivitaScalate: 0, permessiScalati: 0,
        legge104Scalate: 0, oreMalattiaCarenzaAzienda: 0, oreMalattiaIntegrazione: 0,
        anomaliaDebitoUncovered: 0, trasfertaOre: 0,
        bancaOreSolaMaggiorazione25: 0, 
        bancaOreSolaMaggiorazione30: 0, 
        bancaOreSolaMaggiorazione50: 0
    };
    let saldiAggiornati = { ...saldi };

    // 1. Gestione Assenze totali (prevalgono su tutto)
    if (assenze.malattia >= ORARIO_TEORICO_GIORNALIERO) {
        risultato.oreMalattiaCarenzaAzienda = ORARIO_TEORICO_GIORNALIERO;
        return { risultato, saldiAggiornati };
    }
    if (assenze.ferie >= ORARIO_TEORICO_GIORNALIERO) {
        risultato.ferieScalate = ORARIO_TEORICO_GIORNALIERO;
        saldiAggiornati.ferie -= ORARIO_TEORICO_GIORNALIERO;
        return { risultato, saldiAggiornati };
    }
    if (assenze.l104 >= ORARIO_TEORICO_GIORNALIERO) {
        risultato.legge104Scalate = ORARIO_TEORICO_GIORNALIERO;
        return { risultato, saldiAggiornati };
    }

    // 2. Calcolo ore nette e totali
    let oreDiurneNette = Math.max(0, oreLavorate.oreDiurne - pausaOre);
    let pausaResidua = Math.max(0, pausaOre - oreLavorate.oreDiurne);
    let oreNotturnoSeraliNette = Math.max(0, oreLavorate.oreNotturnoSerale - pausaResidua);
    pausaResidua = Math.max(0, pausaResidua - oreLavorate.oreNotturnoSerale);
    let oreNotturnoPieneNette = Math.max(0, oreLavorate.oreNotturnoPieno - pausaResidua);
    let totaleLavoratoNetto = oreDiurneNette + oreNotturnoSeraliNette + oreNotturnoPieneNette;

    // Assenze parziali
    risultato.legge104Scalate = assenze.l104;
    risultato.rolScalati = assenze.rol;
    let totaleAssenzeParziali = assenze.l104 + assenze.rol;

    // 3. Gestione giorni NON FERIALI (Sabato, Domenica, Festivo)
    if (isDomenicaOFestivo) {
        risultato.straordinarioFestivo55 = oreDiurneNette + oreNotturnoSeraliNette;
        risultato.straordinarioNotturnoFestivo75 = oreNotturnoPieneNette;
        risultato.pagaBaseOre = totaleAssenzeParziali; // Le assenze in giorno festivo sono pagate base
        return { risultato, saldiAggiornati };
    }

    if (isSabato) {
        const totaleSabato = oreDiurneNette + oreNotturnoSeraliNette + oreNotturnoPieneNette;
        if (totaleSabato > 2) {
            risultato.straordinarioSabatoDiurno50 = totaleSabato;
        } else {
            risultato.strDiu12Intero = totaleSabato;
        }
        risultato.pagaBaseOre = totaleAssenzeParziali;
        return { risultato, saldiAggiornati };
    }

    // 4. Gestione giorni FERIALI (Logica complessa di debito/credito)
    const oreTeoriche = ORARIO_TEORICO_GIORNALIERO;
    let debitoOrdinario = Math.max(0, oreTeoriche - totaleLavoratoNetto - totaleAssenzeParziali);
    let straordinarioPotenziale = Math.max(0, totaleLavoratoNetto + totaleAssenzeParziali - oreTeoriche);

    let oreOrdinarieLavorate = totaleLavoratoNetto - straordinarioPotenziale;

    // 4.1 COMPENSAZIONE BANCA ORE (Straordinario copre debito)
    if (debitoOrdinario > 0.01 && straordinarioPotenziale > 0.01) {
        const oreDaCompensare = Math.min(debitoOrdinario, straordinarioPotenziale);
        
        oreOrdinarieLavorate += oreDaCompensare;
        straordinarioPotenziale -= oreDaCompensare;
        debitoOrdinario = 0; // Il debito è stato coperto

        // Ora estraiamo le ore usate per la compensazione e liquidiamo SOLO la maggiorazione
        let compDiurne = Math.min(oreDaCompensare, oreDiurneNette - Math.min(oreOrdinarieLavorate, oreDiurneNette));
        let compNotturneSerali = Math.min(oreDaCompensare - compDiurne, oreNotturnoSeraliNette - Math.min(oreOrdinarieLavorate, oreNotturnoSeraliNette));
        let compNotturnePiene = Math.min(oreDaCompensare - compDiurne - compNotturneSerali, oreNotturnoPieneNette - Math.min(oreOrdinarieLavorate, oreNotturnoPieneNette));
        
        const straordDaBancaOre = compDiurne + compNotturneSerali;
        risultato.bancaOreSolaMaggiorazione25! += Math.min(straordDaBancaOre, 2);
        risultato.bancaOreSolaMaggiorazione30! += Math.max(0, straordDaBancaOre - 2);
        risultato.bancaOreSolaMaggiorazione50! += compNotturnePiene;
    }

    // 4.2 Assegnazione ore ORDINARIE (dopo eventuale compensazione)
    risultato.pagaBaseOre = Math.min(oreOrdinarieLavorate, oreDiurneNette) + totaleAssenzeParziali;
    risultato.oreNotturnoSeraleOrd = Math.min(oreOrdinarieLavorate - Math.min(oreOrdinarieLavorate, oreDiurneNette), oreNotturnoSeraliNette);
    risultato.oreNotturnoPienoOrd = Math.min(oreOrdinarieLavorate - Math.min(oreOrdinarieLavorate, oreDiurneNette) - risultato.oreNotturnoSeraleOrd, oreNotturnoPieneNette);

    // 4.3 Assegnazione ore STRAORDINARIE (ciò che avanza)
    let straordDiurno = Math.max(0, oreDiurneNette - (risultato.pagaBaseOre - totaleAssenzeParziali));
    let straordNotturnoSerali = Math.max(0, oreNotturnoSeraliNette - risultato.oreNotturnoSeraleOrd);
    let straordNotturnoPieno = Math.max(0, oreNotturnoPieneNette - risultato.oreNotturnoPienoOrd);
    
    const totaleStraordinarioFeriale = straordDiurno + straordNotturnoSerali;
    risultato.strDiu12Intero = Math.min(totaleStraordinarioFeriale, 2);
    risultato.strDiuSuccessIntero = Math.max(0, totaleStraordinarioFeriale - 2);
    risultato.straordinarioNotturno50 = straordNotturnoPieno;

    // 4.4 Copertura debito residuo con ROL
    if (debitoOrdinario > 0.01) {
        const rolDaUsare = Math.min(debitoOrdinario, saldiAggiornati.rol);
        if (rolDaUsare > 0) {
            risultato.rolScalati += rolDaUsare;
            saldiAggiornati.rol -= rolDaUsare;
            risultato.pagaBaseOre += rolDaUsare; // I ROL diventano ore pagate base
            debitoOrdinario -= rolDaUsare;
        }
    }

    // 4.5 Anomalie finali
    if (debitoOrdinario > 0.01) {
        risultato.anomaliaDebitoUncovered = debitoOrdinario;
    }

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
        const festivitaDelGiorno = allFestivita.find(f => isSameDaySafe(toDateSafe(f.data), giorno));
        const rapportiniDelGiorno = rapportini.filter(r => isSameDaySafe(toDateSafe(r.data), giorno) && r.dettaglioOreTecnici?.some(d => d.tecnicoId === dipendente.id));

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
        return Object.keys(r).some(key => {
            const typedKey = key as keyof RisultatoCalcoloGiornaliero;
            if (typedKey !== 'data' && typeof r[typedKey] === 'number') {
                return (r[typedKey] as number) > 0.009;
            }
            return false;
        });
    });

    return { risultati: finalResultsFiltered, saldiFinali: saldiCorrenti };
};

export type { RisultatoCalcoloGiornaliero };