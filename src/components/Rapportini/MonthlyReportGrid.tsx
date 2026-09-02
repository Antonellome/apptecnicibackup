
import React from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, Box
} from '@mui/material';
import { getDaysInMonth, startOfMonth } from 'date-fns';
import { EnrichedRapportino, TipoGiornata } from '@/models/definitions';

interface MonthlyReportGridProps {
  rapportini: EnrichedRapportino[];
  tipiGiornata: TipoGiornata[];
  currentMonth: Date;
  onDayClick: (report: EnrichedRapportino) => void;
}

const MonthlyReportGrid: React.FC<MonthlyReportGridProps> = ({ rapportini, tipiGiornata, currentMonth, onDayClick }) => {

  const tipiGiornataMap = new Map(tipiGiornata.map(t => [t.id, t]));
  const monthDays = getDaysInMonth(currentMonth);
  const firstDayOfMonth = startOfMonth(currentMonth);

  const renderCellContent = (day: number) => {
    const reportForDay = rapportini.find(r => {
        const date = (r.data as any).toDate ? (r.data as any).toDate() : r.data;
        return date.getDate() === day;
    });

    if (reportForDay) {
      let tipo;
      if (reportForDay.tipoGiornata) {
        tipo = tipiGiornataMap.get(reportForDay.tipoGiornata.id);
      }
      const oreTotali = (reportForDay.dettaglioOreTecnici || []).reduce((acc, curr) => acc + (curr.ore || 0), 0);

      return (
        <Box 
            sx={{ bgcolor: tipo?.colore || 'transparent', p: 1, borderRadius: 1, color: 'white', cursor: 'pointer' }}
            onClick={() => onDayClick(reportForDay)}
        >
          <Typography variant="body2" align="center">{tipo?.sigla || 'N/D'}</Typography>
          <Typography variant="caption" display="block" align="center">{oreTotali}h</Typography>
        </Box>
      );
    } else {
      const dayOfWeek = (firstDayOfMonth.getDay() + day - 1) % 7;
      if (dayOfWeek === 0 || dayOfWeek === 6) { // Sunday or Saturday
        return <Box sx={{ p: 1, borderRadius: 1, bgcolor: '#f5f5f5' }} />;
      }
      return <Box sx={{ p: 1, borderRadius: 1, bgcolor: '#ffcdd2' }} />;
    }
  };

  return (
    <TableContainer component={Paper} sx={{ mt: 3 }}>
      <Table>
        <TableHead>
          <TableRow>
            {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(day => <TableCell key={day} align="center">{day}</TableCell>)}
          </TableRow>
        </TableHead>
        <TableBody>
          {[...Array(Math.ceil(monthDays / 7))].map((_, weekIndex) => (
            <TableRow key={weekIndex}>
              {[...Array(7)].map((__, dayIndex) => {
                const day = weekIndex * 7 + dayIndex + 1;
                return (
                  <TableCell key={dayIndex} align="center">
                    {day <= monthDays ? renderCellContent(day) : null}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default MonthlyReportGrid;
