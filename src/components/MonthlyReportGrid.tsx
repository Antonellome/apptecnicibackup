
import { Tecnico, EnrichedRapportino, TipoGiornata } from '@/models/definitions'; // CORRETTO
import { getDaysInMonth, isValid, parseISO } from 'date-fns';
import { 
    Table, TableBody, TableCell, TableContainer, TableHead, 
    TableRow, Paper, Typography, Tooltip, Box
} from '@mui/material';
import { Timestamp } from 'firebase/firestore';

interface MonthlyReportGridProps {
  tecnici: Tecnico[];
  rapportini: EnrichedRapportino[]; // CORRETTO
  tipiGiornata: TipoGiornata[];
  currentDate: Date;
}

// Funzione helper per ottenere l'abbreviazione del giorno
const getDayAbbreviation = (dayIndex: number) => {
    const days = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
    return days[dayIndex];
}

export const MonthlyReportGrid = ({ tecnici, rapportini, tipiGiornata, currentDate }: MonthlyReportGridProps) => {

    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();
    const daysInMonth = getDaysInMonth(new Date(year, month));

    // Mappa per accesso rapido ai tipi di giornata per ID
    const tipiGiornataMap = new Map<string, TipoGiornata>();
    tipiGiornata.forEach(t => tipiGiornataMap.set(t.id, t));

    // Mappa nidificata per i rapportini: [tecnicoId][giorno] -> rapportino
    const rapportiniMatrix = new Map<string, Map<number, EnrichedRapportino>>();
    
    tecnici.forEach(t => rapportiniMatrix.set(t.id, new Map()));

    rapportini.forEach(r => {
        // Assicura che la data sia un oggetto Date valido
        const reportDate = r.data instanceof Timestamp ? r.data.toDate() : (typeof r.data === 'string' ? parseISO(r.data) : r.data);
        if (!isValid(reportDate)) return;

        if (reportDate.getMonth() === month && reportDate.getFullYear() === year) {
            const dayOfMonth = reportDate.getDate();
            // Il rapportino è associato al tecnico che lo ha scritto E a tutti i presenti
            r.presenze.forEach(tecnicoPresente => {
                const tecnicoId = tecnicoPresente.id;
                const technicianMap = rapportiniMatrix.get(tecnicoId);
                if (technicianMap) {
                    // Se c'è già un rapportino per quel giorno, non sovrascriverlo
                    // (potrebbe essere un caso limite da gestire meglio se necessario)
                    if (!technicianMap.has(dayOfMonth)) {
                        technicianMap.set(dayOfMonth, r);
                    }
                }
            });
        }
    });
    
    const renderDayCell = (tecnico: Tecnico, day: number) => {
        const date = new Date(year, month, day);
        const dayOfWeek = date.getDay();

        const rapportino = rapportiniMatrix.get(tecnico.id)?.get(day);

        // Assenza (né weekend, né rapportino)
        if (!rapportino && dayOfWeek !== 0 && dayOfWeek !== 6) {
            return (
                <TableCell key={day} sx={{ backgroundColor: '#ffcdd2', textAlign: 'center', border: '1px solid #e0e0e0', p: 0.5 }}>
                    <Tooltip title="Assenza Ingiustificata">
                        <Box sx={{ width: '100%', height: '100%' }} />
                    </Tooltip>
                </TableCell>
            );
        }

        // Giorno vuoto (weekend o festivo senza rapportino)
        if (!rapportino) {
            return <TableCell key={day} sx={{ backgroundColor: isWeekend(dayOfWeek) ? '#f5f5f5' : 'inherit', border: '1px solid #e0e0e0' }} />;
        }

        const tipoGiornata = tipiGiornataMap.get(rapportino.tipoGiornata.id);
        const cellColor = tipoGiornata?.colore || '#ffffff';
        const textColor = 'white'; 
        const sigla = tipoGiornata?.sigla || '?';

        return (
            <TableCell 
                key={day} 
                sx={{ 
                    backgroundColor: cellColor, 
                    color: textColor,
                    textShadow: '1px 1px 2px rgba(0,0,0,0.7)',
                    textAlign: 'center', 
                    cursor: 'pointer',
                    border: '1px solid #e0e0e0',
                    p: 1,
                }}
            >
                <Tooltip title={`${tipoGiornata?.nome || 'N/D'} - Ore: ${rapportino.oreGiorno || 'N/A'}`}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{sigla}</Typography>
                </Tooltip>
            </TableCell>
        );
    };
    
    const isWeekend = (dayOfWeek: number) => dayOfWeek === 0 || dayOfWeek === 6;

    return (
        <TableContainer component={Paper} elevation={2} sx={{maxHeight: '70vh'}}>
            <Table stickyHeader size="small">
                <TableHead>
                    <TableRow>
                        <TableCell sx={{ fontWeight: 'bold', minWidth: 170, position: 'sticky', left: 0, zIndex: 1001, backgroundColor: '#eeeeee', borderRight: '2px solid #cccccc' }}>Tecnico</TableCell>
                        {[...Array(daysInMonth).keys()].map(day => {
                            const date = new Date(year, month, day + 1);
                            const dayOfWeek = date.getDay();
                            return (
                                <TableCell key={day + 1} sx={{
                                    textAlign: 'center', 
                                    fontWeight: 'bold', 
                                    backgroundColor: isWeekend(dayOfWeek) ? '#e0e0e0' : '#f5f5f5', 
                                    minWidth: 50,
                                    borderLeft: '1px solid #dddddd'
                                }}>
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
                            <TableCell sx={{ fontWeight: 'bold', position: 'sticky', left: 0, zIndex: 1, backgroundColor: '#fafafa', borderRight: '2px solid #cccccc' }}>
                                {tecnico.nomeCompleto}
                            </TableCell>
                            {[...Array(daysInMonth).keys()].map(day => renderDayCell(tecnico, day + 1))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
};
