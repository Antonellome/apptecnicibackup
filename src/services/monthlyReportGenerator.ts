import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { EnrichedRapportino, Tecnico } from '@/models/definitions';
import { RiepilogoMese } from '@/pages/MonthlyReportPage';

// --- Funzione Principale per Generare il PDF del Report Mensile ---
export const generateMonthlyReportPDF = async (
    reports: EnrichedRapportino[],
    riepilogo: RiepilogoMese, // DATI GIÀ CALCOLATI
    tecnico: Tecnico,
    month: Date
): Promise<Blob> => {

    const doc = new jsPDF('p', 'mm', 'a4');
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    let cursorY = margin;

    // --- DEFINIZIONE COLORI ---
    const COLOR_PRIMARY = '#1976D2';
    const COLOR_TEXT_PRIMARY = '#212121';
    const COLOR_TEXT_SECONDARY = '#757575';
    const COLOR_HEADER_BG = '#F5F5F5';

    // --- 1. INTESTAZIONE ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(COLOR_PRIMARY);
    doc.text('Riepilogo Attività Mensile', pageWidth / 2, cursorY, { align: 'center' });
    cursorY += 10;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(COLOR_TEXT_PRIMARY);
    const nomeTecnico = `${tecnico.cognome} ${tecnico.nome}`;
    const meseFormattato = format(month, 'MMMM yyyy', { locale: it });
    doc.text(`Tecnico: ${nomeTecnico}`, margin, cursorY);
    doc.text(`Mese: ${meseFormattato}`, pageWidth - margin, cursorY, { align: 'right' });
    cursorY += 10;

    // --- 2. SEZIONE DI RIEPILOGO ORARIO ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(COLOR_PRIMARY);
    doc.text('Riepilogo Ore', margin, cursorY);
    cursorY += 6;
    
    const summaryBody = Array.from(riepilogo.dettaglio.values()).map(item => [
        item.nome,
        `${item.oreOrdinarie + item.oreStraordinario}h`,
        `${item.giorni} gg`
    ]);
    
    autoTable(doc, {
        startY: cursorY,
        head: [['Tipologia', 'Ore Lavorate', 'Giorni']],
        body: summaryBody,
        foot: [['TOTALE', `${riepilogo.oreTotali.toFixed(2)}h`, '']],
        theme: 'grid',
        headStyles: { fillColor: COLOR_HEADER_BG, textColor: COLOR_TEXT_PRIMARY, fontStyle: 'bold' },
        footStyles: { fillColor: COLOR_PRIMARY, textColor: '#FFFFFF', fontStyle: 'bold' },
        didDrawPage: (data) => {
            cursorY = data.cursor?.y || cursorY;
        }
    });

    cursorY = (doc as any).lastAutoTable.finalY + 10;

    // --- 3. SEZIONE DETTAGLIO ATTIVITÀ ---
    if (cursorY > doc.internal.pageSize.getHeight() - 40) {
        doc.addPage();
        cursorY = margin;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(COLOR_PRIMARY);
    doc.text('Dettaglio Attività', margin, cursorY);
    cursorY += 6;

    const tableBody = reports.map(report => [
        format(report.data, 'dd/MM/yyyy'),
        report.tipoGiornata?.nome || 'N/D',
        report.naveNome || '-', // Colonna Nave
        report.luogoNome || '-', // Colonna Luogo
        report.descrizioneBreve || ''
    ]);

    autoTable(doc, {
        startY: cursorY,
        head: [['Data', 'Tipo Giornata', 'Nave', 'Luogo', 'Breve Descrizione']],
        body: tableBody,
        theme: 'striped',
        headStyles: { fillColor: COLOR_HEADER_BG, textColor: COLOR_TEXT_PRIMARY, fontStyle: 'bold' },
        columnStyles: {
            0: { cellWidth: 22 },
            1: { cellWidth: 30 },
            2: { cellWidth: 30 },
            3: { cellWidth: 30 },
            4: { cellWidth: 'auto' },
        },
        didDrawPage: (data) => {
            cursorY = data.cursor?.y || cursorY;
        }
    });

    // --- FINE E OUTPUT ---
    return doc.output('blob');
};
