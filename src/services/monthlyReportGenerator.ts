
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { EnrichedRapportino, Tecnico } from '@/models/definitions';
import { RiepilogoMese } from '@/pages/MonthlyReportPage';

// --- Funzione Principale per Generare il PDF del Report Mensile ---
export const generateMonthlyReportPDF = async (
    reports: EnrichedRapportino[],
    riepilogo: RiepilogoMese,
    tecnico: Tecnico,
    month: Date
): Promise<Blob> => {

    const doc = new jsPDF('p', 'mm', 'a4');
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const headerHeight = 25; 
    const footerHeight = 15;

    const COLOR_PRIMARY = '#1976D2';
    const COLOR_TEXT_PRIMARY = '#212121';
    const COLOR_HEADER_BG = '#F5F5F5';

    const drawHeader = () => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(COLOR_PRIMARY);
        doc.text('Riepilogo Attività Mensile', pageWidth / 2, margin, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);
        doc.setTextColor(COLOR_TEXT_PRIMARY);
        const nomeTecnico = `${tecnico.cognome} ${tecnico.nome}`;
        const meseFormattato = format(month, 'MMMM yyyy', { locale: it });
        doc.text(`Tecnico: ${nomeTecnico}`, margin, margin + 10);
        doc.text(`Mese: ${meseFormattato}`, pageWidth - margin, margin + 10, { align: 'right' });
    };

    const drawFooter = (pageNumber: number, totalPages: number) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(COLOR_TEXT_PRIMARY);
        const text = `Pagina ${pageNumber} di ${totalPages}`;
        const textWidth = doc.getStringUnitWidth(text) * doc.getFontSize() / doc.internal.scaleFactor;
        doc.text(text, (pageWidth - textWidth) / 2, pageHeight - (footerHeight / 2) + 5);
    };

    const summaryBody = Array.from(riepilogo.dettaglio.values()).map(item => [
        item.nome,
        `${item.oreOrdinarie + item.oreStraordinario}h`,
        `${item.giorni} gg`
    ]);

    autoTable(doc, {
        startY: headerHeight,
        head: [['Riepilogo Ore', '', '']],
        body: summaryBody,
        foot: [['TOTALE', `${riepilogo.oreTotali.toFixed(2)}h`, '']],
        theme: 'grid',
        headStyles: { fillColor: COLOR_PRIMARY, textColor: '#FFFFFF', fontStyle: 'bold', fontSize: 14, halign: 'center' },
        footStyles: { fillColor: COLOR_PRIMARY, textColor: '#FFFFFF', fontStyle: 'bold' },
        margin: { top: headerHeight, bottom: footerHeight },
        didDrawPage: () => {
            drawHeader();
        },
    });

    // Lasciamo che la tabella disegni la struttura, ma sovrascriviamo il contenuto della cella 'Ore'
    const tableBody = reports.map(report => [
        format(report.data, 'dd/MM/yyyy'),
        report.tipoGiornata?.nome || 'N/D',
        report.naveNome || '-',
        report.luogoNome || '-',
        report.descrizioneBreve || '',
        '' // Contenuto cella ore gestito in didDrawCell
    ]);

    autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [['Data', 'Tipo Giornata', 'Nave', 'Luogo', 'Descrizione', 'Orario / Ore']],
        body: tableBody,
        theme: 'striped',
        headStyles: { fillColor: COLOR_HEADER_BG, textColor: COLOR_TEXT_PRIMARY, fontStyle: 'bold' },
        columnStyles: {
            0: { cellWidth: 22 }, // Aumentata per la data
            1: { cellWidth: 28 },
            2: { cellWidth: 25 },
            3: { cellWidth: 25 },
            4: { cellWidth: 'auto' },
            5: { cellWidth: 25, halign: 'right' }, // Colonna Orario/Ore
        },
        margin: { top: headerHeight, bottom: footerHeight },
        didDrawPage: () => {
            drawHeader();
        },
        didDrawCell: (data) => {
            // Applica solo alla colonna "Orario / Ore" (indice 5) nel corpo della tabella
            if (data.section === 'body' && data.column.index === 5) {
                const report = reports[data.row.index];
                const oreGiorno = report.oreGiorno ?? 0;

                // Trova il dettaglio orario per il tecnico corrente
                const dettaglioTecnico = report.dettaglioOreTecnici?.find(d => d.tecnicoId === tecnico.id);
                
                let orarioString = '';
                if (dettaglioTecnico && dettaglioTecnico.oraInizio) {
                    orarioString = `${dettaglioTecnico.oraInizio}-${dettaglioTecnico.oraFine} | ${dettaglioTecnico.pausa || 0}m`;
                }

                const oreString = `${oreGiorno.toFixed(2)}h`;

                const cellPadding = 2; // Padding orizzontale della cella
                const x = data.cell.x + data.cell.width - cellPadding;
                const y = data.cell.y + data.cell.height / 2; // Allineamento verticale centrale

                // Disegna la stringa dell'orario (se presente)
                if (orarioString) {
                    doc.setFontSize(7);
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(COLOR_TEXT_PRIMARY);
                    doc.text(orarioString, x, y - 1, { align: 'right' });
                }

                // Disegna le ore totali, evidenziate
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(COLOR_TEXT_PRIMARY);
                const yOffset = orarioString ? y + 3 : y; // Posiziona sotto l'orario o al centro
                doc.text(oreString, x, yOffset, { align: 'right' });
            }
        }
    });
    
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        drawFooter(i, totalPages);
    }

    return doc.output('blob');
};