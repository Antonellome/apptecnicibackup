import { Paper, Typography, Box, Table, TableBody, TableCell, TableContainer, TableRow, TableHead, TableFooter } from '@mui/material';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { EnrichedRapportino } from '@/models/definitions';
import { useMemo } from 'react';

interface DailySummary {
  date: string;
  oreOrdinarie: number;
  oreStraordinarie: number;
  altreOre: Record<string, number>;
  tipiGiornata: string[];
}

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

const DailyBreakdownTable = ({ rapportini }: { rapportini: EnrichedRapportino[] }) => {

  const { summaries, totals, otherHourTypes } = useMemo(() => {
    if (!rapportini || rapportini.length === 0) {
      return { summaries: [], totals: { oreOrdinarie: 0, oreStraordinarie: 0, altreOre: {} }, otherHourTypes: [] };
    }

    const groupedByDay: Record<string, EnrichedRapportino[]> = rapportini.reduce((acc, r) => {
        const dayKey = format(r.data, 'yyyy-MM-dd');
        if (!acc[dayKey]) acc[dayKey] = [];
        acc[dayKey].push(r);
        return acc;
    }, {} as Record<string, EnrichedRapportino[]>);

    const allOtherTypes = new Set<string>();
    rapportini.forEach(r => {
        const tipoNome = r.tipoGiornata?.nome || 'N/A';
        if (!tipoNome.toLowerCase().includes('ordinaria') && !tipoNome.toLowerCase().includes('straordinario')) {
            allOtherTypes.add(tipoNome);
        }
    });
    const sortedOtherHourTypes = Array.from(allOtherTypes).sort();

    const dailySummaries: DailySummary[] = Object.keys(groupedByDay).map(dayKey => {
        const reports = groupedByDay[dayKey];
        let oreDaSplittare = 0;
        let oreStraordinariePure = 0;
        const altreOre: Record<string, number> = {};
        const tipiGiornata: string[] = [];

        reports.forEach(report => {
            const tipoNome = report.tipoGiornata?.nome || 'N/A';
            if (tipoNome.toLowerCase().includes('ordinaria')) {
                oreDaSplittare += report.oreGiorno;
            } else if (tipoNome.toLowerCase().includes('straordinario')) {
                oreStraordinariePure += report.oreGiorno;
            } else {
                altreOre[tipoNome] = (altreOre[tipoNome] || 0) + report.oreGiorno;
            }
            if (!tipiGiornata.includes(tipoNome)) {
                tipiGiornata.push(tipoNome);
            }
        });

        const oreOrdinarie = Math.min(oreDaSplittare, 8);
        const sforo = Math.max(0, oreDaSplittare - 8);
        const oreStraordinarie = sforo + oreStraordinariePure;

        return { date: dayKey, oreOrdinarie, oreStraordinarie, altreOre, tipiGiornata };
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const finalTotals = dailySummaries.reduce((acc, summary) => {
        acc.oreOrdinarie += summary.oreOrdinarie;
        acc.oreStraordinarie += summary.oreStraordinarie;
        for (const key in summary.altreOre) {
            acc.altreOre[key] = (acc.altreOre[key] || 0) + summary.altreOre[key];
        }
        return acc;
    }, { oreOrdinarie: 0, oreStraordinarie: 0, altreOre: {} as Record<string, number> });

    return { summaries: dailySummaries, totals: finalTotals, otherHourTypes: sortedOtherHourTypes };
  }, [rapportini]);

  return (
    <Paper elevation={3} sx={{ mt: 3, overflowX: 'auto' }}>
      <Typography variant="h6" gutterBottom sx={{ p: 2 }}>Dettaglio Giornaliero</Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& > th': { fontWeight: 'bold'} }}>
              <TableCell>Giorno</TableCell>
              <TableCell>Attività</TableCell>
              <TableCell align="right">Ord.</TableCell>
              <TableCell align="right">Straord.</TableCell>
              {otherHourTypes.map(tipo => <TableCell key={tipo} align="right">{abbreviate(tipo)}</TableCell>)}
            </TableRow>
          </TableHead>
          <TableBody>
            {summaries.map((summary) => (
              <TableRow key={summary.date} hover>
                 <TableCell>
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="body2" sx={{fontWeight: 'bold'}}>{format(new Date(summary.date), 'dd/MM')}</Typography>
                        <Typography variant="caption" color="text.secondary">{format(new Date(summary.date), 'eee', { locale: it })}.</Typography>
                    </Box>
                </TableCell>
                <TableCell>
                    <Typography variant="caption">{summary.tipiGiornata.join(', ')}</Typography>
                </TableCell>
                <TableCell align="right"><Typography variant="body2">{summary.oreOrdinarie > 0 ? summary.oreOrdinarie.toFixed(2) : '-'}</Typography></TableCell>
                <TableCell align="right"><Typography variant="body2">{summary.oreStraordinarie > 0 ? summary.oreStraordinarie.toFixed(2) : '-'}</Typography></TableCell>
                {otherHourTypes.map(tipo => (
                    <TableCell key={tipo} align="right">
                        <Typography variant="body2">{(summary.altreOre[tipo] && summary.altreOre[tipo] > 0) ? (summary.altreOre[tipo]).toFixed(2) : '-'}</Typography>
                    </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow sx={{ '& > *': { borderTop: '2px solid black', fontWeight: 'bold' } }}>
                <TableCell colSpan={2}><Typography variant="subtitle2">TOTALI</Typography></TableCell>
                <TableCell align="right"><Typography variant="subtitle2">{totals.oreOrdinarie.toFixed(2)}</Typography></TableCell>
                <TableCell align="right"><Typography variant="subtitle2">{totals.oreStraordinarie.toFixed(2)}</Typography></TableCell>
                {otherHourTypes.map(tipo => <TableCell key={tipo} align="right"><Typography variant="subtitle2">{(totals.altreOre[tipo] || 0).toFixed(2)}</Typography></TableCell>)}
            </TableRow>
          </TableFooter>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default DailyBreakdownTable;
