
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { UserProfile } from '@/models/definitions';

// Definiamo le interfacce per i dati che la funzione riceverà
// Queste dovrebbero corrispondere a quelle calcolate in DailyBreakdownTable.tsx
export interface DailySummary {
    day: Date;
    activities: { nome: string; colore: string | undefined }[];
    insertedHours: number;
    ordinarie: number;
    straordinarie: number;
    otherHours: { [key: string]: number };
}

export interface Totals {
    insertedHours: number;
    ordinarie: number;
    straordinarie: number;
    [key: string]: number;
}

const abbreviate = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('ordinario')) return 'Ord.';
    if (lower.includes('straordinario')) return 'Str.';
    if (lower.includes('legge 104')) return 'L.104';
    if (lower.includes('ferie')) return 'Ferie';
    if (lower.includes('malattia')) return 'Malattia';
    if (lower.includes('trasferta')) return 'Trasf.';
    // Fallback per nomi non riconosciuti
    const words = name.split(' ');
    if (words.length > 1) {
        return words.map(w => w[0]).join('').toUpperCase();
    }
    return name.substring(0, 3) + '.';
}

// --- Funzione Principale per Generare il PDF del Dettaglio Giornaliero ---
export const generateDailyBreakdownPDF = async (
    dailySummaries: DailySummary[],
    otherHourTypes: string[],
    totals: Totals,
    userProfile: UserProfile,
    currentMonth: Date
): Promise<Blob> => {

    const doc = new jsPDF('p', 'mm', 'a4');
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Stili coerenti con l'altro report
    const COLOR_PRIMARY = '#1976D2';
    const COLOR_TEXT_PRIMARY = '#212121';

    const drawHeader = () => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(COLOR_PRIMARY);
        doc.text('Dettaglio Attività Giornaliere', pageWidth / 2, margin, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(COLOR_TEXT_PRIMARY);
        const nomeTecnico = `${userProfile.cognome} ${userProfile.nome}`;
        const meseFormattato = format(currentMonth, 'MMMM yyyy', { locale: it });
        doc.text(`Tecnico: ${nomeTecnico}`, margin, margin + 8);
        doc.text(`Mese: ${meseFormattato}`, pageWidth - margin, margin + 8, { align: 'right' });
    };

    const drawFooter = (pageNumber: number, totalPages: number) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor('#757575');
        const text = `Pagina ${pageNumber} di ${totalPages}`;
        doc.text(text, pageWidth / 2, pageHeight - 10, { align: 'center' });
    };

    // Preparazione dei dati per autoTable
    const head = [[
        'Giorno',
        'Ore Ins.',
        'Ord.',
        'Str.',
        ...otherHourTypes.map(type => abbreviate(type))
    ]];

    const body = dailySummaries.map(summary => {
        // Formattazione del giorno e delle attività per la prima colonna
        const dayFormatted = format(summary.day, 'eee d', { locale: it });
        const activitiesFormatted = summary.activities.map(act => act.nome).join(', ');

        const firstCellContent = `${dayFormatted.charAt(0).toUpperCase() + dayFormatted.slice(1)}\n${activitiesFormatted}`;

        return [
            { content: firstCellContent, styles: { cellPadding: { top: 2, bottom: 2 } } },
            summary.insertedHours.toFixed(2),
            summary.ordinarie > 0 ? summary.ordinarie.toFixed(2) : '-',
            summary.straordinarie > 0 ? summary.straordinarie.toFixed(2) : '-',
            ...otherHourTypes.map(type =>
                (summary.otherHours[type] && summary.otherHours[type] > 0)
                    ? summary.otherHours[type].toFixed(2)
                    : '-'
            )
        ];
    });

    const foot = [[
        'Totale',
        totals.insertedHours.toFixed(2),
        totals.ordinarie.toFixed(2),
        totals.straordinarie.toFixed(2),
        ...otherHourTypes.map(type =>
            (totals[type] && totals[type] > 0)
                ? totals[type].toFixed(2)
                : '-'
        )
    ]];

    autoTable(doc, {
        head,
        body,
        foot,
        startY: margin + 15,
        theme: 'striped',
        headStyles: {
            fillColor: COLOR_PRIMARY,
            textColor: 'white',
            fontStyle: 'bold',
            halign: 'center',
            valign: 'middle',
        },
        footStyles: {
            fillColor: '#E0E0E0',
            textColor: COLOR_TEXT_PRIMARY,
            fontStyle: 'bold',
            halign: 'right',
        },
        columnStyles: {
            0: { cellWidth: 45, fontStyle: 'bold', valign: 'middle' }, // Giorno + Attività
            1: { halign: 'right', valign: 'middle' },
            2: { halign: 'right', valign: 'middle' },
            3: { halign: 'right', valign: 'middle', fontStyle: 'bold' }, // Straordinari
        },
        didDrawPage: (data) => {
            drawHeader();
            const totalPages = (doc as any).internal.getNumberOfPages();
            drawFooter(data.pageNumber, totalPages);
        },
        // Assicura che il footer venga ridisegnato su ogni pagina
        willDrawPage: (data) => {
            const totalPages = (doc as any).internal.getNumberOfPages();
            drawFooter(data.pageNumber, totalPages);
        }
    });
    
    // Fallback per il footer nel caso di una sola pagina
    const totalPages = (doc as any).internal.getNumberOfPages();
    if(totalPages === 1) {
         drawFooter(1, 1);
    }


    return doc.output('blob');
};
