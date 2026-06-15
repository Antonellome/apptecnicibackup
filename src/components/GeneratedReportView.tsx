import React, { useRef, useMemo } from 'react';
import {
    Box,
    Typography,
    TableContainer,
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    Paper,
    Button,
    TableFooter,
    Alert,
} from '@mui/material';
import { Share } from '@mui/icons-material';
import html2canvas from 'html2canvas';
import type { Tecnico, Nave, Luogo, EnrichedRapportino } from '@/models/definitions'; 
import dayjs from 'dayjs';
import { useTheme } from '@mui/material/styles';
import { useMasterData } from '@/hooks/useMasterData';
import { Timestamp } from 'firebase/firestore';

// --- TYPE GUARD per Firestore Timestamp ---
const isFirestoreTimestamp = (date: any): date is Timestamp => {
    return date && typeof date.toDate === 'function';
};

interface RapportinoConCalcoli extends EnrichedRapportino {
  guadagno?: number;
  oreOrdinarie?: number;
  oreStraordinario?: number;
}

interface GeneratedReportViewProps {
  rapportini: RapportinoConCalcoli[];
  tecnico: Tecnico;
  navi: Nave[];
  luoghi: Luogo[];
  anno: number;
  mese: number;
  totalGuadagno: number;
}

const formatCurrency = (value: number) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value);

interface AggregatedActivity {
    tipoGiornataId: string;
    nomeAttivita: string;
    oreOrdinarie: number;
    oreStraordinario: number;
    giorni: number;
    costoStimato: number;
}

const GeneratedReportView: React.FC<GeneratedReportViewProps> = ({ rapportini, tecnico, navi, luoghi, anno, mese, totalGuadagno }) => {
    const theme = useTheme();
    const printRef = useRef<HTMLDivElement>(null);
    const { masterData } = useMasterData();

    const handleShare = async () => {
        if (!printRef.current) return; 
        const canvas = await html2canvas(printRef.current, { scale: 2 });
        const dataUrl = canvas.toDataURL('image/png');
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], `consuntivo_${tecnico.cognome}_${anno}_${mese}.png`, { type: 'image/png' });

        if (typeof navigator.share === 'function') {
            navigator.share({
                title: `Consuntivo ${tecnico.nome} ${tecnico.cognome}`,
                files: [file],
            }).catch((error) => console.log('Errore nella condivisione', error));
        } else {
            alert('La condivisione Web non è supportata su questo browser.');
        }
    };

    const aggregatedData = useMemo(() => {
        if (!masterData) return [];
        const tipiGiornataMap = new Map<string, string>(masterData.tipiGiornata.map(t => [t.id, t.nome]));

        const aggregation: { [key: string]: AggregatedActivity } = {};

        rapportini.forEach(r => {
            if (!r.tipoGiornata) {
                return;
            }
            const tipoId = r.tipoGiornata.id;
            if (!aggregation[tipoId]) {
                aggregation[tipoId] = {
                    tipoGiornataId: tipoId,
                    nomeAttivita: tipiGiornataMap.get(tipoId) || 'Sconosciuto',
                    oreOrdinarie: 0,
                    oreStraordinario: 0,
                    giorni: 0,
                    costoStimato: 0,
                };
            }
            aggregation[tipoId].oreOrdinarie += r.oreOrdinarie ?? 0;
            aggregation[tipoId].oreStraordinario += r.oreStraordinario ?? 0;
            aggregation[tipoId].costoStimato += r.guadagno ?? 0;
            aggregation[tipoId].giorni += 1;
        });

        return Object.values(aggregation);
    }, [rapportini, masterData]);

    const { naviMap, luoghiMap } = React.useMemo(() => {
        const naviMap = navi.reduce((acc, n) => ({ ...acc, [n.id]: n.nome }), {} as Record<string, string>);
        const luoghiMap = luoghi.reduce((acc, l) => ({ ...acc, [l.id]: l.nome }), {} as Record<string, string>);
        return { naviMap, luoghiMap };
    }, [navi, luoghi]);

    const totalOreGiorno = rapportini.reduce((acc, r) => acc + (r.oreGiorno ?? 0), 0);
    const totalOreOrdinarie = rapportini.reduce((acc, r) => acc + (r.oreOrdinarie ?? 0), 0);
    const totalOreStraordinario = rapportini.reduce((acc, r) => acc + (r.oreStraordinario ?? 0), 0);

    const headerCellStyle = { fontWeight: 'bold', backgroundColor: theme.palette.grey[200] };
    const footerCellStyle = { ...headerCellStyle, fontSize: '1.1rem' };

    if (rapportini.length === 0) {
        return <Alert severity="info">Nessun rapportino trovato per questo mese.</Alert>;
    }

    return (
        <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
            <Box display="flex" justifyContent="flex-end" mb={2} gap={1}>
                {typeof navigator.share === 'function' && (
                    <Button variant="contained" startIcon={<Share />} onClick={handleShare}>Condividi</Button>
                )}
            </Box>
            
            <Paper elevation={3} ref={printRef} sx={{ padding: theme.spacing(3), backgroundColor: 'white' }}>
                <Box sx={{ textAlign: 'center', mb: 3 }}>
                    <Typography variant="h4" component="h1" gutterBottom>Consuntivo Mensile</Typography>
                    <Typography variant="h6" component="h2">{tecnico.nome} {tecnico.cognome}</Typography>
                    <Typography variant="subtitle1" color="textSecondary">{dayjs(new Date(anno, mese - 1)).format('MMMM YYYY')}</Typography>
                </Box>

                <Typography variant="h5" component="h3" sx={{ mt: 4, mb: 2 }}>Dettaglio Costi per Attività</Typography>
                <TableContainer component={Paper} elevation={0} variant="outlined">
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={headerCellStyle}>Tipo Attività</TableCell>
                                <TableCell sx={headerCellStyle} align="right">Ore Ord.</TableCell>
                                <TableCell sx={headerCellStyle} align="right">Ore Straord.</TableCell>
                                <TableCell sx={headerCellStyle} align="right">Giorni</TableCell>
                                <TableCell sx={headerCellStyle} align="right">Costo Stimato</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {aggregatedData.map((a) => (
                                <TableRow key={a.tipoGiornataId}>
                                    <TableCell component="th" scope="row">{a.nomeAttivita}</TableCell>
                                    <TableCell align="right">{a.oreOrdinarie > 0 ? a.oreOrdinarie.toFixed(2) : '-'}</TableCell>
                                    <TableCell align="right">{a.oreStraordinario > 0 ? a.oreStraordinario.toFixed(2) : '-'}</TableCell>
                                    <TableCell align="right">{a.giorni}</TableCell>
                                    <TableCell align="right">{formatCurrency(a.costoStimato)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                        <TableFooter>
                           <TableRow>
                               <TableCell sx={footerCellStyle} component="th" scope="row">TOTALI</TableCell>
                               <TableCell sx={footerCellStyle} align="right">{totalOreOrdinarie.toFixed(2)}</TableCell>
                               <TableCell sx={footerCellStyle} align="right">{totalOreStraordinario.toFixed(2)}</TableCell>
                               <TableCell sx={footerCellStyle} align="right">{rapportini.length}</TableCell>
                               <TableCell sx={footerCellStyle} align="right">{formatCurrency(totalGuadagno)}</TableCell>
                           </TableRow>
                        </TableFooter>
                    </Table>
                </TableContainer>

                <Typography variant="h5" component="h3" sx={{ mt: 4, mb: 2 }}>Dettaglio Giornaliero</Typography>
                <TableContainer component={Paper} elevation={0} variant="outlined">
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={headerCellStyle}>Data</TableCell>
                                <TableCell sx={headerCellStyle}>Destinazione</TableCell>
                                <TableCell sx={headerCellStyle}>Descrizione</TableCell>
                                <TableCell sx={headerCellStyle} align="right">Ore Tot.</TableCell>
                                <TableCell sx={headerCellStyle} align="right">Ord.</TableCell>
                                <TableCell sx={headerCellStyle} align="right">Straord.</TableCell>
                                <TableCell sx={headerCellStyle} align="right">Guadagno</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rapportini.map((r) => (
                                <TableRow key={r.id}>
                                    <TableCell>{dayjs(isFirestoreTimestamp(r.data) ? r.data.toDate() : r.data).format('DD/MM/YY')}</TableCell>
                                    <TableCell>{(r.naveId ? naviMap[r.naveId] : null) || (r.luogoId ? luoghiMap[r.luogoId] : null) || 'N/D'}</TableCell>
                                    <TableCell>{r.descrizioneBreve}</TableCell>
                                    <TableCell align="right">{r.oreGiorno?.toFixed(2) ?? '-'}</TableCell>
                                    <TableCell align="right">{r.oreOrdinarie && r.oreOrdinarie > 0 ? r.oreOrdinarie.toFixed(2) : '-'}</TableCell>
                                    <TableCell align="right">{r.oreStraordinario && r.oreStraordinario > 0 ? r.oreStraordinario.toFixed(2) : '-'}</TableCell>
                                    <TableCell align="right">{r.guadagno ? formatCurrency(r.guadagno) : '-'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                        <TableFooter>
                           <TableRow>
                               <TableCell colSpan={3} sx={footerCellStyle} align="right">TOTALI</TableCell>
                               <TableCell sx={footerCellStyle} align="right">{totalOreGiorno.toFixed(2)}</TableCell>
                               <TableCell sx={footerCellStyle} align="right">{totalOreOrdinarie.toFixed(2)}</TableCell>
                               <TableCell sx={footerCellStyle} align="right">{totalOreStraordinario.toFixed(2)}</TableCell>
                               <TableCell sx={footerCellStyle} align="right">{formatCurrency(totalGuadagno)}</TableCell>
                           </TableRow>
                        </TableFooter>
                    </Table>
                </TableContainer>
            </Paper>
        </Box>
    );
};

export default GeneratedReportView;
