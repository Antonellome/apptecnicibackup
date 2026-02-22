import React, { useMemo } from 'react';
import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';
import { Rapportino as Report, TipoGiornata } from '@/models/definitions';
import { Paper, Typography, Box } from '@mui/material';
import { Tooltip as ReactTooltip } from 'react-tooltip';
import { addDays, format, isSaturday, isSunday, startOfDay } from 'date-fns';

interface CalendarioViewProps {
    reports: (Report & { tipoGiornata?: TipoGiornata })[];
    year: number;
    month: number;
}

const tipoGiornataColors: Record<string, string> = {
    'Lavoro': '#4a90e2',                 // Blu
    'Ferie': '#7ed321',                  // Verde
    'Malattia': '#d0021b',               // Rosso
    'Permesso': '#f5a623',               // Arancione
    'Formazione': '#bd10e0',             // Viola
    'Assenza Ingiustificata': '#4a4a4a',  // Grigio scuro
    'Non Lavorativo': '#f0f0f0',        // Grigio chiaro per weekend
    'default': '#eeeeee'                  // Grigio per giorni vuoti
};

const CalendarioView: React.FC<CalendarioViewProps> = ({ reports, year, month }) => {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);

    const calendarValues = useMemo(() => {
        const reportsByDate = new Map<string, Report & { tipoGiornata?: TipoGiornata }>();
        reports.forEach(report => {
            const reportDateStr = format(startOfDay(new Date(report.data)), 'yyyy-MM-dd');
            reportsByDate.set(reportDateStr, report);
        });

        const values = [];
        let currentDate = startDate;
        while (currentDate <= endDate) {
            const dateStr = format(currentDate, 'yyyy-MM-dd');
            const report = reportsByDate.get(dateStr);
            let dayData;

            if (report) {
                const tipo = report.tipoGiornata?.nome || 'Lavoro';
                dayData = {
                    date: dateStr,
                    tipo: tipo,
                    color: tipoGiornataColors[tipo] || tipoGiornataColors.default,
                    tooltip: `${format(currentDate, 'dd/MM/yyyy')}: ${tipo} - ${report.descrizioneBreve || 'N/D'} (${report.oreLavoro || 0}h)`
                };
            } else if (isSaturday(currentDate) || isSunday(currentDate)) {
                dayData = {
                    date: dateStr,
                    tipo: 'Non Lavorativo',
                    color: tipoGiornataColors['Non Lavorativo'],
                    tooltip: `${format(currentDate, 'dd/MM/yyyy')}: Giorno non lavorativo`
                };
            } else {
                dayData = {
                    date: dateStr,
                    tipo: 'Assenza Ingiustificata',
                    color: tipoGiornataColors['Assenza Ingiustificata'],
                    tooltip: `${format(currentDate, 'dd/MM/yyyy')}: Assenza Ingiustificata`
                };
            }
            values.push(dayData);
            currentDate = addDays(currentDate, 1);
        }
        return values;
    }, [reports, startDate, endDate]);

    return (
        <Paper sx={{ p: { xs: 1, sm: 2, md: 3 }, mt: 2, overflowX: 'auto' }}>
            <Typography variant="h6" gutterBottom align="center">Vista Calendario</Typography>
            <Box sx={{ minWidth: '600px', fontSize: '12px' }}>
                <CalendarHeatmap
                    startDate={addDays(startDate, -1)}
                    endDate={endDate}
                    values={calendarValues}
                    showWeekdayLabels
                    classForValue={(value) => value ? `color-q${value.tipo}` : 'color-empty'}
                    transformDayElement={(element, value, index) => (
                        <g key={index} data-tooltip-id="calendar-tooltip" data-tooltip-content={value?.tooltip}>
                           {React.cloneElement(element, { ...element.props, style: { fill: value?.color || '#eee' } })}
                        </g>
                    )}
                />
            </Box>
            <ReactTooltip id="calendar-tooltip" />

            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, flexWrap: 'wrap', gap: '10px' }}>
                {Object.entries(tipoGiornataColors).map(([key, color]) => {
                    if (key === 'default') return null;
                    return (
                        <Box key={key} sx={{ display: 'flex', alignItems: 'center' }}>
                            <Box sx={{ width: 15, height: 15, backgroundColor: color, mr: 1, borderRadius: '3px', border: '1px solid #ccc' }} />
                            <Typography variant="caption">{key}</Typography>
                        </Box>
                    );
                })}
            </Box>
        </Paper>
    );
};

export default CalendarioView;
