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

interface DettaglioOreTipoGiornataProps {
  dettaglio: RiepilogoMese['dettaglio'];
}

const DettaglioOreTipoGiornata: React.FC<DettaglioOreTipoGiornataProps> = ({ dettaglio }) => {
  const sortedDettaglio = Array.from(dettaglio.values()).sort((a, b) => (b.oreOrdinarie + b.oreStraordinario) - (a.oreOrdinarie + a.oreStraordinario));

  // --- CALCOLO TOTALI PER IL FOOTER ---
  const totalOreOrdinarie = sortedDettaglio.reduce((acc, item) => acc + item.oreOrdinarie, 0);
  const totalOreStraordinario = sortedDettaglio.reduce((acc, item) => acc + item.oreStraordinario, 0);
  const totalGiorni = sortedDettaglio.reduce((acc, item) => acc + item.giorni, 0);

  const footerCellStyle = { fontWeight: 'bold', fontSize: '0.95rem' };

  return (
    <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
      <Typography variant="h5" gutterBottom>Dettaglio Ore per Attività</Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small" aria-label="dettaglio ore per tipo di giornata">
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 'bold' } }}>
              <TableCell>Tipo Attività</TableCell>
              <TableCell align="right">Ore Ord.</TableCell>
              <TableCell align="right">Ore Straord.</TableCell>
              <TableCell align="right">Giorni</TableCell>
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
              </TableRow>
            ))}
          </TableBody>
            <TableFooter>
                <TableRow sx={{ '& td': { fontWeight: 'bold' } }}>
                    <TableCell sx={footerCellStyle}>TOTALI</TableCell>
                    <TableCell sx={footerCellStyle} align="right">{totalOreOrdinarie.toFixed(2)}</TableCell>
                    <TableCell sx={footerCellStyle} align="right">{totalOreStraordinario.toFixed(2)}</TableCell>
                    <TableCell sx={footerCellStyle} align="right">{totalGiorni}</TableCell>
                </TableRow>
            </TableFooter>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default DettaglioOreTipoGiornata;
