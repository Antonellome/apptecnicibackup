import { EnrichedRapportino, MasterData, UserProfile, Rapportino, RiepilogoMese } from '@/models/definitions';
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
    const riepilogoMese = calculateSummary(rapportiniArricchiti, masterData);

    return { rapportiniArricchiti, riepilogoMese };
}

// --- FUNZIONE DI GENERAZIONE PDF (invariata, ma potrebbe essere ulteriormente ottimizzata in futuro) ---
export const generateMonthlyReportPDF = async (rapportini: EnrichedRapportino[], month: string): Promise<Blob> => {
    const doc = new jsPDF();
    doc.text(`Dettaglio Attività - ${month}`, 14, 22);

    const sortedRapportini = [...rapportini].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

    const allOtherTypes = new Set<string>();
    sortedRapportini.forEach(r => {
        const tipoNome = r.tipoGiornata?.nome || 'N/A';
        if (!tipoNome.toLowerCase().includes('ordinaria') && !tipoNome.toLowerCase().includes('straordinario')) {
            allOtherTypes.add(tipoNome);
        }
    });
    const sortedOtherHourTypes = Array.from(allOtherTypes).sort();

    const body: any[][] = [];
    const totals = { oreOrdinarie: 0, oreStraordinarie: 0, altreOre: {} as Record<string, number> };
    const dailyOrdinaryHours: Record<string, number> = {};
    let lastDate = '';

    for (const report of sortedRapportini) {
        const dayKey = format(report.data, 'yyyy-MM-dd');
        if (!dailyOrdinaryHours[dayKey]) dailyOrdinaryHours[dayKey] = 0;

        const isFirst = dayKey !== lastDate;
        lastDate = dayKey;

        let oreOrdinarie = 0;
        let oreStraordinarie = 0;
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

        const rowData = [
            {
                content: `${format(new Date(report.data), 'dd/MM')} (${format(new Date(report.data), 'eee', { locale: it })})`,
                styles: { fontStyle: (isFirst ? 'bold' : 'normal') as 'bold' | 'normal' }
            },
            `${report.tipoGiornata?.nome || 'N/D'} ${report.naveId ? `(${report.naveId})` : ''}`,
            oreOrdinarie > 0 ? oreOrdinarie.toFixed(2) : '-',
            oreStraordinarie > 0 ? oreStraordinarie.toFixed(2) : '-',
            ...sortedOtherHourTypes.map(tipo => altreOre[tipo] > 0 ? (altreOre[tipo]).toFixed(2) : '-')
        ];
        body.push(rowData);
    }

    const head = [[
        'Giorno', 
        'Attività', 
        'Ord.', 
        'Straord.', 
        ...sortedOtherHourTypes
    ]];

    const totalRow = [
        { content: 'TOTALI', colSpan: 2, styles: { fontStyle: 'bold' as const } },
        totals.oreOrdinarie.toFixed(2),
        totals.oreStraordinarie.toFixed(2),
        ...sortedOtherHourTypes.map(tipo => (totals.altreOre[tipo] || 0).toFixed(2))
    ];
    body.push(totalRow);

    const grandTotal = totals.oreOrdinarie + totals.oreStraordinarie + Object.values(totals.altreOre).reduce((a, b) => a + b, 0);
    const grandTotalRow = [
        { 
            content: `TOTALE ORE MESE: ${grandTotal.toFixed(2)}`,
            colSpan: head[0].length,
            styles: { fontStyle: 'bold' as const, halign: 'center' as const }
        }
    ];
    body.push(grandTotalRow);


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