
import React from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, Box } from '@mui/material';
import { Rapportino as Report, TipoGiornata } from '@/models/definitions';
import { format } from 'date-fns';
import { it } from 'date-fns/locale/it'; // CIAO: Corretto l'import da default a nominato

interface EnrichedReport extends Report {
    tipoGiornata?: TipoGiornata;
}

interface ConsuntivoTableProps {
    reports: EnrichedReport[];
}

const formatTotal = (label: string, value: number, unit: string) => (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
        <Typography variant="body2" component="span">{label}:</Typography>
        <Typography variant="body2" component="span" fontWeight="bold">{value.toFixed(2)} {unit}</Typography>
    </Box>
);

const ConsuntivoTable: React.FC<ConsuntivoTableProps> = ({ reports }) => {

    const totals = reports.reduce((acc, report) => {
        if (report.tipoGiornata?.lavorativo) {
            acc.oreTotali += report.oreLavoro || 0;
        }
        return acc;
    }, { oreTotali: 0 });

    return (
        <Paper sx={{ p: { xs: 1, sm: 2 }, mt: 2 }}>
            <Typography variant="h6" gutterBottom align="center">Tabella Consuntivo</Typography>
            <TableContainer>
                <Table stickyHeader size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Data</TableCell>
                            <TableCell>Tipo Giornata</TableCell>
                            <TableCell>Descrizione</TableCell>
                            <TableCell align="right">Ore</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {reports.length > 0 ? reports.map(report => (
                            <TableRow key={report.id}>
                                <TableCell>
                                    {format(new Date(report.data), 'dd/MM/yyyy (eee)', { locale: it })}
                                </TableCell>
                                <TableCell>{report.tipoGiornata?.nome || 'N/D'}</TableCell>
                                <TableCell>{report.descrizioneBreve || '-'}</TableCell>
                                <TableCell align="right">
                                    {report.oreLavoro ? report.oreLavoro.toFixed(2) : '-'}
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={4} align="center">Nessun report per il periodo selezionato.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
            <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                <Typography variant="h6" gutterBottom>Riepilogo</Typography>
                {formatTotal('Ore Lavorate Totali', totals.oreTotali, 'h')}
            </Box>
        </Paper>
    );
};

export default ConsuntivoTable;
