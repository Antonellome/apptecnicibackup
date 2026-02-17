
import React from 'react';
import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';
import { Report } from '@/models/Report';
import { Paper, Typography, Box } from '@mui/material';
import { Tooltip as ReactTooltip } from 'react-tooltip';

interface CalendarioViewProps {
    reports: Report[];
    year: number;
    month: number;
}

const tipoGiornataColors: Record<string, string> = {
    'Lavoro': '#4a90e2',      // Blu
    'Ferie': '#7ed321',       // Verde
    'Malattia': '#d0021b',    // Rosso
    'Permesso': '#f5a623',    // Arancione
    'Formazione': '#bd10e0',  // Viola
    'default': '#eeeeee'       // Grigio per giorni vuoti
};

const CalendarioView: React.FC<CalendarioViewProps> = ({ reports, year, month }) => {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);

    const values = reports.map(report => {
        return {
            date: new Date(report.data),
            count: tipoGiornataColors[report.tipoGiornata] || tipoGiornataColors['default'],
            tipo: report.tipoGiornata,
            cliente: report.cliente,
            ore: report.oreLavoro
        };
    });

    return (
        <Paper sx={{ p: 3, mt: 2 }}>
            <Typography variant="h6" gutterBottom>Vista Calendario</Typography>
            <CalendarHeatmap
                startDate={startDate}
                endDate={endDate}
                values={values}
                showWeekdayLabels
                classForValue={(value) => {
                    if (!value) {
                        return 'color-empty';
                    }
                    return `color-filled`; 
                }}
                
                transformDayElement={(element, value, index) => (
                    <g key={index} data-tooltip-id="calendar-tooltip" data-tooltip-content={value ? `${new Date(value.date).toLocaleDateString()}: ${value.tipo} - ${value.cliente || ''} (${value.ore || 0}h)` : ''}>
                        {React.cloneElement(element, { style: { fill: value ? value.count : '#eee' } })}
                    </g>
                )}
            />
            <ReactTooltip id="calendar-tooltip" />
            
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, flexWrap: 'wrap' }}>
                {Object.entries(tipoGiornataColors).map(([key, color]) => {
                    if (key === 'default') return null;
                    return (
                        <Box key={key} sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                            <Box sx={{ width: 15, height: 15, backgroundColor: color, mr: 1, borderRadius: '3px' }} />
                            <Typography variant="caption">{key}</Typography>
                        </Box>
                    );
                })}
            </Box>
        </Paper>
    );
};

export default CalendarioView;
