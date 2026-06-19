
import { Paper, Typography, Grid, Box, Tooltip } from '@mui/material';
import { getDaysInMonth, startOfMonth, format, getDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { Rapportino, TipoGiornata, Giorno } from '@/models/definitions';

interface Props {
    rapportino?: Rapportino;
    tipiGiornata: Map<string, TipoGiornata>;
    selectedDate: Date;
}

const Calendar = ({ rapportino, tipiGiornata, selectedDate }: Props) => {
    const daysInMonth = getDaysInMonth(selectedDate);
    const firstDayOfMonth = startOfMonth(selectedDate);
    // Calcola l'indice del giorno di partenza (0 = Lunedì, 6 = Domenica)
    const startingDayIndex = (getDay(firstDayOfMonth) + 6) % 7; 
    const weekDays = ['LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB', 'DOM'];

    const renderDay = (day: number) => {
        const giornoData: Giorno | undefined = rapportino?.giorni?.[String(day)];
        const tipoGiorno = giornoData ? tipiGiornata.get(giornoData.tipo) : null;

        const isToday = format(new Date(), 'd') === String(day) && format(new Date(), 'M') === format(selectedDate, 'M');
        const isSunday = (startingDayIndex + day - 1) % 7 === 6;
        const isSaturday = (startingDayIndex + day - 1) % 7 === 5;

        let sxProps: any = {
            p: 1,
            height: '100px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            borderRadius: '4px',
            overflow: 'hidden',
        };

        if (giornoData) {
            const content = (
                <Box>
                    <Typography variant="body2"><strong>{tipoGiorno?.nome || 'Lavorato'}</strong></Typography>
                    <Typography variant="caption">Ore: {giornoData.ore}</Typography>
                    {giornoData.straordinari > 0 && <Typography variant="caption"><br />Straordinari: {giornoData.straordinari}</Typography>}
                    {giornoData.trasferta !== 'No' && <Typography variant="caption"><br />Trasferta: {giornoData.trasferta}</Typography>}
                </Box>
            );

            sxProps = {
                ...sxProps,
                backgroundColor: tipoGiorno ? `${tipoGiorno.colore}20` : 'grey.100',
                border: `2px solid ${tipoGiorno?.colore || 'grey.400'}`,
                cursor: 'pointer',
            };
            return (
                <Tooltip title={content}>
                    <Paper sx={sxProps}>
                        <Typography variant="body2" fontWeight={isToday ? 'bold' : 'normal'}>{day}</Typography>
                    </Paper>
                </Tooltip>
            );
        }

        sxProps = {
            ...sxProps,
            backgroundColor: (isSunday || isSaturday) ? 'grey.50' : 'background.paper',
            border: isToday ? '2px solid' : '1px solid',
            borderColor: isToday ? 'primary.main' : 'grey.200'
        };

        return (
            <Paper sx={sxProps}>
                 <Typography variant="body2" align="left" color={isSunday ? "error" : "text.primary"} fontWeight={isToday ? 'bold' : 'normal'}>{day}</Typography>
            </Paper>
        );
    };

    return (
        <Paper elevation={3} sx={{ p: 2, overflow: 'hidden' }}>
            <Typography variant="h6" align="center" gutterBottom>
                {format(selectedDate, 'MMMM yyyy', { locale: it })}
            </Typography>
            <Grid container spacing={0.5}>
                {weekDays.map(day => (
                    <Grid size={12 / 7} key={day} sx={{ textAlign: 'center', fontWeight: 'bold', mb: 1 }}>
                        <Typography variant="caption" color="text.secondary">{day}</Typography>
                    </Grid>
                ))}
                {Array.from({ length: startingDayIndex }).map((_, i) => (
                    <Grid size={12/7} key={`empty-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => (
                    <Grid size={12 / 7} key={i}>
                        {renderDay(i + 1)}
                    </Grid>
                ))}
            </Grid>
        </Paper>
    );
};

export default Calendar;
