import { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Button,
  useTheme,
} from '@mui/material';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, eachWeekOfInterval, isWithinInterval } from 'date-fns';
import { it } from 'date-fns/locale';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/local-db';
import { useMasterData } from '@/hooks/useMasterData';
import { useAuth } from '@/hooks/useAuth';
import FullScreenLoader from '@/components/FullScreenLoader';
import { calculateWeeklyHours, ORE_ORDINARIE, LAVORO_NOTTURNO_ORDINARIO, LAVORO_FESTIVO_ORDINARIO, LAVORO_FESTIVO_NOTTURNO_ORDINARIO, STRAORDINARIO_DIURNO, STRAORDINARIO_NOTTURNO, STRAORDINARIO_FESTIVO, STRAORDINARIO_FESTIVO_NOTTURNO } from '@/utils/hoursCalculations';
import { toDateSafe } from '@/utils/dateUtils';
import { Rapportino } from '@/models/definitions';

const hourTypes = [
    ORE_ORDINARIE,
    LAVORO_NOTTURNO_ORDINARIO,
    LAVORO_FESTIVO_ORDINARIO,
    LAVORO_FESTIVO_NOTTURNO_ORDINARIO,
    STRAORDINARIO_DIURNO,
    STRAORDINARIO_NOTTURNO,
    STRAORDINARIO_FESTIVO,
    STRAORDINARIO_FESTIVO_NOTTURNO,
];

interface WeeklyTableProps {
    week: { start: Date; end: Date };
    rapportini: Rapportino[];
    currentMonth: Date;
    masterData: any;
    tecnicoId: string;
}

const WeeklyTable: React.FC<WeeklyTableProps> = ({ week, rapportini, currentMonth, masterData, tecnicoId }) => {
    const theme = useTheme();
    const daysOfWeek = eachDayOfInterval({ start: week.start, end: week.end });

    const calculatedHours = useMemo(() => {
        if (!rapportini || rapportini.length === 0) return {};
        return calculateWeeklyHours(rapportini, masterData, tecnicoId);
    }, [rapportini, masterData, tecnicoId]);

    const weekHasActivity = useMemo(() => {
        return daysOfWeek.some(day => {
            const dateString = format(day, 'yyyy-MM-dd');
            return calculatedHours[dateString] && Object.keys(calculatedHours[dateString]).length > 0;
        });
    }, [daysOfWeek, calculatedHours]);

    if (!weekHasActivity) return null;

    return (
        <TableContainer component={Paper} sx={{ mb: 4, backgroundColor: theme.palette.background.default }}>
            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Tipo Ora</TableCell>
                        {daysOfWeek.map(day => (
                            <TableCell key={day.toISOString()} align="center" sx={{ fontWeight: 'bold', color: isSameMonth(day, currentMonth) ? 'inherit' : theme.palette.text.disabled }}>
                                {format(day, 'EEE dd', { locale: it })}
                            </TableCell>
                        ))}
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>Totale</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {hourTypes.map(hourType => {
                        const rowTotal = daysOfWeek.reduce((total, day) => {
                            const dateString = format(day, 'yyyy-MM-dd');
                            return total + (calculatedHours[dateString]?.[hourType] || 0);
                        }, 0);

                        if (rowTotal === 0) return null;

                        return (
                            <TableRow key={hourType}>
                                <TableCell component="th" scope="row">{hourType}</TableCell>
                                {daysOfWeek.map(day => {
                                    const dateString = format(day, 'yyyy-MM-dd');
                                    const value = calculatedHours[dateString]?.[hourType] || 0;
                                    return (
                                        <TableCell key={dateString} align="center" sx={{ color: isSameMonth(day, currentMonth) ? 'inherit' : theme.palette.text.disabled }}>
                                            {value > 0 ? value.toFixed(2) : '-'}
                                        </TableCell>
                                    );
                                })}
                                <TableCell align="right"><strong>{rowTotal.toFixed(2)}</strong></TableCell>
                            </TableRow>
                        );
                    })}
                    <TableRow sx={{ backgroundColor: theme.palette.action.hover }}>
                        <TableCell><strong>Totale Giorno</strong></TableCell>
                        {daysOfWeek.map(day => {
                            const dateString = format(day, 'yyyy-MM-dd');
                            const dayTotal = Object.values(calculatedHours[dateString] || {}).reduce((acc, val) => acc + val, 0);
                            return <TableCell key={`total-${dateString}`} align="center"><strong>{dayTotal > 0 ? dayTotal.toFixed(2) : '-'}</strong></TableCell>
                        })}
                        <TableCell align="right"><strong>{daysOfWeek.reduce((total, day) => {
                            const dateString = format(day, 'yyyy-MM-dd');
                            return total + Object.values(calculatedHours[dateString] || {}).reduce((acc, val) => acc + val, 0);
                        }, 0).toFixed(2)}</strong></TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </TableContainer>
    );
};

const DatiPage: React.FC = () => {
  const { userProfile, loading: authLoading } = useAuth();
  const { masterData, loading: masterDataLoading } = useMasterData();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const handleMonthChange = (increment: number) => {
    setCurrentMonth(increment > 0 ? addMonths(currentMonth, 1) : subMonths(currentMonth, 1));
  };

  const displayInterval = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const weekOptions = { weekStartsOn: 1 as const };
    const displayStart = startOfWeek(monthStart, weekOptions);
    const displayEnd = endOfWeek(monthEnd, weekOptions);
    return { start: displayStart, end: displayEnd };
  }, [currentMonth]);

  const rapportiniDelPeriodo = useLiveQuery(() => {
    if (!userProfile?.tecnicoId) return [];
    return db.rapportini.filter(r => {
        const reportDate = toDateSafe(r.data);
        if (!reportDate || r.isDeleted) return false;

        const isInDisplayInterval = reportDate >= displayInterval.start && reportDate <= displayInterval.end;
        if (!isInDisplayInterval) return false;

        return r.tecnicoId === userProfile.tecnicoId || (r.presenze || []).includes(userProfile.tecnicoId);
    }).toArray();
  }, [displayInterval, userProfile?.tecnicoId]);

  const weeksInDisplay = useMemo(() => {
      return eachWeekOfInterval(displayInterval, { weekStartsOn: 1 });
  }, [displayInterval]);

  const weeklyData = useMemo(() => {
    if (!rapportiniDelPeriodo) return [];
    return weeksInDisplay.map(weekStart => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const weekRapportini = rapportiniDelPeriodo.filter(r => {
        const reportDate = toDateSafe(r.data);
        return reportDate && isWithinInterval(reportDate, { start: weekStart, end: weekEnd });
      });
      return { week: { start: weekStart, end: weekEnd }, rapportini: weekRapportini };
    });
  }, [weeksInDisplay, rapportiniDelPeriodo]);

  if (authLoading || masterDataLoading || !userProfile || !masterData) {
    return <FullScreenLoader />;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2}}>
        <Button variant="contained" onClick={() => handleMonthChange(-1)}>Mese Prec.</Button>
        <Typography variant="h4">{format(currentMonth, 'MMMM yyyy', { locale: it })}</Typography>
        <Button variant="contained" onClick={() => handleMonthChange(1)}>Mese Succ.</Button>
      </Box>
      
      {weeklyData.length > 0 && rapportiniDelPeriodo && rapportiniDelPeriodo.length > 0 ? (
        weeklyData.map(({ week, rapportini }) => (
          <WeeklyTable 
            key={week.start.toISOString()} 
            week={week} 
            rapportini={rapportini} 
            currentMonth={currentMonth} 
            masterData={masterData} 
            tecnicoId={userProfile.tecnicoId} 
          />
        ))
      ) : (
        <Paper sx={{ p: 4, textAlign: 'center'}}>
            <Typography>Nessun dato da visualizzare per il periodo selezionato.</Typography>
        </Paper>
      )}
    </Box>
  );
};

export default DatiPage;
