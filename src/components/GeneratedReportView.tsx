import React, { useRef, useMemo } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Button, Divider, Icon
} from '@mui/material';
import { Print, Summarize } from '@mui/icons-material';
import { useReactToPrint } from 'react-to-print';
// CIAO: OBBEDISCO. Importo i tipi che servono, Nave e Luogo.
import type { Rapportino, Tecnico, Nave, Luogo } from '@/models/definitions'; 
import dayjs from 'dayjs';
import { useTheme } from '@mui/material/styles';

// CIAO: OBBEDISCO. Aggiungo navi e luoghi alle props. Senza di essi, non posso risolvere gli ID.
interface GeneratedReportViewProps {
  rapportini: Rapportino[];
  tecnici: Tecnico[];
  navi: Nave[];
  luoghi: Luogo[];
  anno: number;
  mese: number;
}

interface ReportData {
    tecnico: Tecnico;
    oreTotali: number;
    rapportini: Rapportino[];
}

const GeneratedReportView: React.FC<GeneratedReportViewProps> = ({ rapportini, tecnici, navi, luoghi, anno, mese }) => {
  const printRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();
  const handlePrint = useReactToPrint({ content: () => printRef.current });

  const meseNome = new Date(anno, mese - 1).toLocaleString('it-IT', { month: 'long' });

  // CIAO: OBBEDISCO. Creo le mappe per risolvere gli ID di navi e luoghi.
  const { naviMap, luoghiMap } = useMemo(() => {
    const naviMap = (navi || []).reduce((acc, n) => ({ ...acc, [n.id]: n.nome }), {});
    const luoghiMap = (luoghi || []).reduce((acc, l) => ({ ...acc, [l.id]: l.nome }), {});
    return { naviMap, luoghiMap };
  }, [navi, luoghi]);

  // CIAO: OBBEDISCO. Correggo l'errore: r.tecnicoScrivente.id -> r.tecnicoScriventeId
  const reportData: ReportData[] = tecnici.map(tecnico => {
    const rapportiniDelTecnico = rapportini.filter(r => r.tecnicoScriventeId === tecnico.id);
    const oreTotali = rapportiniDelTecnico.reduce((acc, r) => acc + (r.oreLavorate || 0), 0);
    return {
      tecnico,
      oreTotali,
      rapportini: rapportiniDelTecnico,
    };
  }).filter(data => data.rapportini.length > 0); 

  const oreComplessive = reportData.reduce((acc, data) => acc + data.oreTotali, 0);

  const cardStyle = {
    borderLeft: `5px solid ${theme.palette.primary.main}`,
    p: 2,
    mb: 2,
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp || !timestamp.toDate) return '-';
    return dayjs(timestamp.toDate()).format('HH:mm');
  };

  return (
    <Paper elevation={2} sx={cardStyle}>
        {/* Area di Stampa */}
        <Box ref={printRef} sx={{p: 2}}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Icon component={Summarize} sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
                <Box>
                    <Typography variant="h5" component="div" fontWeight="bold">
                        Report Mensile Riepilogativo
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Periodo: {`${meseNome.charAt(0).toUpperCase() + meseNome.slice(1)} ${anno}`}
                    </Typography>
                </Box>
            </Box>

            {reportData.length === 0 ? (
                <Typography align="center" color="text.secondary" sx={{py: 5}}>Nessun dato trovato per i criteri selezionati.</Typography>
            ) : (
                reportData.map(data => (
                    <Box key={data.tecnico.id} sx={{ mb: 4 }}>
                        <Box sx={{ p: 1.5, borderRadius: 2, mb: 2, border: `1px solid ${theme.palette.divider}` }}>
                            <Typography variant="h6">{`${data.tecnico.nome} ${data.tecnico.cognome}`}</Typography>
                            <Typography variant="subtitle1" color="text.secondary">Ore totali lavorate: <Typography component="span" fontWeight="bold" color="text.primary">{data.oreTotali}</Typography></Typography>
                        </Box>
                        <TableContainer component={Paper} variant="outlined">
                            <Table size="small">
                                <TableHead sx={{ backgroundColor: theme.palette.grey[100] }}>
                                    <TableRow>
                                        <TableCell sx={{fontWeight: 'bold'}}>Data</TableCell>
                                        <TableCell sx={{fontWeight: 'bold'}}>Nave / Luogo</TableCell>
                                        <TableCell sx={{fontWeight: 'bold'}}>Dettaglio</TableCell>
                                        <TableCell sx={{fontWeight: 'bold'}}>Orario</TableCell>
                                        <TableCell align="right" sx={{fontWeight: 'bold'}}>Ore</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {data.rapportini.map(r => (
                                        <TableRow key={r.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                            <TableCell>{dayjs(r.data.toDate()).format('DD/MM/YY')}</TableCell>
                                            {/* CIAO: OBBEDISCO. Correggo r.nave.nome con la mappa. */}
                                            <TableCell>{(r.naveId ? naviMap[r.naveId] : null) || (r.luogoId ? luoghiMap[r.luogoId] : null) || 'N/D'}</TableCell>
                                            <TableCell>{r.breveDescrizione}</TableCell>
                                            {/* CIAO: OBBEDISCO. Correggo orarioInizio in oraInizio e formatto l'orario. */}
                                            <TableCell>{formatTime(r.oraInizio)} - {formatTime(r.oraFine)}</TableCell>
                                            <TableCell align="right">{r.oreLavorate || '-'}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                ))
            )}
            <Divider sx={{ my: 3 }} />
            <Box sx={{display: 'flex', justifyContent: 'flex-end'}}>
                <Typography variant="h6" align="right">Totale Ore Complessive: <Typography component="span" color="primary" variant="h5" fontWeight="bold">{oreComplessive}</Typography></Typography>
            </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="contained" startIcon={<Print />} onClick={handlePrint} size="large">
                Stampa Report
            </Button>
        </Box>
    </Paper>
  );
};

export default GeneratedReportView;
