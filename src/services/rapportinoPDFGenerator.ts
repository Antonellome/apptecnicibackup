
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Rapportino, MasterData } from '@/models/definitions';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

// --- Funzione per generare il PDF --- 
export const generateRapportinoPDF = async (rapportino: Rapportino, masterData: MasterData): Promise<Blob> => {

    const doc = new jsPDF('p', 'mm', 'a4');
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentWidth = pageWidth - (margin * 2);
    let cursorY = margin;

    // --- DEFINIZIONE COLORI ---
    const COLOR_BLUE = '#0D47A1';
    const COLOR_GREY = '#424242';
    const COLOR_BLACK = '#000000';

    // --- FUNZIONI HELPER ---
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
    
    // --- 1. INTESTAZIONE AZIENDALE ---
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

    // --- 2. PRIMO SEPARATORE E TITOLO ---
    cursorY = addSeparatorLine(cursorY);
    cursorY += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(COLOR_BLUE);
    cursorY = addText('RAPPORTO DI INTERVENTO TECNICO', pageWidth / 2, cursorY, { align: 'center' });
    cursorY += 5;
    
    // --- 3. DATI INIZIALI ---
    const { navi = [], luoghi = [], veicoli = [] } = masterData;
    const dataRapportino = rapportino.data ? format(rapportino.data.toDate(), 'dd MMMM yyyy', { locale: it }) : 'N/D';
    const nave = navi.find(n => n.id === rapportino.naveId)?.nome || 'N/D';
    const luogo = luoghi.find(l => l.id === rapportino.luogoId)?.nome || 'N/D';
    const veicoloData = veicoli.find(v => v.id === rapportino.veicoloId);
    const veicolo = veicoloData ? `${veicoloData.marca} ${veicoloData.modello} - ${veicoloData.targa}` : 'N/D';
    
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
        doc.text(item.value, margin + 40, cursorY);
        cursorY += 7;
    });

    // --- 4. SECONDO SEPARATORE E TABELLA TECNICI ---
    cursorY = addSeparatorLine(cursorY) + 5;
    
    autoTable(doc, {
        startY: cursorY,
        head: [[{
            content: 'Tecnici Intervenuti',
            styles: { fillColor: COLOR_GREY, textColor: '#FFFFFF', halign: 'center' }
        }, {
            content: 'Orari',
            styles: { fillColor: COLOR_GREY, textColor: '#FFFFFF', halign: 'center' }
        }]],
        body: rapportino.dettaglioOreTecnici.map(dett => {
            const tecnico = masterData.tecnici.find(t => t.id === dett.tecnicoId);
            const nomeTecnico = tecnico ? `${tecnico.cognome} ${tecnico.nome}` : 'Sconosciuto';
            const orario = (dett.isManual || !dett.oraInizio || !dett.oraFine) 
                ? `${(dett.ore || 0).toFixed(2)} ore` 
                : `${dett.oraInizio} - ${dett.oraFine}`;
            return [nomeTecnico, orario];
        }),
        theme: 'grid',
        didDrawPage: (data) => {
            cursorY = data.cursor.y;
        }
    });
    cursorY = (doc as any).lastAutoTable.finalY + 5;

    // --- 5. TERZO SEPARATORE E DETTAGLI LAVORO ---
    cursorY = addSeparatorLine(cursorY) + 5;

    const addWorkDetail = (label: string, content: string) => {
        if (cursorY > 250) { doc.addPage(); cursorY = margin; }
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(COLOR_GREY);
        doc.text(label, margin, cursorY);
        cursorY += 5;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(COLOR_BLACK);
        const lines = doc.splitTextToSize(content || 'N/D', contentWidth);
        doc.text(lines, margin, cursorY);
        cursorY += (lines.length * 4) + 5;
    };

    addWorkDetail('Breve Descrizione Lavoro', rapportino.descrizioneBreve);
    addWorkDetail('Materiali Impiegati', rapportino.materialiImpiegati);
    addWorkDetail('Lavoro Eseguito', rapportino.lavoroEseguito);

    // --- 6. QUARTO SEPARATORE E SEZIONE FIRMA ---
    const firmaSectionStartY = Math.max(cursorY, doc.internal.pageSize.getHeight() - 75);
    cursorY = addSeparatorLine(firmaSectionStartY);
    cursorY += 8;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(COLOR_BLACK);

    // Colonna 1: Firma Cliente
    const col1X = margin;
    let col1Y = cursorY;
    doc.text('Per accettazione (firma del responsabile)', col1X, col1Y);
    col1Y += 10;
    const nomeFirmatario = rapportino.firmaFirmatarioNome || '_________________';
    const societaFirmatario = rapportino.firmaFirmatarioSocieta || '_________________';
    doc.text(`Nome Firmatario: ${nomeFirmatario}`, col1X, col1Y);
    col1Y += 7;
    doc.text(`Società: ${societaFirmatario}`, col1X, col1Y);
    col1Y += 5;
    if (rapportino.firmaVettoriale) {
         doc.addImage(rapportino.firmaVettoriale, 'PNG', col1X, col1Y, 50, 20);
    }

    // Colonna 2: Firma Tecnico
    const col2X = pageWidth / 2 + 15;
    let col2Y = cursorY;
    const tecnicoScrivente = masterData.tecnici.find(t => t.id === rapportino.tecnicoId);
    const nomeTecnicoScrivente = tecnicoScrivente ? `${tecnicoScrivente.cognome} ${tecnicoScrivente.nome}` : 'N/D';
    doc.text('Firma Tecnico Responsabile', col2X, col2Y);
    col2Y += 10;
    doc.text(nomeTecnicoScrivente, col2X, col2Y);
    
    // --- FINE E OUTPUT ---
    return doc.output('blob');
};
