import { Paper, Typography, Box, Table, TableBody, TableCell, TableContainer, TableRow, TableHead, TableFooter } from '@mui/material';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { EnrichedRapportino } from '@/models/definitions';
import { useMemo } from 'react';
import { toDateSafe as toDate } from '@/lib/date-utils';

const abbreviate = (name: string): string => {
    if (!name) return '';
    const lower = name.toLowerCase();
    if (lower.includes('straordinario')) return 'Straord.';
    if (lower.includes('ordinario')) return 'Ord.';
    if (lower.includes('legge 104')) return 'L.104';
    if (lower.includes('festivo')) return 'Fest.';
    if (lower.includes('ferie')) return 'Ferie';
    if (lower.includes('permesso')) return 'Perm.';
    return name.substring(0, 4) + '.';
}

interface DailyAggregation {
    date: Date;
    oreOrdinarie: number;
    oreStraordinarie: number;
    isTrasferta: boolean;
    altreOre: Record<string, number>;
    activityDescriptions: Set<string>;
}

const DailyBreakdownTable = ({ rapportini }: { rapportini: EnrichedRapportino[] }) => {

  const { processedRows, totals, otherHourTypes, grandTotal, totalTrasferte } = useMemo(() => {
    if (!rapportini || rapportini.length === 0) {
      return { processedRows: [], totals: { oreOrdinarie: 0, oreStraordinarie: 0, altreOre: {} }, otherHourTypes: [], grandTotal: 0, totalTrasferte: 0 };
    }
    
    const dailyTotals: Record<string, DailyAggregation> = {};
    const allOtherTypes = new Set<string>();

    for (const report of rapportini) {
        const date = toDate(report.data);
        if (!date) continue;

        const dayKey = format(date, 'yyyy-MM-dd');
        
        if (!dailyTotals[dayKey]) {
            dailyTotals[dayKey] = {
                date: date,
                oreOrdinarie: 0,
                oreStraordinarie: 0,
                isTrasferta: false,
                altreOre: {},
                activityDescriptions: new Set<string>(),
            };
        }

        const locationName = report.naveNome || report.luogoNome;
        const activityName = `${report.tipoGiornata?.nome || 'N/D'}${locationName ? ` (${locationName})` : ''}`;

        if (report.trasfertaId) {
            dailyTotals[dayKey].isTrasferta = true;
        }

        const tipoNome = (report.tipoGiornata?.nome || 'N/A').trim();
        const oreGiorno = report.oreGiorno || 0;

        if (oreGiorno > 0) {
             dailyTotals[dayKey].activityDescriptions.add(activityName);
             const tipoNomeLower = tipoNome.toLowerCase();

             if (tipoNomeLower.includes('straordinario')) {
                dailyTotals[dayKey].oreStraordinarie += oreGiorno;
             } else if (tipoNomeLower.includes('ordinario')) {
                const ordinaryHoursForDay = dailyTotals[dayKey].oreOrdinarie;
                const availableOrdinary = 8 - ordinaryHoursForDay;
                const ordinaryPart = Math.max(0, Math.min(oreGiorno, availableOrdinary));
                const overtimePart = Math.max(0, oreGiorno - ordinaryPart);
                
                dailyTotals[dayKey].oreOrdinarie += ordinaryPart;
                if (overtimePart > 0) {
                    dailyTotals[dayKey].oreStraordinarie += overtimePart;
                }
            } else {
                dailyTotals[dayKey].altreOre[tipoNome] = (dailyTotals[dayKey].altreOre[tipoNome] || 0) + oreGiorno;
                allOtherTypes.add(tipoNome);
            }
        } else if (report.trasfertaId) {
             dailyTotals[dayKey].activityDescriptions.add('Trasferta');
        }
    }
    
    const sortedOtherHourTypes = Array.from(allOtherTypes).sort();

    const processedRows = Object.keys(dailyTotals)
      .map(key => ({
           id: key, 
           ...dailyTotals[key],
           activityDescription: Array.from(dailyTotals[key].activityDescriptions).join(', ')
        }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
      
    const finalTotals = processedRows.reduce((acc, row) => {
        acc.oreOrdinarie += row.oreOrdinarie;
        acc.oreStraordinarie += row.oreStraordinarie;
        for (const key in row.altreOre) {
            acc.altreOre[key] = (acc.altreOre[key] || 0) + row.altreOre[key];
        }
        return acc;
    }, { oreOrdinarie: 0, oreStraordinarie: 0, altreOre: {} as Record<string, number> });

    const calculatedGrandTotal = finalTotals.oreOrdinarie + finalTotals.oreStraordinarie + Object.values(finalTotals.altreOre).reduce((a, b) => a + b, 0);
    const finalTotalTrasferte = processedRows.filter(row => row.isTrasferta).length;

    return { 
        processedRows, 
        totals: finalTotals, 
        otherHourTypes: sortedOtherHourTypes, 
        grandTotal: calculatedGrandTotal,
        totalTrasferte: finalTotalTrasferte
    };
  }, [rapportini]);

  const getCellStyle = () => ({
      borderBottom: '1px solid #424242',
      borderTop: 'none',
      backgroundColor: '#212121',
      color: '#fff',
  });

  const totalColumns = 2 + 2 + 1 + otherHourTypes.length;

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
              <TableCell align="right">Trasferta</TableCell>
              {otherHourTypes.map(tipo => <TableCell key={tipo} align="right">{abbreviate(tipo)}</TableCell>)}
            </TableRow>
          </TableHead>
          <TableBody>
            {processedRows.map((row) => {
                 const rowDate = row.date;
                 return (
                    <TableRow key={row.id}>
                       <TableCell style={getCellStyle()}>
                          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                              <Typography variant="body2" sx={{fontWeight: 'bold', color: '#fff'}}>{format(rowDate, 'dd/MM')}</Typography>
                              <Typography variant="caption" sx={{ color: '#ccc' }}>{format(rowDate, 'eee', { locale: it })}.</Typography>
                          </Box>
                      </TableCell>
                      <TableCell style={getCellStyle()}><Typography variant="caption" sx={{ color: '#fff' }}>{row.activityDescription}</Typography></TableCell>
                      <TableCell align="right" style={getCellStyle()}><Typography variant="body2" sx={{ color: '#fff' }}>{row.oreOrdinarie > 0 ? row.oreOrdinarie.toFixed(2) : '-'}</Typography></TableCell>
                      <TableCell align="right" style={getCellStyle()}><Typography variant="body2" sx={{ color: '#fff' }}>{row.oreStraordinarie > 0 ? row.oreStraordinarie.toFixed(2) : '-'}</Typography></TableCell>
                      <TableCell align="right" style={getCellStyle()}><Typography variant="body2" sx={{ color: '#fff' }}>{row.isTrasferta ? '1' : '-'}</Typography></TableCell>
                      {otherHourTypes.map(tipo => (
                          <TableCell key={tipo} align="right" style={getCellStyle()}>
                              <Typography variant="body2" sx={{ color: '#fff' }}>{(row.altreOre[tipo] && row.altreOre[tipo] > 0) ? (row.altreOre[tipo]).toFixed(2) : '-'}</Typography>
                          </TableCell>
                      ))}
                    </TableRow>
                )
            })}
          </TableBody>
          <TableFooter>
            <TableRow sx={{ '& > *': { borderTop: '2px solid black', fontWeight: 'bold', backgroundColor: '#333', color: '#fff' } }}>
                <TableCell colSpan={2}><Typography variant="subtitle2">TOTALI</Typography></TableCell>
                <TableCell align="right"><Typography variant="subtitle2">{totals.oreOrdinarie.toFixed(2)}</Typography></TableCell>
                <TableCell align="right"><Typography variant="subtitle2">{totals.oreStraordinarie.toFixed(2)}</Typography></TableCell>
                <TableCell align="right"><Typography variant="subtitle2">{totalTrasferte}</Typography></TableCell>
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
