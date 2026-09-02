# Specifiche del Report PDF

**Data:** 24 Maggio 2024
**Versione:** 1.4

Questo documento descrive la struttura e la logica di generazione del PDF per il rapporto di intervento tecnico. È stato aggiornato per riflettere la correzione di un bug critico di sovrascrittura e l'implementazione corretta della paginazione dinamica.

## Struttura del PDF e Gestione Contenuti

Il PDF è progettato per essere professionale e leggibile, con una gestione intelligente dello spazio per descrizioni lunghe.

### Correzione Critica (Versione 1.4)

La versione precedente del generatore conteneva un errore logico grave che causava la sovrascrittura delle sezioni "Breve Descrizione Lavoro", "Materiali Impiegati" e "Lavoro Eseguito" una sopra l'altra. L'errore derivava da una gestione errata del posizionamento verticale (`cursorY`).

**La logica è stata corretta:** ora il posizionamento verticale viene aggiornato in modo incrementale dopo la scrittura di ogni blocco di testo, garantendo un layout sequenziale e corretto senza sovrapposizioni.

### Layout della Prima Pagina

La prima pagina del report contiene sempre i seguenti elementi, in ordine sequenziale:

1.  **Intestazione Aziendale.**
2.  **Titolo:** "RAPPORTO DI INTERVENTO TECNICO".
3.  **Dati Principali:** Data, Nave/Impianto, Luogo e Veicolo.
4.  **Tabella Tecnici:** Elenco dei tecnici intervenuti e i loro orari.
5.  **Breve Descrizione Lavoro.**
6.  **Materiali Impiegati.**
7.  **Lavoro Eseguito (Inizio):** La prima parte della descrizione, fino a riempire lo spazio disponibile.

### Gestione Automatica della Seconda Pagina (Overflow)

- **Creazione Automatica:** Se il testo del "Lavoro Eseguito" è troppo lungo, il sistema crea automaticamente una seconda pagina.
- **Layout della Seconda Pagina:** Contiene l'intestazione, il titolo "SEGUITO LAVORO ESEGUITO", e il testo rimanente.
- **Elementi Fissi:** Le firme e la numerazione di pagina sono sempre presenti in fondo a **ogni** pagina.

## Codice Sorgente Corretto

Di seguito il codice sorgente `rapportinoPDFGenerator.ts` che implementa la logica corretta.

```typescript
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Rapportino, MasterData } from '@/models/definitions';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const processSignatureForPdf = (whiteSignatureDataUrl: string): Promise<string | null> => {
    return new Promise((resolve) => {
        if (!whiteSignatureDataUrl || typeof whiteSignatureDataUrl !== 'string') {
            resolve(null);
            return;
        }
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve(null);
                return;
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
        img.onerror = () => resolve(null);
        img.src = whiteSignatureDataUrl;
    });
};

export const generateRapportinoPDF = async (rapportino: Rapportino, masterData: MasterData): Promise<Blob> => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);
    const footerHeight = 65;

    const COLOR_BLUE = '#0D47A1';
    const COLOR_GREY = '#424242';
    const COLOR_BLACK = '#000000';

    const processedSignature = rapportino.firmaVettoriale
        ? await processSignatureForPdf(rapportino.firmaVettoriale)
        : null;

    const drawHeader = (y: number) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.setTextColor(COLOR_BLUE);
        doc.text('Tecnologie Industriali Navali S.R.L.', pageWidth / 2, y, { align: 'center' });
        y += 8;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(COLOR_BLACK);
        const companyInfo = [
            'Sede Legale: Via Guicciardini, 52-54 - cap 98121 Messina',
            'Tel 090358694 - cell. +39 3401649518 / +39 3460227234',
            'Cod. Fisc. e Part. I.V.A. : 02962480832 - e-mail: tin.srl2008@alice.it',
            'Impianti elettrici di bordo e di terra - Meccanica industriale e navale.'
        ];
        doc.text(companyInfo, pageWidth / 2, y, { align: 'center' });
        return y + 12;
    };

    const drawSignaturesAndFooter = (pageNumber: number, totalPages: number) => {
        const startY = pageHeight - footerHeight + 10;
        let y = startY;

        doc.setDrawColor(COLOR_BLUE);
        doc.setLineWidth(0.5);
        doc.line(margin, y, pageWidth - margin, y);
        y += 8;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(COLOR_BLACK);

        const col1X = margin;
        let col1Y = y;
        doc.text('Per accettazione (firma del responsabile)', col1X, col1Y);
        col1Y += 7;
        const nomeFirmatario = rapportino.firmaFirmatarioNome || '_________________';
        const societaFirmatario = rapportino.firmaFirmatarioSocieta || '_________________';
        doc.text(`Nome Firmatario: ${nomeFirmatario}`, col1X, col1Y);
        col1Y += 7;
        doc.text(`Società: ${societaFirmatario}`, col1X, col1Y);
        col1Y += 5;
        if (processedSignature) {
            doc.addImage(processedSignature, 'PNG', col1X, col1Y, 50, 20);
        }

        const col2X = pageWidth / 2 + 15;
        let col2Y = y;
        const tecnicoScrivente = masterData.tecnici.find(t => t.id === rapportino.tecnicoId);
        const nomeTecnicoScrivente = tecnicoScrivente ? `${tecnicoScrivente.cognome} ${tecnicoScrivente.nome}` : '';
        doc.text('Firma Tecnico Responsabile', col2X, col2Y);
        col2Y += 7;
        doc.text(nomeTecnicoScrivente, col2X, col2Y);

        doc.setFontSize(8);
        doc.setTextColor(COLOR_GREY);
        doc.text(`Pagina ${pageNumber} di ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    };

    const addTitledText = (currentY: number, label: string, content: string | undefined | null) => {
        let y = currentY;
        const textLines = doc.splitTextToSize(content || '', contentWidth);
        const titleHeight = 5;
        const separatorHeight = 5;
        const contentSpacing = 5;
        const lineHeight = 4;
        
        const availableHeight = pageHeight - y - footerHeight;
        if (availableHeight < 20) { // Not enough space to start a new section
             return { y, remainingLines: textLines };
        }

        doc.setDrawColor(COLOR_BLUE);
        doc.setLineWidth(0.5);
        doc.line(margin, y, pageWidth - margin, y);
        y += separatorHeight;

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(COLOR_GREY);
        doc.text(label, margin, y);
        y += titleHeight;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(COLOR_BLACK);
        
        const spaceForLines = Math.floor((pageHeight - y - footerHeight) / lineHeight);
        const linesToDraw = textLines.slice(0, spaceForLines);
        const remainingLines = textLines.slice(spaceForLines);

        if (linesToDraw.length > 0) {
             doc.text(linesToDraw, margin, y);
             y += (linesToDraw.length * lineHeight);
        }

        y += contentSpacing;

        return { y, remainingLines };
    };

    // --- PAGINA 1 --- 
    let cursorY = margin;
    cursorY = drawHeader(cursorY);

    doc.setDrawColor(COLOR_BLUE);
    doc.setLineWidth(0.5);
    doc.line(margin, cursorY, pageWidth - margin, cursorY);
    cursorY += 7;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(COLOR_BLUE);
    doc.text('RAPPORTO DI INTERVENTO TECNICO', pageWidth / 2, cursorY, { align: 'center' });
    cursorY += 10;
    
    const { navi = [], luoghi = [], veicoli = [] } = masterData;
    const dateObject = rapportino.data ? new Date((rapportino.data as any).seconds * 1000 || rapportino.data) : null;
    const dataRapportino = dateObject ? format(dateObject, 'dd MMMM yyyy', { locale: it }) : 'N/D';
    const nave = navi.find(n => n.id === rapportino.naveId)?.nome || rapportino.naveId || 'Nessuna';
    const luogo = luoghi.find(l => l.id === rapportino.luogoId)?.nome || rapportino.luogoId || 'Nessuno';
    const veicoloData = veicoli.find(v => v.id === rapportino.veicoloId);
    const veicolo = veicoloData ? `${veicoloData.marca} ${veicoloData.modello} - ${veicoloData.targa}` : (rapportino.veicoloId || 'Nessuno');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(COLOR_BLACK);
    const initialData = [
        { label: 'Data', value: dataRapportino },
        { label: 'Nave/Impianto', value: nave },
        { label: 'Luogo', value: luogo },
        { label: 'Veicolo', value: veicolo },
    ];
    initialData.forEach(item => {
        doc.setFont('helvetica', 'bold');
        doc.text(`${item.label}:`, margin, cursorY);
        doc.setFont('helvetica', 'normal');
        doc.text(item.value || '', margin + 40, cursorY);
        cursorY += 7;
    });
    cursorY += 3;

    doc.setDrawColor(COLOR_BLUE);
    doc.setLineWidth(0.5);
    doc.line(margin, cursorY, pageWidth - margin, cursorY);
    cursorY += 5;
    autoTable(doc, {
        startY: cursorY,
        head: [[{ content: 'Tecnici Intervenuti', styles: { fillColor: COLOR_GREY } }, { content: 'Orari', styles: { fillColor: COLOR_GREY } }]],
        body: (rapportino.dettaglioOreTecnici || []).map(dett => {
            const tecnico = masterData.tecnici.find(t => t.id === dett.tecnicoId);
            const nomeTecnico = tecnico ? `${tecnico.cognome} ${tecnico.nome}` : 'Sconosciuto';
            const orario = (dett.isManual || !dett.oraInizio || !dett.oraFine)
                ? `${(dett.ore || 0).toFixed(2)} ore`
                : `${dett.oraInizio} - ${dett.oraFine}${(dett.pausa || 0) > 0 ? ` (Pausa: ${dett.pausa} min)` : ''}`;
            return [nomeTecnico, orario];
        }),
        theme: 'grid',
    });
    cursorY = (doc as any).lastAutoTable.finalY;

    const resDesc = addTitledText(cursorY, 'Breve Descrizione Lavoro', rapportino.descrizioneBreve);
    cursorY = resDesc.y;

    const resMat = addTitledText(cursorY, 'Materiali Impiegati', rapportino.materialiImpiegati);
    cursorY = resMat.y;

    const { y, remainingLines } = addTitledText(cursorY, 'Lavoro Eseguito', rapportino.lavoroEseguito);
    cursorY = y;

    if (remainingLines.length > 0 || resDesc.remainingLines.length > 0 || resMat.remainingLines.length > 0) {
        doc.addPage();
        let cursorY2 = margin;
        cursorY2 = drawHeader(cursorY2);

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(COLOR_GREY);
        doc.text("SEGUITO", margin, cursorY2);
        cursorY2 += 7;
        
        const allRemainingLines = [...resDesc.remainingLines, ...resMat.remainingLines, ...remainingLines];

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(COLOR_BLACK);
        doc.text(allRemainingLines, margin, cursorY2);
    }
    
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        drawSignaturesAndFooter(i, totalPages);
    }

    return doc.output('blob');
};
```
