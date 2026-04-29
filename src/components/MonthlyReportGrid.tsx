
import { useMemo } from 'react';
import { Tecnico, Rapportino, TipoGiornata } from '@/hooks/useGlobalData';
import { getDaysInMonth, startOfDay, isValid } from 'date-fns'; // Importo isValid
import { 
    Table, TableBody, TableCell, TableContainer, TableHead, 
    TableRow, Paper, Typography, Tooltip 
} from '@mui/material';

interface MonthlyReportGridProps {
  tecnici: Tecnico[];
  rapportini: Rapportino[];
  tipiGiornata: TipoGiornata[];
  currentDate: Date;
}

const getDayAbbreviation = (dayIndex: number) => {
    const days = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
    return days[dayIndex];
}

export const MonthlyReportGrid = ({ tecnici, rapportini, tipiGiornata, currentDate }: MonthlyReportGridProps) => {

    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();
    const daysInMonth = getDaysInMonth(new Date(year, month));

    const rapportiniByTecnicoAndDate = useMemo(() => {
        const map = new Map<string, Rapportino>();
        rapportini
            // AGGIUNGO CONTROLLO DI SICUREZZA: ignoro i rapportini senza data o con data invalida
            .filter(r => r && r.data && isValid(r.data))
            .filter(r => r.data.getMonth() === month && r.data.getFullYear() === year)
            .forEach(r => {
                const key = `${r.tecnicoId}_${startOfDay(r.data).getTime()}`;
                map.set(key, r);
            });
        return map;
    }, [rapportini, month, year]);

    const tipiGiornataMap = useMemo(() => {
        const map = new Map<string, TipoGiornata>();
        tipiGiornata.forEach(t => map.set(t.id, t));
        return map;
    }, [tipiGiornata]);

    const renderDayCell = (tecnico: Tecnico, day: number) => {
        const date = startOfDay(new Date(year, month, day));
        const key = `${tecnico.id}_${date.getTime()}`;
        const rapportino = rapportiniByTecnicoAndDate.get(key);

        const dayOfWeek = date.getDay();
        // Logica per assenza ingiustificata
        if (!rapportino && dayOfWeek !== 0 && dayOfWeek !== 6) {
            return (
                <TableCell key={day} sx={{ backgroundColor: '#ffcdd2', textAlign: 'center', border: '1px solid #e0e0e0' }}>
                    <Tooltip title="Assenza Ingiustificata">
                        <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#c62828' }}>X</Typography>
                    </Tooltip>
                </TableCell>
            );
        }

        // Weekend o giorno non lavorativo senza rapportino
        if (!rapportino) {
            return <TableCell key={day} sx={{ backgroundColor: '#f5f5f5', border: '1px solid #e0e0e0' }} />;
        }

        // AGGIUNGO CONTROLLO DI SICUREZZA: gestisco il caso in cui tipoGiornataId non sia valido
        const tipoGiornata = rapportino.tipoGiornataId ? tipiGiornataMap.get(rapportino.tipoGiornataId) : undefined;
        const cellColor = tipoGiornata?.colore || '#ffffff'; // Default bianco se non trovato
        const sigla = tipoGiornata?.sigla || 'ERR'; // Sigla di errore se non trovato

        return (
            <TableCell 
                key={day} 
                sx={{ 
                    backgroundColor: cellColor, 
                    textAlign: 'center', 
                    cursor: 'pointer',
                    border: '1px solid #e0e0e0',
                    color: 'white',
                    textShadow: '1px 1px 2px black'
                }}
            >
                <Tooltip title={`${tipoGiornata?.nome || 'Tipo non trovato'} - ${rapportino.oreLavorate} ore`}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{sigla}</Typography>
                </Tooltip>
            </TableCell>
        );
    };

    return (
        <TableContainer component={Paper} elevation={3}>
            <Table stickyHeader size="small">
                <TableHead>
                    <TableRow>
                        <TableCell sx={{ fontWeight: 'bold', minWidth: 150, position: 'sticky', left: 0, zIndex: 1001, backgroundColor: '#eeeeee' }}>Tecnico</TableCell>
                        {[...Array(daysInMonth).keys()].map(day => {
                            const date = new Date(year, month, day + 1);
                            const dayOfWeek = date.getDay();
                            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                            return (
                                <TableCell key={day + 1} sx={{ textAlign: 'center', fontWeight: 'bold', backgroundColor: isWeekend ? '#e0e0e0' : '#f5f5f5', minWidth: 50 }}>
                                    {day + 1}
                                    <Typography variant="caption" display="block">{getDayAbbreviation(dayOfWeek)}</Typography>
                                </TableCell>
                            )
                        })}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {tecnici.map(tecnico => (
                        <TableRow key={tecnico.id} hover>
                            <TableCell sx={{ fontWeight: 'bold', position: 'sticky', left: 0, zIndex: 1000, backgroundColor: '#fafafa' }}>{tecnico.nome}</TableCell>
                            {[...Array(daysInMonth).keys()].map(day => renderDayCell(tecnico, day + 1))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
};
