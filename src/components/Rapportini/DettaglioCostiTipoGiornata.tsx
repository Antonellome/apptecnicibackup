import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  TableFooter
} from '@mui/material';
import { RiepilogoMese } from '@/pages/MonthlyReportPage';

interface DettaglioCostiTipoGiornataProps {
  dettaglio: RiepilogoMese['dettaglio'];
}

const DettaglioCostiTipoGiornata: React.FC<DettaglioCostiTipoGiornataProps> = ({ dettaglio }) => {
  const sortedDettaglio = Array.from(dettaglio.values()).sort((a, b) => b.costo - a.costo);

  // --- CALCOLO TOTALI PER IL FOOTER ---
  const totalOreOrdinarie = sortedDettaglio.reduce((acc, item) => acc + item.oreOrdinarie, 0);
  const totalOreStraordinario = sortedDettaglio.reduce((acc, item) => acc + item.oreStraordinario, 0);
  const totalGiorni = sortedDettaglio.reduce((acc, item) => acc + item.giorni, 0);
  const totalCosto = sortedDettaglio.reduce((acc, item) => acc + item.costo, 0);

  const footerCellStyle = { fontWeight: 'bold', fontSize: '0.95rem' };

  return (
    <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
      <Typography variant="h5" gutterBottom>Dettaglio Costi per Attività</Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small" aria-label="dettaglio costi per tipo di giornata">
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 'bold' } }}>
              <TableCell>Tipo Attività</TableCell>
              <TableCell align="right">Ore Ord.</TableCell>
              <TableCell align="right">Ore Straord.</TableCell>
              <TableCell align="right">Giorni</TableCell>
              <TableCell align="right">Costo Stimato</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedDettaglio.map((item) => (
              <TableRow key={item.nome}>
                <TableCell component="th" scope="row">
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: item.colore, mr: 1.5 }} />
                        <Typography variant="body2">{item.nome}</Typography>
                    </Box>
                </TableCell>
                <TableCell align="right">{item.oreOrdinarie > 0 ? item.oreOrdinarie.toFixed(2) : '-'}</TableCell>
                <TableCell align="right">{item.oreStraordinario > 0 ? item.oreStraordinario.toFixed(2) : '-'}</TableCell>
                <TableCell align="right">{item.giorni}</TableCell>
                <TableCell align="right" sx={{ fontWeight: '500' }}>€ {item.costo.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
            <TableFooter>
                <TableRow sx={{ '& td': { fontWeight: 'bold' } }}>
                    <TableCell sx={footerCellStyle}>TOTALI</TableCell>
                    <TableCell sx={footerCellStyle} align="right">{totalOreOrdinarie.toFixed(2)}</TableCell>
                    <TableCell sx={footerCellStyle} align="right">{totalOreStraordinario.toFixed(2)}</TableCell>
                    <TableCell sx={footerCellStyle} align="right">{totalGiorni}</TableCell>
                    <TableCell sx={footerCellStyle} align="right">€ {totalCosto.toFixed(2)}</TableCell>
                </TableRow>
            </TableFooter>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default DettaglioCostiTipoGiornata;
