
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Rapportino, MasterData } from '@/models/definitions';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toDateSafe as toDate } from '@/lib/date-utils';

const processSignatureForPdf = (whiteSignatureDataUrl: string): Promise<string | null> => {
    return new Promise((resolve) => {
        if (!whiteSignatureDataUrl || typeof whiteSignatureDataUrl !== 'string') {
            console.error("Signature data is invalid or missing.");
            return resolve(null);
        }

        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                console.error('Failed to get canvas context');
                return resolve(null);
            }

            canvas.width = img.width;
            canvas.height = img.height;

            try {
                ctx.drawImage(img, 0, 0);
                ctx.globalCompositeOperation = 'source-in';
                ctx.fillStyle = 'black';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                const thickness = 0.5;
                ctx.globalCompositeOperation = 'source-over';
                ctx.drawImage(canvas, thickness, 0);
                ctx.drawImage(canvas, -thickness, 0);
                ctx.drawImage(canvas, 0, thickness);
                ctx.drawImage(canvas, 0, -thickness);

                ctx.globalCompositeOperation = 'destination-over';
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                ctx.globalCompositeOperation = 'source-over';
                resolve(canvas.toDataURL('image/png'));
            } catch (error) {
                console.error("Error processing signature image:", error);
                resolve(null);
            }
        };
        img.onerror = (err) => {
            console.error("Failed to load signature image:", err);
            resolve(null);
        };
        img.src = whiteSignatureDataUrl;
    });
};

export const generateRapportinoPDF = async (rapportino: Rapportino, masterData: MasterData): Promise<Blob> => {

    const doc = new jsPDF('p', 'mm', 'a4');
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentWidth = pageWidth - (margin * 2);
    const middle = pageWidth / 2;
    let cursorY = margin;

    const COLOR_BLUE = '#0D47A1';
    const COLOR_GREY = '#424242';
    const COLOR_BLACK = '#000000';

    const addSeparatorLine = (y: number) => {
        doc.setDrawColor(COLOR_BLUE);
        doc.setLineWidth(0.5);
        doc.line(margin, y, pageWidth - margin, y);
        return y + 5;
    };

    const addText = (text: string | string[], x: number, y: number, options: any = {}) => {
        doc.text(text, x, y, options);
        const textHeight = Array.isArray(text) ? text.length * 4 : 5;
        return y + textHeight;
    };
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(COLOR_BLUE);
    cursorY = addText('Tecnologie Industriali Navali S.R.L.', pageWidth / 2, cursorY, { align: 'center' }) + 3;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(COLOR_BLACK);
    const companyInfo = [
        'Sede Legale: Via Guicciardini, 52-54 - cap 98121 Messina',
        'Tel 090358694 - cell. +39 3401649518 / +39 3460227234',
        'Cod. Fisc. e Part. I.V.A. : 02962480832 - e-mail: tin.srl2008@alice.it',
        'Impianti elettrici di bordo e di terra - Meccanica industriale e navale.'
    ];
    cursorY = addText(companyInfo, pageWidth / 2, cursorY, { align: 'center' });
    cursorY += 2;

    cursorY = addSeparatorLine(cursorY);
    cursorY += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(COLOR_BLUE);
    cursorY = addText('REPORT DI INTERVENTO TECNICO', pageWidth / 2, cursorY, { align: 'center' });
    cursorY += 5;
    
    const { navi = [], luoghi = [], veicoli = [], tipiGiornata = [] } = masterData;
    
    const dateObject = toDate(rapportino.data);
    const dataRapportino = dateObject ? format(dateObject, 'dd MMMM yyyy', { locale: it }) : 'N/D';

    const nave = rapportino.naveId === 'Nessuna' 
        ? 'Nessuna' 
        : navi.find(n => n.id === rapportino.naveId)?.nome || rapportino.naveId || '';

    const luogo = rapportino.luogoId === 'Nessuno'
        ? 'Nessuno'
        : luoghi.find(l => l.id === rapportino.luogoId)?.nome || rapportino.luogoId || '';

    const veicoloData = veicoli.find(v => v.id === rapportino.veicoloId);
    const veicolo = rapportino.veicoloId === 'Nessuno' 
        ? 'Nessuno' 
        : (veicoloData ? `${veicoloData.marca} ${veicoloData.modello} - ${veicoloData.targa}` : rapportino.veicoloId || '');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(COLOR_BLACK);

    const col1X = margin;
    const col2X = middle;
    const labelOffset = 35;

    let col1Y = cursorY;
    doc.setFont('helvetica', 'bold');
    doc.text('Data:', col1X, col1Y);
    doc.setFont('helvetica', 'normal');
    doc.text(dataRapportino, col1X + labelOffset, col1Y);
    col1Y += 7;

    doc.setFont('helvetica', 'bold');
    doc.text('Ordine di Lavoro:', col1X, col1Y);
    doc.setFont('helvetica', 'normal');
    doc.text(rapportino.ordineLavoro || 'N/D', col1X + labelOffset, col1Y);
    col1Y += 7;

    if (rapportino.trasfertaId) {
        const trasferta = tipiGiornata.find(t => t.id === rapportino.trasfertaId);
        if (trasferta) {
            doc.setFont('helvetica', 'bold');
            doc.text('Trasferta:', col1X, col1Y);
            doc.setFont('helvetica', 'normal');
            doc.text(trasferta.nome, col1X + labelOffset, col1Y);
            col1Y += 7;
        }
    }

    let col2Y = cursorY;
    doc.setFont('helvetica', 'bold');
    doc.text('Nave:', col2X, col2Y);
    doc.setFont('helvetica', 'normal');
    doc.text(nave, col2X + labelOffset, col2Y);
    col2Y += 7;

    doc.setFont('helvetica', 'bold');
    doc.text('Luogo:', col2X, col2Y);
    doc.setFont('helvetica', 'normal');
    doc.text(luogo, col2X + labelOffset, col2Y);
    col2Y += 7;

    doc.setFont('helvetica', 'bold');
    doc.text('Veicolo:', col2X, col2Y);
    doc.setFont('helvetica', 'normal');
    doc.text(veicolo, col2X + labelOffset, col2Y);
    col2Y += 7;

    cursorY = Math.max(col1Y, col2Y);

    cursorY = addSeparatorLine(cursorY) + 5;
    
    let totalHours = 0;
    const bodyData = (rapportino.dettaglioOreTecnici || []).map(dett => {
        const tecnico = masterData.tecnici.find(t => t.id === dett.tecnicoId);
        const nomeTecnico = tecnico ? `${tecnico.cognome} ${tecnico.nome}` : 'Sconosciuto';
        const oreTecnico = dett.ore || 0;
        totalHours += oreTecnico;
        
        let orario;
        if (dett.isManual || !dett.oraInizio || !dett.oraFine) {
            orario = 'Inserimento manuale';
        } else {
            const pausaText = (dett.pausa || 0) > 0 ? ` (Pausa: ${dett.pausa} min)` : '';
            orario = `${dett.oraInizio} - ${dett.oraFine}${pausaText}`;
        }
        
        return [nomeTecnico, orario, oreTecnico.toFixed(2)];
    });

    autoTable(doc, {
        startY: cursorY,
        head: [[
            { content: 'Tecnici Intervenuti', styles: { fillColor: COLOR_GREY, textColor: '#FFFFFF', halign: 'center' } },
            { content: 'Orari', styles: { fillColor: COLOR_GREY, textColor: '#FFFFFF', halign: 'center' } },
            { content: 'Ore', styles: { fillColor: COLOR_GREY, textColor: '#FFFFFF', halign: 'center' } }
        ]],
        body: bodyData,
        theme: 'grid',
        columnStyles: {
            0: { cellWidth: 'auto' },
            1: { cellWidth: 'auto' },
            2: { halign: 'right', cellWidth: 20 }
        },
        didDrawPage: (data) => {
            if (data.cursor) {
                cursorY = data.cursor.y;
            }
        }
    });
    cursorY = (doc as any).lastAutoTable.finalY;

    cursorY += 6;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(COLOR_GREY);
    doc.text(`Totale ore tecnici: ${totalHours.toFixed(2)}`, pageWidth - margin, cursorY, { align: 'right' });
    cursorY += 5;

    cursorY = addSeparatorLine(cursorY) + 5;

    const addWorkDetail = (label: string, content: string | undefined | null) => {
        if (cursorY > 250) { doc.addPage(); cursorY = margin; }
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(COLOR_GREY);
        doc.text(label, margin, cursorY);
        cursorY += 5;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(COLOR_BLACK);
        const lines = doc.splitTextToSize(content || '', contentWidth);
        doc.text(lines, margin, cursorY);
        cursorY += (lines.length * 4) + 5;
    };

    addWorkDetail('Breve Descrizione Lavoro', rapportino.descrizioneBreve);
    addWorkDetail('Materiali Impiegati', rapportino.materialiImpiegati);
    addWorkDetail('Lavoro Eseguito', rapportino.lavoroEseguito);

    const firmaSectionStartY = Math.max(cursorY, doc.internal.pageSize.getHeight() - 75);
    cursorY = addSeparatorLine(firmaSectionStartY);
    cursorY += 8;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(COLOR_BLACK);

    const col1X_firma = margin;
    let col1Y_firma = cursorY;
    doc.text('Per accettazione (firma del responsabile)', col1X_firma, col1Y_firma);
    col1Y_firma += 10;
    const nomeFirmatario = rapportino.firmaFirmatarioNome || '_________________';
    const societaFirmatario = rapportino.firmaFirmatarioSocieta || '_________________';
    doc.text(`Nome Firmatario: ${nomeFirmatario}`, col1X_firma, col1Y_firma);
    col1Y_firma += 7;
    doc.text(`Società: ${societaFirmatario}`, col1X_firma, col1Y_firma);
    col1Y_firma += 5;
    if (rapportino.firmaVettoriale) {
        const processedSignature = await processSignatureForPdf(rapportino.firmaVettoriale);
        if (processedSignature) {
            doc.addImage(processedSignature, 'PNG', col1X_firma, col1Y_firma, 50, 20);
        }
    }

    const col2X_firma = pageWidth / 2 + 15;
    let col2Y_firma = cursorY;
    const tecnicoScrivente = masterData.tecnici.find(t => t.id === rapportino.tecnicoId);
    const nomeTecnicoScrivente = tecnicoScrivente ? `${tecnicoScrivente.cognome} ${tecnicoScrivente.nome}` : '';
    doc.text('Firma Tecnico Responsabile', col2X_firma, col2Y_firma);
    col2Y_firma += 10;
    doc.text(nomeTecnicoScrivente, col2X_firma, col2Y_firma);
    
    return doc.output('blob');
};
