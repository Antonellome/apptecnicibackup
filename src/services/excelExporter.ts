import * as XLSX from 'xlsx';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSunday } from 'date-fns';
import { it } from 'date-fns/locale';
import { RisultatoCalcoloGiornaliero, SaldiContatori } from '@/models/definitions';
import { strutturaPaga } from '@/config/payrollStructure';

const getStyledSheet = (
    sheetData: (string | number | null)[][],
    colWidths: { wch: number }[],
    title: string,
    daysInMonth?: Date[]
) => {
    const dataWithTitle = [
        [title], 
        [], 
        ...sheetData
    ];
    const ws = XLSX.utils.aoa_to_sheet(dataWithTitle);

    const styles = {
        title: { font: { name: 'Calibri', sz: 18, color: { rgb: "0D47A1" }, bold: true }, alignment: { horizontal: 'center', vertical: 'center' } },
        header: { font: { name: 'Calibri', sz: 12, color: { rgb: "1565C0" }, bold: true }, alignment: { horizontal: 'center' } },
        rowHeader: { font: { name: 'Calibri', sz: 11, color: { rgb: "1565C0" }, bold: false }, alignment: { horizontal: 'left'} },
        sectionHeader: { font: { name: 'Calibri', sz: 13, color: { rgb: "0D47A1" }, bold: true }, fill: { fgColor: { rgb: "E3F2FD" } }, alignment: { horizontal: 'center' } },
        data: { font: { name: 'Calibri', sz: 11, color: { rgb: "000000" } }, alignment: { horizontal: 'center' } },
        weeklySeparator: { border: { right: { style: 'medium', color: { rgb: "1565C0" } } } },
        totalLabel: { font: { name: 'Calibri', sz: 11, color: { rgb: "0D47A1" }, bold: true } },
        totalValue: { font: { name: 'Calibri', sz: 11, color: { rgb: "000000" }, bold: true }, alignment: { horizontal: 'right' } },
        footer: { font: { name: 'Calibri', sz: 11, bold: true }, alignment: { horizontal: 'center' }, border: { top: { style: 'thin', color: { rgb: "000000" } } } },
    };

    const sheetRange = XLSX.utils.decode_range(ws['!ref']!);
    const titleMerge = { s: { r: 0, c: 0 }, e: { r: 0, c: sheetRange.e.c } };
    if (!ws['!merges']) ws['!merges'] = [];
    ws['!merges'].push(titleMerge);
    if (ws['A1']) ws['A1'].s = styles.title;

    const headerRowIndex1 = 2;
    const headerRowIndex2 = 3;
    const dataStartIndex = 4;

    for (let R = headerRowIndex1; R <= sheetRange.e.r; R++) {
        for (let C = 0; C <= sheetRange.e.c; C++) {
            const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
            const cell = ws[cellRef];
            if (!cell || cell.v === null || cell.v === '') continue;

            if (R === headerRowIndex1 || R === headerRowIndex2) {
                if(cell.v) cell.s = styles.header;
            } else if (R >= dataStartIndex) {
                if (C === 0) {
                     if (typeof cell.v === 'string' && cell.v === cell.v.toUpperCase() && isNaN(Number(cell.v))) {
                        cell.s = styles.sectionHeader;
                        const sectionMerge = { s: { r: R, c: 0 }, e: { r: R, c: sheetRange.e.c } };
                        ws['!merges'].push(sectionMerge);
                    } else {
                       if(cell.v === 'TOTALI') {
                           cell.s = styles.footer;
                       } else {
                           cell.s = styles.rowHeader;
                       }
                    }
                } else {
                    if (ws[XLSX.utils.encode_cell({r:R, c:0})]?.v === 'TOTALI') {
                         cell.s = styles.footer;
                    } else {
                         cell.s = styles.data;
                    }
                }
            }
        }
    }
    
    if (daysInMonth) {
        daysInMonth.forEach((day, index) => {
            if (isSunday(day) && index < daysInMonth.length - 1) {
                const colIndex = index + 1;
                for (let R = headerRowIndex1; R <= sheetRange.e.r; ++R) {
                     const cellRef = XLSX.utils.encode_cell({ r: R, c: colIndex });
                     if (!ws[cellRef]) ws[cellRef] = {t:'s', v:''};
                     if (!ws[cellRef].s) ws[cellRef].s = {};
                     ws[cellRef].s.border = styles.weeklySeparator.border;
                }
            }
        });
    }

    if (!daysInMonth) {
         for (let R = dataStartIndex -1; R <= sheetRange.e.r; R++) {
            const cellRefA = XLSX.utils.encode_cell({ r: R, c: 0 });
            const cellA = ws[cellRefA];
            if (cellA && typeof cellA.v === 'string') {
                 if (cellA.v.includes('Tabella') || cellA.v.includes('Contatori')) {
                     cellA.s = styles.sectionHeader;
                     const merge = { s: { r: R, c: 0 }, e: { r: R, c: 3 } };
                     if(!ws['!merges']) ws['!merges'] = [];
                     ws['!merges'].push(merge);
                 } else if (cellA.v) {
                     ws[cellRefA].s = styles.totalLabel;
                 }
            }
            for (let C = 1; C <= sheetRange.e.c; C++) {
                 const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
                 if(ws[cellRef]) ws[cellRef].s = styles.totalValue;
            }
         }
    }

    ws['!cols'] = colWidths;
    ws['!rows'] = [{ hpt: 30 }]; 

    return ws;
};

export const exportDatiToExcel = (
    risultati: RisultatoCalcoloGiornaliero[],
    totaliMensili: { [key: string]: number },
    saldiFinali: SaldiContatori,
    saldiIniziali: SaldiContatori,
    currentMonth: Date,
    nomeDipendente: string
) => {
    const monthName = format(currentMonth, 'MMMM yyyy', { locale: it });
    const daysInMonth = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });

    // --- Foglio 1: Dettaglio Orario ---
    const sheet1Title = `Dettaglio Orario - ${nomeDipendente} - ${monthName}`;
    const headerRow1 = ['Voce', ...daysInMonth.map(d => format(d, 'E', { locale: it }).charAt(0)), 'Totale'];
    const headerRow2 = ['', ...daysInMonth.map(d => format(d, 'd')), ''];
    
    const bodyRows1: (string | number)[][] = [];
    strutturaPaga.forEach(sezione => {
        const sectionHasData = sezione.voci.some(voce =>
            risultati.some(giorno => (giorno[voce.id as keyof RisultatoCalcoloGiornaliero] as number || 0) > 0)
        );
        if (sectionHasData) {
            bodyRows1.push([sezione.titolo.toUpperCase()]);
            sezione.voci.forEach(voce => {
                 const rowHasData = risultati.some(giorno => (giorno[voce.id as keyof RisultatoCalcoloGiornaliero] as number || 0) > 0);
                 if (rowHasData) {
                    const rowData: (string | number)[] = [voce.label];
                    let rowTotal = 0;
                    daysInMonth.forEach(day => {
                        const giornoDati = risultati.find(r => r.data === format(day, 'yyyy-MM-dd'));
                        const value = giornoDati ? (giornoDati[voce.id as keyof RisultatoCalcoloGiornaliero] as number || 0) : 0;
                        rowData.push(value > 0 ? value.toFixed(2) : '-');
                        rowTotal += value;
                    });
                    rowData.push(rowTotal > 0 ? rowTotal.toFixed(2) : '-');
                    bodyRows1.push(rowData);
                 }
            });
        }
    });
    
    // Footer Row with Totals
    const footerRow: (string | number)[] = ['TOTALI'];
    const columnTotals: number[] = new Array(daysInMonth.length).fill(0);
    let grandTotal = 0;

    strutturaPaga
      .flatMap(s => s.voci)
      .forEach(voce => {
        const isPayrollHour = voce.id !== 'debitoOrario' && voce.id !== 'permessoNonRetribuito'; // Definizione di ora in busta paga
        if (isPayrollHour) {
             grandTotal += totaliMensili[voce.id] || 0;
        }

        daysInMonth.forEach((day, index) => {
            const giornoDati = risultati.find(r => r.data === format(day, 'yyyy-MM-dd'));
            const value = giornoDati ? (giornoDati[voce.id as keyof RisultatoCalcoloGiornaliero] as number || 0) : 0;
            if (isPayrollHour) {
                columnTotals[index] += value;
            }
        });
    });

    columnTotals.forEach(total => footerRow.push(total > 0 ? total.toFixed(2) : '-'));
    footerRow.push(grandTotal > 0 ? grandTotal.toFixed(2) : '-');

    bodyRows1.push([]); // Empty separator row
    bodyRows1.push(footerRow);

    const colWidths1 = [{ wch: 35 }, ...daysInMonth.map(() => ({ wch: 5 })), {wch: 10}];
    const ws1 = getStyledSheet([headerRow1, headerRow2, ...bodyRows1], colWidths1, sheet1Title, daysInMonth);

    // --- Foglio 2: Riepilogo e Saldi ---
    const sheet2Title = `Riepilogo e Saldi - ${nomeDipendente} - ${monthName}`;
    const bodyRows2: (string | number | null)[][] = [];
    bodyRows2.push(['Tabella Totali Mensili']);
    bodyRows2.push(['Voce', 'Totale']);
    strutturaPaga.forEach(sezione => {
        const sectionHasData = sezione.voci.some(v => (totaliMensili[v.id] || 0) > 0);
        if (sectionHasData) {
            bodyRows2.push([sezione.titolo.toUpperCase()]);
            sezione.voci.forEach(voce => {
                const total = totaliMensili[voce.id] || 0;
                if (total > 0) {
                    bodyRows2.push([voce.label, total.toFixed(2)]);
                }
            });
        }
    });
    
    // Grand Total in Riepilogo
    bodyRows2.push([]);
    bodyRows2.push(['RIEPILOGO GENERALE']);
    bodyRows2.push(['Totale Ore Busta Paga', grandTotal.toFixed(2)]);


    bodyRows2.push([null]); // Riga vuota per separare
    bodyRows2.push(['Contatori e Saldi Residui']);
    bodyRows2.push(['Contatore', 'Saldo Iniziale', 'Utilizzato nel Mese', 'Saldo Finale']);
    bodyRows2.push(['Ferie', `${saldiIniziali.ferie.toFixed(2)}h`, `-${(totaliMensili.ferieScalate || 0).toFixed(2)}h`, `${saldiFinali.ferie.toFixed(2)}h`]);
    bodyRows2.push(['ROL', `${saldiIniziali.rol.toFixed(2)}h`, `-${(totaliMensili.rolScalati || 0).toFixed(2)}h`, `${saldiFinali.rol.toFixed(2)}h`]);
    bodyRows2.push(['Ex Festività', `${saldiIniziali.exFestivita.toFixed(2)}h`, `-${(totaliMensili.exFestivitaScalate || 0).toFixed(2)}h`, `${saldiFinali.exFestivita.toFixed(2)}h`]);
    bodyRows2.push(['Permessi L. 104', '24.00h', `-${(totaliMensili.legge104Scalate || 0).toFixed(2)}h`, '24.00h' ]);


    const colWidths2 = [{ wch: 25 }, { wch: 15 }, { wch: 20 }, { wch: 15 }];
    const ws2 = getStyledSheet(bodyRows2, colWidths2, sheet2Title);
    
    // --- Crea Workbook e Blob ---
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, 'Dettaglio Orario');
    XLSX.utils.book_append_sheet(wb, ws2, 'Riepilogo e Saldi');

    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });

    const fileName = `Riepilogo_Dati_${nomeDipendente}_${format(currentMonth, 'MMMM_yyyy', { locale: it })}.xlsx`;

    return { blob, fileName };
};
