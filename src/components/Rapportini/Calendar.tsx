import { Paper, Typography, Grid, Box, Tooltip } from '@mui/material';
import { getDaysInMonth, startOfMonth, format, getDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { Rapportino, TipoGiornata, Giorno } from '@/pages/MonthlyReportPage';

interface Props {
    rapportino?: Rapportino;
    tipiGiornata: Map<string, TipoGiornata>;
    selectedDate: Date;
}

const Calendar = ({ rapportino, tipiGiornata, selectedDate }: Props) => {
    const daysInMonth = getDaysInMonth(selectedDate);
    const firstDayOfMonth = startOfMonth(selectedDate);
    // getDay() => 0=Sun, 1=Mon, ..., 6=Sat. We want 0=Mon, ..., 6=Sun
    const startingDayIndex = (getDay(firstDayOfMonth) + 6) % 7;

    const weekDays = ['LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB', 'DOM'];

    const renderDay = (day: number) => {
        const giornoData: Giorno | undefined = rapportino?.giorni[String(day)];
        const tipoGiorno = giornoData ? tipiGiornata.get(giornoData.tipo) : null;

        const dayOfWeek = (startingDayIndex + day - 1) % 7;
        const isSunday = dayOfWeek === 6;
        const isSaturday = dayOfWeek === 5;

        let sxProps: any = {
            height: 90,
            p: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            overflow: 'hidden',
        };

        if (giornoData) {
            const tooltipTitle = (
                <Box>
                    <Typography variant="body2"><strong>{tipoGiorno?.nome || 'Lavorato'}</strong></Typography>
                    <Typography variant="caption">Ore: {giornoData.ore}</Typography>
                    {giornoData.straordinari > 0 && <Typography variant="caption"><br />Straordinari: {giornoData.straordinari}</Typography>}
                    {giornoData.trasferta !== 'No' && <Typography variant="caption"><br />Trasferta: {giornoData.trasferta}</Typography>}
                </Box>
            );

            sxProps = {
                ...sxProps,
                backgroundColor: tipoGiorno ? `${tipoGiorno.colore}20` : 'grey.100', // Light background
                border: `2px solid ${tipoGiorno?.colore || 'grey.400'}`,
                cursor: 'pointer',
            };

            return (
                <Tooltip arrow title={tooltipTitle}>
                    <Paper variant="outlined" sx={sxProps}>
                        <Typography variant="body2" fontWeight="bold" align="right">{day}</Typography>
                        <Box flexGrow={1} display="flex" alignItems="center" justifyContent="center">
                            <Typography variant="h5" color="text.primary">{giornoData.ore > 0 ? giornoData.ore : ''}</Typography>
                        </Box>
                    </Paper>
                </Tooltip>
            );
        }

        // Giorni non lavorativi o senza dati
        sxProps = {
            ...sxProps,
            backgroundColor: (isSunday || isSaturday) ? 'grey.50' : 'background.paper',
        };

        return (
            <Paper variant="outlined" sx={sxProps}>
                 <Typography variant="body2" color="text.secondary" align="right">{day}</Typography>
            </Paper>
        );
    };

    return (
        <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
            <Typography variant="h5" gutterBottom>
                Calendario di {format(selectedDate, 'MMMM yyyy', { locale: it })}
            </Typography>
            <Grid container spacing={0.5}>
                {weekDays.map(day => (
                    <Grid xs={12 / 7} key={day} sx={{ textAlign: 'center', fontWeight: 'bold', mb: 1 }}>
                        <Typography variant="caption" color="text.secondary">{day}</Typography>
                    </Grid>
                ))}
                {Array.from({ length: startingDayIndex }).map((_, i) => (
                    <Grid xs={12/7} key={`empty-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => (
                    <Grid xs={12 / 7} key={i}>
                        {renderDay(i + 1)}
                    </Grid>
                ))}
            </Grid>
        </Paper>
    );
};

export default Calendar;
