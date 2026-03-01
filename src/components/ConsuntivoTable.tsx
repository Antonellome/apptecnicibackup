import React from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, Box } from '@mui/material';
import { Rapportino as Report, TipoGiornata } from '@/models/definitions';
import { format } from 'date-fns';
import { it } from 'date-fns/locale/it';

interface EnrichedReport extends Report {
    tipoGiornata?: TipoGiornata;
    guadagno?: number; // Aggiunta la proprietà guadagno
}

interface ConsuntivoTableProps {
    reports: EnrichedReport[];
    totalGuadagno?: number; // Aggiunta la prop per il totale
}

// Funzione di utility per formattare i totali
const formatTotal = (label: string, value: string) => (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', mt: 0.5 }}>
        <Typography variant="body2" component="span">{label}:</Typography>
        <Typography variant="body2" component="span" fontWeight="bold">{value}</Typography>
    </Box>
);

// Funzione per formattare la valuta
const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value);
};

const ConsuntivoTable: React.FC<ConsuntivoTableProps> = ({ reports, totalGuadagno = 0 }) => {

    const totals = reports.reduce((acc, report) => {
        if (report.tipoGiornata?.lavorativo) {
            acc.oreTotali += report.oreLavoro || 0;
        }
        return acc;
    }, { oreTotali: 0 });

    return (
        <Paper sx={{ p: { xs: 1, sm: 2 } }}>
            <Typography variant="h6" gutterBottom align="center" sx={{mb: 2}}>Tabella Consuntivo</Typography>
            <TableContainer sx={{ maxHeight: 600 }}>
                <Table stickyHeader size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{width: '25%'}}>Data</TableCell>
                            <TableCell sx={{width: '25%'}}>Tipo Giornata</TableCell>
                            <TableCell sx={{width: '30%'}}>Descrizione</TableCell>
                            <TableCell align="right" sx={{width: '10%'}}>Ore</TableCell>
                            {/* --- NUOVA COLONNA --- */}
                            <TableCell align="right" sx={{width: '10%'}}>Guadagno</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {reports.length > 0 ? reports.map(report => (
                            <TableRow key={report.id}>
                                <TableCell>
                                    {format(new Date(report.data), 'dd/MM/yyyy (eee)', { locale: it })}
                                </TableCell>
                                <TableCell>{report.tipoGiornata?.nome || 'N/D'}</TableCell>
                                <TableCell sx={{ wordBreak: 'break-word'}}>{report.descrizioneBreve || '-'}</TableCell>
                                <TableCell align="right">
                                    {report.oreLavoro ? report.oreLavoro.toFixed(2) : '-'}
                                </TableCell>
                                {/* --- CELLA GUADAGNO --- */}
                                <TableCell align="right">
                                    {report.guadagno ? formatCurrency(report.guadagno) : '-'}
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={5} align="center">Nessun report per il periodo selezionato.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
            <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                <Typography variant="h6" gutterBottom>Riepilogo</Typography>
                {formatTotal('Ore Lavorate Totali', `${totals.oreTotali.toFixed(2)} h`)}
                {/* --- TOTALE GUADAGNO --- */}
                {formatTotal('Guadagno Totale', formatCurrency(totalGuadagno))}
            </Box>
        </Paper>
    );
};

export default ConsuntivoTable;
