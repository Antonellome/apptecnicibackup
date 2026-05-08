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
  Box
} from '@mui/material';
import { RiepilogoMese } from '@/pages/MonthlyReportPage';

interface DettaglioCostiTipoGiornataProps {
  dettaglio: RiepilogoMese['dettaglio'];
}

const DettaglioCostiTipoGiornata: React.FC<DettaglioCostiTipoGiornataProps> = ({ dettaglio }) => {
  const sortedDettaglio = Array.from(dettaglio.values()).sort((a, b) => b.costo - a.costo);

  return (
    <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
      <Typography variant="h5" gutterBottom>Dettaglio Costi per Attività</Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small" aria-label="dettaglio costi per tipo di giornata">
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 'bold' } }}>
              <TableCell>Tipo Attività</TableCell>
              <TableCell align="right">Ore</TableCell>
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
                <TableCell align="right">{item.unita === 'ora' ? item.ore.toFixed(1) : '-'}</TableCell>
                <TableCell align="right">{item.giorni}</TableCell>
                <TableCell align="right" sx={{ fontWeight: '500' }}>€ {item.costo.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default DettaglioCostiTipoGiornata;
