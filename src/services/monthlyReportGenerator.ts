import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { EnrichedRapportino, TipoGiornata, Tecnico, Rapportino } from '@/models/definitions';

// Duplichiamo le funzioni helper necessarie qui per mantenere il servizio di generazione autonomo
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

    // 1. INTESTAZIONE
    const companyName = "NOME AZIENDA";
    const companyAddress = "Via Esempio, 123 - 20100 Milano (MI)";
    const companyContacts = "Tel: 02 123456 - Email: info@esempio.it";

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(companyName, 20, 20);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(companyAddress, 20, 25);
    doc.text(companyContacts, 20, 29);

    // 2. TITOLO DEL REPORT
    const reportTitle = `${tecnico.nome} ${tecnico.cognome} - Riepilogo ${format(currentMonth, 'MMMM yyyy', { locale: it })}`;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(reportTitle, doc.internal.pageSize.getWidth() / 2, 45, { align: 'center' });

    // 3. LOGICA DI CALCOLO E PREPARAZIONE DATI PER LA TABELLA
    const tipiGiornataMap = new Map(tipiGiornata.map(t => [t.id, t]));
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
        const cantiere = reports[0]?.cantiere;
        const nave = cantiere?.nome || '';
        const luogo = cantiere?.localita || '';
        const descrizione = reports.map(r => r.descrizioneBreve).filter(Boolean).join('; ');

        let insertedHours = 0, ordinarieDaSplittare = 0;
        const otherHours: { [key: string]: number } = {};
        const activities = new Map<string, { nome: string; colore: string | undefined }>();

        for (const report of reports) {
            insertedHours += report.oreGiorno;
            if(report.trasfertaId) {
                const trasfertaTipo = tipiGiornataMap.get(report.trasfertaId);
                if (trasfertaTipo) activities.set(trasfertaTipo.id, { nome: trasfertaTipo.nome, colore: trasfertaTipo.colore });
            }
            const tipoG = report.tipoGiornata;
            if(tipoG) {
               activities.set(tipoG.id, { nome: tipoG.nome, colore: tipoG.colore });
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
            nave,
            luogo,
            descrizione,
            activities: Array.from(activities.values()),
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

    // 4. GENERAZIONE DELLA TABELLA
    const head = ['Giorno', 'Ore Ins.', 'Ord.', 'Str.', ...otherHourTypes.map(abbreviate)];

    const body = summaries.map(summary => {
        const dayInfo = format(summary.day, 'eee d', { locale: it });
        const activityInfo = summary.activities.map(act => abbreviate(act.nome)).join(', ');
        
        let firstCellContent = `${dayInfo} - ${activityInfo}`;
        if (summary.nave || summary.luogo) {
            firstCellContent += `\n${summary.nave} - ${summary.luogo}`;
        }
        if (summary.descrizione) {
            firstCellContent += `\nDesc: ${summary.descrizione}`;
        }

        return [
            {
                content: firstCellContent,
                styles: { halign: 'left' }
            },
            summary.insertedHours.toFixed(2),
            summary.ordinarie > 0 ? summary.ordinarie.toFixed(2) : '-',
            summary.straordinarie > 0 ? summary.straordinarie.toFixed(2) : '-',
            ...otherHourTypes.map(type => (summary.otherHours[type] > 0) ? (summary.otherHours[type]).toFixed(2) : '-')
        ];
    });

    const foot = [[
        { content: 'Totale', styles: { halign: 'left', fontStyle: 'bold' } },
        { content: totals.insertedHours.toFixed(2), styles: { fontStyle: 'bold' } },
        { content: totals.ordinarie.toFixed(2), styles: { fontStyle: 'bold' } },
        { content: totals.straordinarie.toFixed(2), styles: { fontStyle: 'bold' } },
        ...otherHourTypes.map(type => ({ content: (totals[type] ?? 0).toFixed(2), styles: { fontStyle: 'bold' } }))
    ]];

    autoTable(doc, {
        startY: 55,
        head: [head],
        body: body,
        foot: foot,
        theme: 'grid',
        headStyles: {
            fillColor: [22, 160, 133],
            textColor: 255,
            fontStyle: 'bold',
        },
        footStyles: {
            fillColor: [241, 241, 241],
            textColor: 0,
            fontStyle: 'bold'
        },
        styles: { 
            fontSize: 7,
            cellPadding: 2, 
            halign: 'right' 
        },
        columnStyles: {
            0: { halign: 'left', cellWidth: 60 }
        }
    });

    // 5. RITORNA IL BLOB
    return doc.output('blob');
};