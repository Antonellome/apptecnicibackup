import React, { useRef, useMemo } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Button, Divider, Icon
} from '@mui/material';
import { Print, Summarize } from '@mui/icons-material';
import { useReactToPrint } from 'react-to-print';
import type { Rapportino, Tecnico, Nave, Luogo, DettaglioOreData } from '@/models/definitions';
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
    rapportini: (Rapportino & { dettaglioTecnico: DettaglioOreData })[];
}

const GeneratedReportView: React.FC<GeneratedReportViewProps> = ({ rapportini, tecnici, navi, luoghi, anno, mese }) => {
  const printRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();
  // FIX: Cast to `any` to bypass a potential issue with outdated or mismatched type definitions for the library.
  const handlePrint = useReactToPrint({ content: () => printRef.current } as any);

  const meseNome = new Date(anno, mese - 1).toLocaleString('it-IT', { month: 'long' });

  const { naviMap, luoghiMap } = useMemo(() => {
    const naviMap = (navi || []).reduce((acc: Record<string, string>, n) => {
        acc[n.id] = n.nome;
        return acc;
    }, {});
    const luoghiMap = (luoghi || []).reduce((acc: Record<string, string>, l) => {
        acc[l.id] = l.nome;
        return acc;
    }, {});
    return { naviMap, luoghiMap };
  }, [navi, luoghi]);

  const reportData: ReportData[] = useMemo(() => {
    return tecnici.map(tecnico => {
        const reportsForTecnico = rapportini
            .map(r => {
                if (!r.presenze?.includes(tecnico.id)) return null;
                
                const dettaglioTecnico = (r.dettaglioOreTecnici || []).find(d => d.tecnicoId === tecnico.id);
                return dettaglioTecnico ? { ...r, dettaglioTecnico } : null;
            })
            .filter((r): r is Rapportino & { dettaglioTecnico: DettaglioOreData } => r !== null);

        const oreTotali = reportsForTecnico.reduce((acc, r) => acc + (r.dettaglioTecnico.ore || 0), 0);
        
        return {
          tecnico,
          oreTotali,
          rapportini: reportsForTecnico,
        };
    }).filter(data => data.rapportini.length > 0);
  }, [rapportini, tecnici]);

  const oreComplessive = reportData.reduce((acc, data) => acc + data.oreTotali, 0);

  const cardStyle = {
    borderLeft: `5px solid ${theme.palette.primary.main}`,
    p: 2,
    mb: 2,
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
                            <Typography variant="subtitle1" color="text.secondary">Ore totali lavorate: <Typography component="span" fontWeight="bold" color="text.primary">{data.oreTotali.toFixed(2)}</Typography></Typography>
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
                                    {data.rapportini.map(r => {
                                        const dateObject = (r.data as any)?.toDate ? (r.data as any).toDate() : r.data;
                                        return (
                                            <TableRow key={r.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                                <TableCell>{dayjs(dateObject).format('DD/MM/YY')}</TableCell>
                                                <TableCell>{(r.naveId ? naviMap[r.naveId] : '-') || (r.luogoId ? luoghiMap[r.luogoId] : '-')}</TableCell>
                                                <TableCell>{r.descrizioneBreve}</TableCell>
                                                <TableCell>{r.dettaglioTecnico.oraInizio} - {r.dettaglioTecnico.oraFine}</TableCell>
                                                <TableCell align="right">{r.dettaglioTecnico.ore?.toFixed(2) || '-'}</TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                ))
            )}
            <Divider sx={{ my: 3 }} />
            <Box sx={{display: 'flex', justifyContent: 'flex-end'}}>
                <Typography variant="h6" align="right">Totale Complessive: <Typography component="span" color="primary" variant="h5" fontWeight="bold">{oreComplessive.toFixed(2)}</Typography></Typography>
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
