import { EnrichedRapportino, MasterData, UserProfile, Rapportino, RiepilogoMese, Tariffa } from '@/models/definitions';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { enrichRapportini, calculateSummary } from './monthlyReportCalculator';

// --- Funzione Principale Orchestratrice ---
export function calculateMonthlyReportData(
    rapportini: Rapportino[], 
    masterData: MasterData, 
    userProfile: UserProfile
): { rapportiniArricchiti: EnrichedRapportino[], riepilogoMese: RiepilogoMese } {
    
    const rapportiniArricchiti = enrichRapportini(rapportini, masterData, userProfile);
    const riepilogoMese = calculateSummary(rapportiniArricchiti, masterData); // Calcola ore, giorni, etc.

    // =====================================================================================
    // --- LOGICA DI CALCOLO COSTO TOTALE --- V3 - CORRETTA
    // =====================================================================================
    let costoTotaleFinale = 0;
    const tariffeLocali = masterData?.impostazioni?.tariffe || [];

    if (tariffeLocali.length === 0) {
        console.warn("Nessuna tariffa definita nelle impostazioni locali. Il costo totale stimato sarà zero.");
    } else {
        rapportiniArricchiti.forEach(r => {
            // L'errore era qui. L'abbinamento corretto è tra l'ID del tipo giornata del rapportino
            // e il campo `tipoGiornataId` della tariffa salvata.
            const tariffaCorrispondente = tariffeLocali.find(t => t.tipoGiornataId === r.tipoGiornataId);

            if (tariffaCorrispondente) {
                if (tariffaCorrispondente.unita === 'h') {
                    costoTotaleFinale += (r.oreGiorno || 0) * tariffaCorrispondente.costo;
                } else if (tariffaCorrispondente.unita === 'g') {
                    costoTotaleFinale += tariffaCorrispondente.costo;
                }
            } else {
                 console.warn(`Tariffa non trovata per il tipo giornata con ID: ${r.tipoGiornataId} (Nome: ${r.tipoGiornata?.nome}). Questo giorno non contribuirà al costo.`);
            }
        });
    }
    
    riepilogoMese.costoTotale = costoTotaleFinale;
    // =====================================================================================

    return { rapportiniArricchiti, riepilogoMese };
}


// --- FUNZIONE DI GENERAZIONE PDF (invariata) ---
export const generateMonthlyReportPDF = async (rapportini: EnrichedRapportino[], month: string): Promise<Blob> => {
    const doc = new jsPDF();
    doc.text(`Dettaglio Attività - ${month}`, 14, 22);

    const sortedRapportini = [...rapportini].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

    // --- Identificazione Colonne Dinamiche (Ore e Trasferte) ---
    const allOtherTypes = new Set<string>();
    const allTripTypes = new Set<string>();

    sortedRapportini.forEach(r => {
        const tipoNome = r.tipoGiornata?.nome || 'N/A';
        if (!tipoNome.toLowerCase().includes('ordinaria') && !tipoNome.toLowerCase().includes('straordinario')) {
            allOtherTypes.add(tipoNome);
        }
        if (r.trasferta?.nome) {
            allTripTypes.add(r.trasferta.nome);
        }
    });
    const sortedOtherHourTypes = Array.from(allOtherTypes).sort();
    const sortedTripTypes = Array.from(allTripTypes).sort();

    // --- Abbreviazioni Intestazioni ---
    const getHourAbbreviation = (name: string) => {
        const lowerName = name.toLowerCase();
        if (lowerName.includes('permesso')) return 'Perm';
        if (lowerName.includes('ferie')) return 'Fer';
        if (lowerName.includes('festivit')) return 'Fes';
        if (lowerName.includes('legge 104')) return '104';
        return name.split(' ').map(word => word.charAt(0)).join('').toUpperCase().substring(0, 3);
    };

    const getTripAbbreviation = (name: string) => {
        const lowerName = name.toLowerCase();
        if (lowerName.includes('italia')) return 'Tr IT';
        if (lowerName.includes('europa')) return 'Tr EU';
        if (lowerName.includes('extra')) return 'Tr EX';
        return 'Tr';
    };
    const abbreviatedTripTypes = sortedTripTypes.map(getTripAbbreviation);

    // --- Definizione Intestazioni Tabella ---
    const head = [[
        'Data', 
        'Descrizione', 
        'Ord', 
        'Str', 
        ...sortedOtherHourTypes.map(getHourAbbreviation),
        ...abbreviatedTripTypes
    ]];

    // --- Calcolo Totali (separato dalla visualizzazione) ---
    const totals = { 
        oreOrdinarie: 0, 
        oreStraordinarie: 0, 
        altreOre: {} as Record<string, number>, 
        trips: {} as Record<string, number> 
    };
    abbreviatedTripTypes.forEach(t => totals.trips[t] = 0);

    const processedTripDays = new Set<string>(); // Traccia i giorni di trasferta già contati
    sortedRapportini.forEach(report => {
        if (report.trasferta?.nome) {
            const dayKey = format(report.data, 'yyyy-MM-dd');
            const abbr = getTripAbbreviation(report.trasferta.nome);
            const uniqueDayTripKey = `${dayKey}-${abbr}`;
            if (!processedTripDays.has(uniqueDayTripKey)) {
                totals.trips[abbr]++;
                processedTripDays.add(uniqueDayTripKey);
            }
        }
    });

    // --- Costruzione Corpo Tabella ---
    const body: any[][] = [];
    const dailyOrdinaryHours: Record<string, number> = {};
    let lastDate = '';

    for (const report of sortedRapportini) {
        const dayKey = format(report.data, 'yyyy-MM-dd');
        if (!dailyOrdinaryHours[dayKey]) dailyOrdinaryHours[dayKey] = 0;

        const isFirst = dayKey !== lastDate;
        lastDate = dayKey;

        // Calcolo ore
        let oreOrdinarie = 0, oreStraordinarie = 0;
        const altreOre: Record<string, number> = {};
        const tipoNome = report.tipoGiornata?.nome || 'N/A';
        const oreGiorno = report.oreGiorno;

        if (tipoNome.toLowerCase().includes('ordinaria')) {
            const availableOrdinary = 8 - dailyOrdinaryHours[dayKey];
            const ordinaryPart = Math.max(0, Math.min(oreGiorno, availableOrdinary));
            const overtimePart = Math.max(0, oreGiorno - ordinaryPart);
            oreOrdinarie = ordinaryPart;
            oreStraordinarie = overtimePart;
            dailyOrdinaryHours[dayKey] += ordinaryPart;
        } else if (tipoNome.toLowerCase().includes('straordinario')) {
            oreStraordinarie = oreGiorno;
        } else {
            altreOre[tipoNome] = (altreOre[tipoNome] || 0) + oreGiorno;
        }

        totals.oreOrdinarie += oreOrdinarie;
        totals.oreStraordinarie += oreStraordinarie;
        for(const key in altreOre) totals.altreOre[key] = (totals.altreOre[key] || 0) + altreOre[key];

        const descrizione = report.descrizioneBreve || '';
        const reportTripAbbr = report.trasferta?.nome ? getTripAbbreviation(report.trasferta.nome) : null;

        const rowData = [
            {
                content: `${format(new Date(report.data), 'dd/MM')} (${format(new Date(report.data), 'eee', { locale: it })})`,
                styles: { fontStyle: (isFirst ? 'bold' : 'normal') as 'bold' | 'normal' }
            },
            descrizione,
            oreOrdinarie > 0 ? oreOrdinarie.toFixed(2) : '-',
            oreStraordinarie > 0 ? oreStraordinarie.toFixed(2) : '-',
            ...sortedOtherHourTypes.map(tipo => altreOre[tipo] > 0 ? (altreOre[tipo]).toFixed(2) : '-'),
            ...abbreviatedTripTypes.map(abbr => reportTripAbbr === abbr ? '1' : '-')
        ];
        body.push(rowData);
    }

    // --- Riga Totali ---
    const totalRow = [
        { content: 'TOTALI', colSpan: 2, styles: { fontStyle: 'bold' as const } },
        totals.oreOrdinarie.toFixed(2),
        totals.oreStraordinarie.toFixed(2),
        ...sortedOtherHourTypes.map(tipo => (totals.altreOre[tipo] || 0).toFixed(2)),
        ...abbreviatedTripTypes.map(abbr => (totals.trips[abbr] || 0).toString())
    ];
    body.push(totalRow);

    // --- Riga Totale Ore Mese ---
    const grandTotal = totals.oreOrdinarie + totals.oreStraordinarie + Object.values(totals.altreOre).reduce((a, b) => a + b, 0);
    const grandTotalRow = [
        { 
            content: `TOTALE ORE MESE: ${grandTotal.toFixed(2)}`,
            colSpan: head[0].length,
            styles: { fontStyle: 'bold' as const, halign: 'center' as const }
        }
    ];
    body.push(grandTotalRow);

    // --- Stampa Tabella ---
    autoTable(doc, {
        startY: 30,
        head: head,
        body: body,
        theme: 'grid',
        headStyles: { fillColor: [44, 62, 80], fontSize: 8 },
        styles: { fontSize: 8, cellPadding: 1.5 },
        didParseCell: function (data) {
            const rawRow = data.row.raw;
            if (Array.isArray(rawRow) && rawRow.length > 0) {
                const firstCell = rawRow[0];
                if (typeof firstCell === 'object' && firstCell !== null && 'content' in firstCell) {
                    const content = String((firstCell as { content: any }).content);
                    if (content.includes('TOTALI') || content.includes('TOTALE ORE MESE')) {
                        data.cell.styles.fontStyle = 'bold';
                        data.cell.styles.fillColor = [230, 230, 230];
                        data.cell.styles.textColor = [0, 0, 0];
                    }
                }
            }
        }
    });

    return doc.output('blob');
};