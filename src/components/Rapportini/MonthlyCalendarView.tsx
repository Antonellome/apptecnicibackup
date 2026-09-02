
import { Box, Typography, Grid } from '@mui/material';
import {
  getDaysInMonth,
  startOfMonth,
  getDay,
  isToday,
  isSameDay,
} from 'date-fns';

interface MonthlyCalendarViewProps {
  currentMonth: Date;
  reportDays: Date[];
}

const MonthlyCalendarView = ({ currentMonth, reportDays }: MonthlyCalendarViewProps) => {
  const daysInMonth = getDaysInMonth(currentMonth);
  const startDay = (getDay(startOfMonth(currentMonth)) + 6) % 7; // 0 = Lunedì

  const daysOfWeek = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];

  return (
    <Box>
      <Grid container spacing={1} textAlign="center">
        {daysOfWeek.map((day, index) => (
          <Grid size={1.7} key={`${day}-${index}`}>
            <Typography variant="caption" color="text.secondary">
              {day}
            </Typography>
          </Grid>
        ))}
      </Grid>
      <Grid container spacing={1} sx={{ mt: 1 }}>
        {Array.from({ length: startDay }).map((_, index) => (
          <Grid size={1.7} key={`empty-${index}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, index) => {
          const dayNumber = index + 1;
          const date = new Date(
            currentMonth.getFullYear(),
            currentMonth.getMonth(),
            dayNumber
          );
          const hasReport = reportDays.some((reportDate) =>
            isSameDay(reportDate, date)
          );
          const isCurrentDay = isToday(date);

          return (
            <Grid size={1.7} key={dayNumber} sx={{ mb: 1 }}>
              <Box
                sx={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: hasReport ? '2px solid white' : 'none', // Bordo bianco per report
                  backgroundColor: 'transparent', // Sfondo sempre trasparente
                  color: isCurrentDay ? 'primary.main' : 'text.primary', // Colore blu per giorno corrente
                  fontWeight: isCurrentDay ? 'bold' : 'normal',
                }}
              >
                <Typography variant="body2" sx={{ color: 'inherit', fontWeight: 'inherit' }}>{dayNumber}</Typography>
              </Box>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};

export default MonthlyCalendarView;
