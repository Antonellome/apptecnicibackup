import React, { useRef, useMemo } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Button, Divider, Icon
} from '@mui/material';
import { Share, Summarize, EuroSymbol } from '@mui/icons-material';
import html2canvas from 'html2canvas';
import type { Tecnico, Nave, Luogo, EnrichedReport } from '@/models/definitions'; 
import dayjs from 'dayjs';
import { useTheme } from '@mui/material/styles';

interface GeneratedReportViewProps {
  rapportini: (EnrichedReport & { guadagno?: number })[];
  tecnico: Tecnico;
  navi: Nave[];
  luoghi: Luogo[];
  anno: number;
  mese: number;
  totalGuadagno?: number; // Prop per il totale guadagno
}

// Funzione per formattare la valuta
const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value);
};

const GeneratedReportView: React.FC<GeneratedReportViewProps> = ({ rapportini, tecnico, navi, luoghi, anno, mese, totalGuadagno = 0 }) => {
  const printRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();

  const handleShare = async () => {
    if (!printRef.current) return;

    const canvas = await html2canvas(printRef.current, { backgroundColor: '#ffffff' });
    canvas.toBlob(async (blob) => {
      if (!blob) return;

      const file = new File([blob], 'report.png', { type: blob.type });
      const shareData = {
        files: [file],
        title: 'Report Mensile',
        text: `Ecco il report mensile per ${tecnico.nome} ${tecnico.cognome}`,
      };

      if (navigator.canShare && navigator.canShare(shareData)) {
        try {
          await navigator.share(shareData);
        } catch (error) {
          console.error('Errore durante la condivisione:', error);
        }
      } else {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'report.png';
        link.click();
      }
    });
  };

  const meseNome = new Date(anno, mese - 1).toLocaleString('it-IT', { month: 'long' });

  const { naviMap, luoghiMap } = useMemo(() => {
    const naviMap: Record<string, string> = (navi || []).reduce((acc, n) => ({ ...acc, [n.id]: n.nome }), {});
    const luoghiMap: Record<string, string> = (luoghi || []).reduce((acc, l) => ({ ...acc, [l.id]: l.nome }), {});
    return { naviMap, luoghiMap };
  }, [navi, luoghi]);

  const oreTotali = rapportini.reduce((acc, r) => acc + (r.oreLavoro || 0), 0);

  const headerCellStyle = {
    fontWeight: 'bold',
    color: theme.palette.common.white,
  };

  return (
    <Paper elevation={0} sx={{ p: 2, mb: 2, border: 'none', boxShadow: 'none' }}>
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

            {rapportini.length === 0 ? (
                <Typography align="center" color="text.secondary" sx={{py: 5}}>Nessun dato trovato per questo mese.</Typography>
            ) : (
                <Box>
                    <Box sx={{ p: 1.5, borderRadius: 2, mb: 2, border: `1px solid ${theme.palette.divider}` }}>
                        <Typography variant="h6">{`${tecnico.nome} ${tecnico.cognome}`}</Typography>
                        <Typography variant="subtitle1" color="text.secondary">Ore totali lavorate: <Typography component="span" fontWeight="bold" color="text.primary">{oreTotali.toFixed(2)}</Typography></Typography>
                         {/* --- VISUALIZZAZIONE TOTALE GUADAGNO --- */}
                        <Typography variant="subtitle1" color="text.secondary">Guadagno totale: <Typography component="span" fontWeight="bold" color="text.primary">{formatCurrency(totalGuadagno)}</Typography></Typography>
                    </Box>
                    <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                            <TableHead sx={{ backgroundColor: theme.palette.primary.main }}>
                                <TableRow>
                                    <TableCell sx={headerCellStyle}>Data</TableCell>
                                    <TableCell sx={headerCellStyle}>Nave / Luogo</TableCell>
                                    <TableCell sx={headerCellStyle}>Dettaglio</TableCell>
                                    <TableCell align="right" sx={headerCellStyle}>Ore</TableCell>
                                    {/* --- COLONNA GUADAGNO --- */}
                                    <TableCell align="right" sx={headerCellStyle}>Guadagno</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {rapportini.map(r => (
                                    <TableRow key={r.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                        <TableCell>{dayjs(r.data).format('DD/MM/YY')}</TableCell>
                                        <TableCell>{(r.naveId ? naviMap[r.naveId] : null) || (r.luogoId ? luoghiMap[r.luogoId] : null) || 'N/D'}</TableCell>
                                        <TableCell>{r.descrizioneBreve}</TableCell>
                                        <TableCell align="right">{r.oreLavoro ? r.oreLavoro.toFixed(2) : '-'}</TableCell>
                                        {/* --- CELLA GUADAGNO --- */}
                                        <TableCell align="right">{r.guadagno ? formatCurrency(r.guadagno) : '-'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Box>
            )}
            <Divider sx={{ my: 3 }} />
            <Box sx={{display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 3}}>
                <Typography variant="h6" align="right">Totale Ore: <Typography component="span" color="primary" variant="h5" fontWeight="bold">{oreTotali.toFixed(2)}</Typography></Typography>
                <Typography variant="h6" align="right">Totale Guadagno: <Typography component="span" color="primary" variant="h5" fontWeight="bold">{formatCurrency(totalGuadagno)}</Typography></Typography>
            </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="contained" startIcon={<Share />} onClick={handleShare} size="large">
                Condividi Report
            </Button>
        </Box>
    </Paper>
  );
};

export default GeneratedReportView;
