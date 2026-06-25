import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { EnrichedRapportino, TipoGiornata, Tecnico, Rapportino } from '@/models/definitions';

// Funzioni helper
const isTrasfertaTipo = (tipo: TipoGiornata | undefined) => Boolean(tipo && tipo.categoria === 'trasferta');
const isLegacyTrasferta = (tipo: TipoGiornata | undefined, report: Rapportino): boolean => {
    return !report.trasfertaId && isTrasfertaTipo(tipo);
}
const abbreviate = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('ordinario')) return 'Ord.';
    if (lower.includes('straordinario')) return 'Str.';
    if (lower.includes('legge 104')) return 'L.104';
    if (lower.includes('ferie')) return 'Ferie';
    if (lower.includes('malattia')) return 'Malattia';
    if (lower.includes('trasferta')) return 'Trasf.';
    return name.substring(0, 5) + '.';
}

// Funzione principale per generare il PDF del report mensile
export const generateMonthlyReportPDF = async (
    rapportini: EnrichedRapportino[],
    tipiGiornata: TipoGiornata[],
    tecnico: Tecnico,
    currentMonth: Date
): Promise<Blob> => {

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // 1. TITOLO DEL REPORT
    const reportTitle = `Report Mensile di ${tecnico.nome} ${tecnico.cognome}`;
    const monthTitle = format(currentMonth, 'MMMM yyyy', { locale: it });
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(reportTitle, pageWidth / 2, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(monthTitle, pageWidth / 2, 28, { align: 'center' });

    // 2. LOGICA DI CALCOLO E PREPARAZIONE DATI PER LA TABELLA
    const TIPO_ORDINARIA_ID = tipiGiornata.find(t => t.nome.toLowerCase().includes('ordinaria'))?.id;
    const TIPO_STRAORDINARIA_NOME = tipiGiornata.find(t => t.nome.toLowerCase().includes('straordinar'))?.nome || 'Straordinario';

    const groupedByDay: { [key: string]: EnrichedRapportino[] } = {};
    for (const report of rapportini) {
        const dayKey = format(report.data, 'yyyy-MM-dd');
        if (!groupedByDay[dayKey]) groupedByDay[dayKey] = [];
        groupedByDay[dayKey].push(report);
    }

    const summaries = Object.values(groupedByDay).map(reports => {
        const day = reports[0].data;
        const descrizione = reports.map(r => r.descrizioneBreve).filter(Boolean).join('; ');

        let insertedHours = 0, ordinarieDaSplittare = 0;
        const otherHours: { [key: string]: number } = {};

        for (const report of reports) {
            insertedHours += report.oreGiorno;
            const tipoG = report.tipoGiornata;
            if(tipoG) {
               if (isLegacyTrasferta(tipoG, report) || tipoG.id === TIPO_ORDINARIA_ID) {
                   ordinarieDaSplittare += report.oreGiorno;
               } else {
                   otherHours[tipoG.nome] = (otherHours[tipoG.nome] || 0) + report.oreGiorno;
               }
            }
        }

        const sforo = Math.max(0, ordinarieDaSplittare - 8);
        const straordinarieDaSforo = sforo;
        const straordinarioPuro = otherHours[TIPO_STRAORDINARIA_NOME] || 0;

        return {
            day,
            descrizione,
            insertedHours,
            ordinarie: ordinarieDaSplittare - sforo,
            straordinarie: straordinarieDaSforo + straordinarioPuro,
            otherHours,
        };
    }).sort((a, b) => a.day.getTime() - b.day.getTime());

    const oht = new Set<string>();
    summaries.forEach(s => Object.keys(s.otherHours).forEach(type => {
        if (type !== TIPO_STRAORDINARIA_NOME) oht.add(type);
    }));
    const otherHourTypes = Array.from(oht).sort();

    const initialTotals: any = { insertedHours: 0, ordinarie: 0, straordinarie: 0 };
    otherHourTypes.forEach(type => initialTotals[type] = 0);

    const totals = summaries.reduce((acc, s) => {
        acc.insertedHours += s.insertedHours;
        acc.ordinarie += s.ordinarie;
        acc.straordinarie += s.straordinarie;
        otherHourTypes.forEach(type => {
            acc[type] = (acc[type] || 0) + (s.otherHours[type] || 0);
        });
        return acc;
    }, initialTotals);

    // 3. GENERAZIONE DELLA TABELLA
    const head = [['Data', 'Giorno', 'Descrizione', 'Ore Ins.', 'Ord.', 'Str.', ...otherHourTypes.map(abbreviate)]];

    const body = summaries.map(summary => {
        const dayOfWeek = format(summary.day, 'eee', { locale: it });
        return [
            format(summary.day, 'dd/MM'),
            dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1),
            summary.descrizione,
            summary.insertedHours.toFixed(2),
            summary.ordinarie > 0 ? summary.ordinarie.toFixed(2) : '-',
            summary.straordinarie > 0 ? summary.straordinarie.toFixed(2) : '-',
            ...otherHourTypes.map(type => (summary.otherHours[type] > 0) ? (summary.otherHours[type]).toFixed(2) : '-')
        ];
    });

    const foot = [[
        { content: 'Totale', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } },
        { content: totals.insertedHours.toFixed(2), styles: { fontStyle: 'bold' } },
        { content: totals.ordinarie.toFixed(2), styles: { fontStyle: 'bold' } },
        { content: totals.straordinarie.toFixed(2), styles: { fontStyle: 'bold' } },
        ...otherHourTypes.map(type => ({ content: (totals[type] ?? 0).toFixed(2), styles: { fontStyle: 'bold' } }))
    ]];

    autoTable(doc, {
        startY: 35,
        head: head,
        body: body,
        foot: foot as any,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
        footStyles: { fillColor: [236, 240, 241], textColor: 0, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 1.5, halign: 'right' },
        columnStyles: {
            0: { cellWidth: 13, halign: 'left' }, // Data
            1: { cellWidth: 13, halign: 'left' }, // Giorno
            2: { cellWidth: 'auto', halign: 'left' }, // Descrizione
        },
    });

    // 4. RITORNA IL BLOB
    return doc.output('blob');
};