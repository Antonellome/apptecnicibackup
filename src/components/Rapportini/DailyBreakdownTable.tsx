import { Paper, Typography, Box, Table, TableBody, TableCell, TableContainer, TableRow, TableHead, TableFooter } from '@mui/material';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { EnrichedRapportino } from '@/models/definitions';
import { useMemo } from 'react';

const abbreviate = (name: string): string => {
    if (!name) return '';
    const lower = name.toLowerCase();
    if (lower.includes('ordinario')) return 'Ord.';
    if (lower.includes('straordinario')) return 'Straord.';
    if (lower.includes('legge 104')) return 'L.104';
    if (lower.includes('festivo')) return 'Fest.';
    if (lower.includes('ferie')) return 'Ferie';
    if (lower.includes('permesso')) return 'Perm.';
    return name.substring(0, 4) + '.';
}

interface ProcessedReportRow {
    id: string;
    isFirstOfDate: boolean;
    date: Date;
    activityDescription: string;
    oreOrdinarie: number;
    oreStraordinarie: number;
    altreOre: Record<string, number>;
}

const DailyBreakdownTable = ({ rapportini }: { rapportini: EnrichedRapportino[] }) => {

  const { processedRows, totals, otherHourTypes, grandTotal } = useMemo(() => {
    if (!rapportini || rapportini.length === 0) {
      return { processedRows: [], totals: { oreOrdinarie: 0, oreStraordinarie: 0, altreOre: {} }, otherHourTypes: [], grandTotal: 0 };
    }

    const sortedRapportini = [...rapportini].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

    const allOtherTypes = new Set<string>();
    sortedRapportini.forEach(r => {
        const tipoNome = r.tipoGiornata?.nome || 'N/A';
        if (!tipoNome.toLowerCase().includes('ordinaria') && !tipoNome.toLowerCase().includes('straordinario')) {
            allOtherTypes.add(tipoNome);
        }
    });
    const sortedOtherHourTypes = Array.from(allOtherTypes).sort();

    const finalRows: ProcessedReportRow[] = [];
    const dailyOrdinaryHours: Record<string, number> = {};
    let lastDate = '';

    for (const report of sortedRapportini) {
        const dayKey = format(report.data, 'yyyy-MM-dd');
        if (!dailyOrdinaryHours[dayKey]) {
            dailyOrdinaryHours[dayKey] = 0;
        }

        const isFirst = dayKey !== lastDate;
        lastDate = dayKey;

        const row: ProcessedReportRow = {
            id: report.id,
            isFirstOfDate: isFirst,
            date: report.data,
            activityDescription: `${report.tipoGiornata?.nome || 'N/D'} ${report.naveNome ? `(${report.naveNome})` : ''}`,
            oreOrdinarie: 0,
            oreStraordinarie: 0,
            altreOre: {},
        };

        const tipoNome = report.tipoGiornata?.nome || 'N/A';
        const oreGiorno = report.oreGiorno;

        if (tipoNome.toLowerCase().includes('ordinaria')) {
            const availableOrdinary = 8 - dailyOrdinaryHours[dayKey];
            const ordinaryPart = Math.max(0, Math.min(oreGiorno, availableOrdinary));
            const overtimePart = Math.max(0, oreGiorno - ordinaryPart);

            row.oreOrdinarie = ordinaryPart;
            row.oreStraordinarie = overtimePart;
            dailyOrdinaryHours[dayKey] += ordinaryPart;
        } else if (tipoNome.toLowerCase().includes('straordinario')) {
            row.oreStraordinarie = oreGiorno;
        } else {
            row.altreOre[tipoNome] = (row.altreOre[tipoNome] || 0) + oreGiorno;
        }
        finalRows.push(row);
    }

    const finalTotals = finalRows.reduce((acc, row) => {
        acc.oreOrdinarie += row.oreOrdinarie;
        acc.oreStraordinarie += row.oreStraordinarie;
        for (const key in row.altreOre) {
            acc.altreOre[key] = (acc.altreOre[key] || 0) + row.altreOre[key];
        }
        return acc;
    }, { oreOrdinarie: 0, oreStraordinarie: 0, altreOre: {} as Record<string, number> });

    const calculatedGrandTotal = finalTotals.oreOrdinarie + finalTotals.oreStraordinarie + Object.values(finalTotals.altreOre).reduce((a, b) => a + b, 0);

    return { processedRows: finalRows, totals: finalTotals, otherHourTypes: sortedOtherHourTypes, grandTotal: calculatedGrandTotal };
  }, [rapportini]);

  const getCellStyle = (isFirst: boolean, index: number) => {
    const style: React.CSSProperties = {
        backgroundColor: '#212121',
        color: '#fff',
        border: 'none'
    };
    if (isFirst && index > 0) {
        style.borderTop = '1px solid blue';
    }
    return style;
  }

  const totalColumns = 2 + 2 + otherHourTypes.length;

  return (
    <Paper elevation={3} sx={{ mt: 3, overflowX: 'auto', backgroundColor: '#212121' }}>
      <Typography variant="h6" gutterBottom sx={{ p: 2, color: '#fff' }}>Dettaglio Giornaliero</Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& > th': { fontWeight: 'bold', backgroundColor: '#333', color: '#fff' } }}>
              <TableCell>Giorno</TableCell>
              <TableCell>Attività</TableCell>
              <TableCell align="right">Ord.</TableCell>
              <TableCell align="right">Straord.</TableCell>
              {otherHourTypes.map(tipo => <TableCell key={tipo} align="right">{abbreviate(tipo)}</TableCell>)}
            </TableRow>
          </TableHead>
          <TableBody>
            {processedRows.map((row, index) => (
              <TableRow key={row.id}>
                 <TableCell style={getCellStyle(row.isFirstOfDate, index)}>
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="body2" sx={{fontWeight: 'bold', color: '#fff'}}>{format(new Date(row.date), 'dd/MM')}</Typography>
                        <Typography variant="caption" sx={{ color: '#ccc' }}>{format(new Date(row.date), 'eee', { locale: it })}.</Typography>
                    </Box>
                </TableCell>
                <TableCell style={getCellStyle(row.isFirstOfDate, index)}>
                    <Typography variant="caption" sx={{ color: '#fff' }}>{row.activityDescription}</Typography>
                </TableCell>
                <TableCell align="right" style={getCellStyle(row.isFirstOfDate, index)}><Typography variant="body2" sx={{ color: '#fff' }}>{row.oreOrdinarie > 0 ? row.oreOrdinarie.toFixed(2) : '-'}</Typography></TableCell>
                <TableCell align="right" style={getCellStyle(row.isFirstOfDate, index)}><Typography variant="body2" sx={{ color: '#fff' }}>{row.oreStraordinarie > 0 ? row.oreStraordinarie.toFixed(2) : '-'}</Typography></TableCell>
                {otherHourTypes.map(tipo => (
                    <TableCell key={tipo} align="right" style={getCellStyle(row.isFirstOfDate, index)}>
                        <Typography variant="body2" sx={{ color: '#fff' }}>{(row.altreOre[tipo] && row.altreOre[tipo] > 0) ? (row.altreOre[tipo]).toFixed(2) : '-'}</Typography>
                    </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow sx={{ '& > *': { borderTop: '2px solid black', fontWeight: 'bold', backgroundColor: '#333', color: '#fff' } }}>
                <TableCell colSpan={2}><Typography variant="subtitle2">TOTALI</Typography></TableCell>
                <TableCell align="right"><Typography variant="subtitle2">{totals.oreOrdinarie.toFixed(2)}</Typography></TableCell>
                <TableCell align="right"><Typography variant="subtitle2">{totals.oreStraordinarie.toFixed(2)}</Typography></TableCell>
                {otherHourTypes.map(tipo => <TableCell key={tipo} align="right"><Typography variant="subtitle2">{(totals.altreOre[tipo] || 0).toFixed(2)}</Typography></TableCell>)}
            </TableRow>
            <TableRow sx={{ '& > *': { fontWeight: 'bold', backgroundColor: '#212121', color: '#fff' } }}>
                <TableCell colSpan={totalColumns} align="center">
                    <Typography variant="h6" sx={{ fontWeight: 'bold', p: 1 }}>
                        TOTALE ORE MESE: {grandTotal.toFixed(2)}
                    </Typography>
                </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default DailyBreakdownTable;
