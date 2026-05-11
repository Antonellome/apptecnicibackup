
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Rapportino } from '../schemas/rapportino.schema';
import { format } from 'date-fns';

// Estende l'interfaccia di jsPDF per includere il plugin autoTable
declare module 'jspdf' {
    interface jsPDF {
        autoTable: (options: any) => jsPDF;
    }
}

const rapportinoPDFGenerator = async (report: Rapportino): Promise<string> => {
    const doc = new jsPDF();

    // Funzione per aggiungere un'immagine e attendere il suo caricamento
    const addImageAsync = (url: string, x: number, y: number, w: number, h: number) => {
        return new Promise<void>((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => {
                doc.addImage(img, 'WEBP', x, y, w, h);
                resolve();
            };
            img.onerror = (err) => {
                console.error("Errore nel caricamento dell'immagine per il PDF", err);
                // Non rigettare la promessa per non bloccare la generazione del PDF
                // Potresti voler inserire un placeholder o un messaggio di errore nel PDF
                doc.text('[Immagine non caricata]', x, y);
                resolve();
            };
            img.src = url;
        });
    };

    // INTESTAZIONE
    doc.setFontSize(20);
    doc.text(`Rapportino di Lavoro #${report.id}`, 14, 22);
    doc.setFontSize(12);
    doc.text(`Data: ${report.data ? format(new Date(report.data), 'dd/MM/yyyy') : 'N/D'}`, 14, 32);
    doc.text(`Cliente: ${report.cliente?.nome || 'N/D'}`, 14, 42);

    // DETTAGLI LAVORO
    doc.autoTable({
        startY: 50,
        head: [['Dettagli Intervento']],
        body: [
            [{ content: report.lavoroEseguito, styles: { minCellHeight: 30 } }]
        ],
        theme: 'grid'
    });

    // ORE DI LAVORO
    const tableData = report.dettaglioOreTecnici.map(tec => [
        tec.nome,
        tec.isManual ? 'Manuale' : `${tec.oraInizio || '-'} - ${tec.oraFine || '-'} (Pausa: ${tec.pausa || 0} min)`,
        (tec.ore ?? 0).toFixed(2)
    ]);

    doc.autoTable({
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [['Tecnico', 'Dettaglio Orario', 'Ore Totali']],
        body: tableData,
        theme: 'striped'
    });

    // FOTO
    if (report.photos && report.photos.length > 0) {
        doc.addPage();
        doc.setFontSize(16);
        doc.text('Foto dell\'intervento', 14, 22);
        let y = 30;
        for (const photo of report.photos) {
            try {
                await addImageAsync(photo.url, 14, y, 180, 100);
                y += 110; // Spazio per la prossima foto
            } catch (e) {
                // L'errore è già gestito in addImageAsync
            }
        }
    }

    // FIRMA
    if (report.signatureDataUrl) {
        if (doc.internal.pageSize.height - (doc as any).lastAutoTable.finalY < 100) {
            doc.addPage();
        }
        doc.setFontSize(16);
        doc.text('Firma Cliente', 14, (doc as any).lastAutoTable.finalY + 20);
        try {
            await addImageAsync(report.signatureDataUrl, 14, (doc as any).lastAutoTable.finalY + 30, 100, 50);
        } catch(e) {
            // Errore gestito
        }
    }
    
    // Restituisce il PDF come Data URI
    return doc.output('datauristring');
};

export default rapportinoPDFGenerator;
