
import React from 'react';
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, TableFooter
} from '@mui/material';
import { Rapportino, TipoGiornata } from '@/models/definitions';
import { format } from 'date-fns';

// Interfaccia per il report arricchito che la tabella riceve
interface EnrichedReport extends Rapportino {
    tipoGiornata?: TipoGiornata; // Oggetto completo del tipo giornata
}

// Interfaccia per i totali calcolati
interface Totals {
    totalHours: number;
    costDetails: Record<string, { ore: number; costo: number; nome: string; }>;
    totalEarnings: number;
}

// Funzione di calcolo: robusta e chiara
const calculateTotals = (reports: EnrichedReport[]): Totals => {
    const totals: Totals = {
        totalHours: 0,
        costDetails: {},
        totalEarnings: 0,
    };

    reports.forEach(report => {
        const hours = typeof report.oreLavorate === 'number' ? report.oreLavorate : 0;
        totals.totalHours += hours;

        const tipoGiornataInfo = report.tipoGiornata;
        if (tipoGiornataInfo) {
            let costoGiornaliero = 0;
            if (typeof tipoGiornataInfo.costoOrario === 'number' && tipoGiornataInfo.costoOrario > 0) {
                costoGiornaliero = hours * tipoGiornataInfo.costoOrario;
            } else if (typeof tipoGiornataInfo.tariffa === 'number' && tipoGiornataInfo.tariffa > 0) {
                costoGiornaliero = tipoGiornataInfo.tariffa;
            }

            if (costoGiornaliero > 0) {
                if (totals.costDetails[tipoGiornataInfo.id]) {
                    totals.costDetails[tipoGiornataInfo.id].ore += hours;
                    totals.costDetails[tipoGiornataInfo.id].costo += costoGiornaliero;
                } else {
                    totals.costDetails[tipoGiornataInfo.id] = {
                        ore: hours,
                        costo: costoGiornaliero,
                        nome: tipoGiornataInfo.nome,
                    };
                }
                totals.totalEarnings += costoGiornaliero;
            }
        }
    });

    return totals;
};

interface ConsuntivoTableProps {
    reports: EnrichedReport[];
}

const ConsuntivoTable: React.FC<ConsuntivoTableProps> = ({ reports }) => {
    if (!reports) {
        return <Typography sx={{ p: 2 }}>Nessun dato da visualizzare.</Typography>;
    }

    const totals = calculateTotals(reports);

    const formatDate = (date: any): string => {
        try {
            const d = date?.toDate ? date.toDate() : new Date(date);
            return format(d, 'dd/MM/yyyy');
        } catch (e) {
            return 'N/D';
        }
    };

    return (
        <TableContainer component={Paper}>
            <Table stickyHeader aria-label="consuntivo mensile">
                <TableHead>
                    <TableRow>
                        <TableCell>Data</TableCell>
                        <TableCell>Tipo Giornata</TableCell>
                        <TableCell align="right">Ore Lavorate</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {reports.length > 0 ? reports.map((report) => (
                        <TableRow key={report.id}>
                            <TableCell>{formatDate(report.data)}</TableCell>
                            <TableCell>{report.tipoGiornata?.nome || 'N/A'}</TableCell>
                            <TableCell align="right">
                                {typeof report.oreLavorate === 'number' ? report.oreLavorate.toFixed(2) : '-'}
                            </TableCell>
                        </TableRow>
                    )) : (
                        <TableRow>
                            <TableCell colSpan={3} align="center">
                                Nessun rapportino trovato per il periodo selezionato.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
                <TableFooter>
                    <TableRow sx={{ '& > * ': { fontWeight: 'bold', fontSize: '1.1rem' } }}>
                        <TableCell colSpan={2}>TOTALI ORE</TableCell>
                        <TableCell align="right">{totals.totalHours.toFixed(2)} ore</TableCell>
                    </TableRow>
                    {Object.values(totals.costDetails).map((detail) => (
                        <TableRow key={detail.nome}>
                            <TableCell colSpan={2} align="right">Totale {detail.nome} ({detail.ore.toFixed(2)} ore):</TableCell>
                            <TableCell align="right">{detail.costo.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}</TableCell>
                        </TableRow>
                    ))}
                     <TableRow sx={{ '& > * ': { fontWeight: 'bold', fontSize: '1.2rem', borderTop: '2px solid black'} }}>
                        <TableCell colSpan={2} align="right">TOTALE GUADAGNO:</TableCell>
                        <TableCell align="right">{totals.totalEarnings.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}</TableCell>
                    </TableRow>
                </TableFooter>
            </Table>
        </TableContainer>
    );
};

export default ConsuntivoTable;
