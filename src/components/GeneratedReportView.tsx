import React, { useRef, useMemo } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Button, Divider, Icon
} from '@mui/material';
import { Print, Summarize } from '@mui/icons-material';
import { useReactToPrint } from 'react-to-print';
import type { Rapportino, Tecnico, Nave, Luogo } from '@/models/definitions'; 
import dayjs from 'dayjs';
import { useTheme } from '@mui/material/styles';

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
  // CIAO: Corretto l'hook useReactToPrint
  const handlePrint = useReactToPrint({ body: () => printRef.current });

  const meseNome = new Date(anno, mese - 1).toLocaleString('it-IT', { month: 'long' });

  const { naviMap, luoghiMap } = useMemo(() => {
    // CIAO: Aggiungo tipi espliciti per risolvere l'errore implicit any
    const naviMap: Record<string, string> = (navi || []).reduce((acc, n) => ({ ...acc, [n.id]: n.nome }), {});
    const luoghiMap: Record<string, string> = (luoghi || []).reduce((acc, l) => ({ ...acc, [l.id]: l.nome }), {});
    return { naviMap, luoghiMap };
  }, [navi, luoghi]);

  const reportData: ReportData[] = tecnici.map(tecnico => {
    // CIAO: Corretto `tecnicoScriventeId` con `tecnicoId`
    const rapportiniDelTecnico = rapportini.filter(r => r.tecnicoId === tecnico.id);
    // CIAO: Corretto `oreLavorate` con `oreLavoro`
    const oreTotali = rapportiniDelTecnico.reduce((acc, r) => acc + (r.oreLavoro || 0), 0);
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

  // CIAO: Corretta la funzione per lavorare con oggetti Date
  const formatTime = (date: Date | undefined) => {
    if (!date) return '-';
    return dayjs(date).format('HH:mm');
  };

  return (
    <Paper elevation={2} sx={cardStyle}>
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
                                            {/* CIAO: Rimosso .toDate() */}
                                            <TableCell>{dayjs(r.data).format('DD/MM/YY')}</TableCell>
                                            <TableCell>{(r.naveId ? naviMap[r.naveId] : null) || (r.luogoId ? luoghiMap[r.luogoId] : null) || 'N/D'}</TableCell>
                                            {/* CIAO: Corretto `breveDescrizione` con `descrizioneBreve` */}
                                            <TableCell>{r.descrizioneBreve}</TableCell>
                                            <TableCell>{formatTime(r.oraInizio)} - {formatTime(r.oraFine)}</TableCell>
                                            {/* CIAO: Corretto `oreLavorate` con `oreLavoro` */}
                                            <TableCell align="right">{r.oreLavoro || '-'}</TableCell>
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
