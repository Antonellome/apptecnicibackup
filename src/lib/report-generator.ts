import { EnrichedRapportino, RiepilogoMese } from '@/models/definitions';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateMonthlyReportPDF = async (rapportini: EnrichedRapportino[], month: string, riepilogo: RiepilogoMese): Promise<Blob> => {
    const doc = new jsPDF();
    
    // --- Titolo ---
    doc.setFontSize(18);
    doc.text(`Riepilogo Mensile - ${month}`, 14, 22);
    
    // --- Riepilogo Aggregato ---
    doc.setFontSize(11);
    doc.text(`Ore Totali Lavorate: ${riepilogo.oreTotali.toFixed(2)}`, 14, 32);
    doc.text(`Giorni di Presenza: ${riepilogo.giorniTotaliLavorati}`, 14, 38);
    doc.text(`Giorni di Trasferta: ${riepilogo.giorniTrasferta}`, 14, 44);

    const sortedRapportini = [...rapportini].sort((a, b) => a.data.getTime() - b.data.getTime());

    const head = [[
        'Data',
        'Cliente',
        'Nave / Luogo',
        'Descrizione',
        'Ord',
        'Str',
        'Altro (h)',
        'Trasf.'
    ]];

    const body: any[][] = [];

    const dailyTotals = {
        oreOrdinarie: 0,
        oreStraordinarie: 0,
        altreOre: 0,
        giorniTrasferta: 0,
    };
    
    const trasferteProcessate = new Set<string>();

    for (const report of sortedRapportini) {
        const dataGiorno = format(report.data, 'dd/MM/yyyy');
        
        const oreOrdinarie = report.tipoGiornataId === 't_ordinaria' ? report.oreGiorno : 0;
        const oreStraordinarie = report.tipoGiornataId === 't_straordinaria' ? report.oreGiorno : 0;
        const altreOre = (report.tipoGiornata?.unita === 'h' && !['t_ordinaria', 't_straordinaria'].includes(report.tipoGiornataId)) ? report.oreGiorno : 0;
        
        let trasfertaGiorno = '-';
        if (report.trasfertaId) {
            const key = `${dataGiorno}-${report.trasfertaId}`;
            if (!trasferteProcessate.has(key)) {
                trasfertaGiorno = report.trasferta?.sigla || 'Sì';
                trasferteProcessate.add(key);
                dailyTotals.giorniTrasferta += 1;
            }
        }

        body.push([
            `${format(report.data, 'dd/MM, eee', { locale: it })}`,
            report.clienteNome || 'N/D',
            report.naveNome || report.luogoNome || 'N/D',
            report.descrizioneBreve || '-',
            oreOrdinarie > 0 ? oreOrdinarie.toFixed(2) : '-',
            oreStraordinarie > 0 ? oreStraordinarie.toFixed(2) : '-',
            altreOre > 0 ? altreOre.toFixed(2) : '-',
            trasfertaGiorno,
        ]);

        dailyTotals.oreOrdinarie += oreOrdinarie;
        dailyTotals.oreStraordinarie += oreStraordinarie;
        dailyTotals.altreOre += altreOre;
    }

    // --- Riga Totali ---
    const totalRow = [
        {
            content: 'TOTALI',
            colSpan: 4,
            styles: { fontStyle: 'bold', halign: 'right' },
        },
        { content: dailyTotals.oreOrdinarie.toFixed(2), styles: { fontStyle: 'bold' } },
        { content: dailyTotals.oreStraordinarie.toFixed(2), styles: { fontStyle: 'bold' } },
        { content: dailyTotals.altreOre.toFixed(2), styles: { fontStyle: 'bold' } },
        { content: dailyTotals.giorniTrasferta.toString(), styles: { fontStyle: 'bold' } },
    ];
    body.push(totalRow);

    autoTable(doc, {
        startY: 50,
        head: head,
        body: body,
        theme: 'grid',
        headStyles: { fillColor: [44, 62, 80], textColor: [255, 255, 255], fontSize: 8 },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: {
            0: { cellWidth: 25 }, // Data
            1: { cellWidth: 30 }, // Cliente
            2: { cellWidth: 30 }, // Nave
            3: { cellWidth: 'auto' }, // Descrizione
            4: { cellWidth: 15, halign: 'right' }, // Ord
            5: { cellWidth: 15, halign: 'right' }, // Str
            6: { cellWidth: 15, halign: 'right' }, // Altro
            7: { cellWidth: 15, halign: 'center' }, // Trasf
        },
        didParseCell: (data) => {
            // Stile per la riga dei totali
            if (data.row.raw[0] && (data.row.raw[0] as any).content === 'TOTALI') {
                data.cell.styles.fillColor = [220, 220, 220];
                data.cell.styles.textColor = [0,0,0];
            }
        }
    });

    return doc.output('blob');
};