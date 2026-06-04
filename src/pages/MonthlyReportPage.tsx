
import { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Grid,
  CircularProgress,
  Tooltip
} from '@mui/material';
import { PictureAsPdf as PdfIcon } from '@mui/icons-material';
import { format, startOfMonth, endOfMonth, subMonths, addMonths, isSameMonth } from 'date-fns';
import { it } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import { Rapportino, EnrichedRapportino, TariffaLocale, MasterData, Tecnico } from '@/models/definitions';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/local-db';
import ActivityBreakdown from '@/components/Rapportini/ActivityBreakdown';
import DettaglioCostiTipoGiornata from '@/components/Rapportini/DettaglioCostiTipoGiornata';
import FullScreenLoader from '@/components/FullScreenLoader';
import { generateMonthlyReportPDF } from '@/services/monthlyReportGenerator';
import { shareOrDownload } from '@/services/shareService';
import { useSnackbar } from '@/contexts/SnackbarContext';


// --- STRUTTURA DATI (INVARIATA) ---
export interface RiepilogoMese {
    oreTotali: number;
    costoTotale: number;
    dettaglio: Map<string, { // la chiave è tipoGiornataId
        nome: string;
        colore: string;
        oreOrdinarie: number;
        oreStraordinario: number;
        costo: number;
        unita: 'g' | 'h';
        giorni: number;
    }>;
}

const MonthlyReportPage = () => {
    const { userProfile } = useAuth();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const { showSnackbar } = useSnackbar();

    const localAnagrafiche = useLiveQuery(() => db.anagrafiche.toArray(), [], null);
    const impostazioniLocali = useLiveQuery(() => db.tariffe_locali.get('main'), [], null);

    const masterData = useMemo<MasterData | null>(() => {
        if (!localAnagrafiche || !impostazioniLocali) return null;
        
        const data: { [key: string]: any[] } = {};
        localAnagrafiche.forEach(item => { data[item.id] = item.data; });
        
        return {
            ...data,
            impostazioni: impostazioniLocali.data,
        } as MasterData;

    }, [localAnagrafiche, impostazioniLocali]);

    const rapportiniLocali = useLiveQuery(() => {
        if (!userProfile) return [];
        const start = startOfMonth(currentMonth);
        const end = endOfMonth(currentMonth);
        return db.rapportini
            .where('data').between(start, end, true, true)
            .filter(r => (r.presenze || []).includes(userProfile.tecnicoId))
            .sortBy('data');
    }, [userProfile, currentMonth], [] as Rapportino[]);

    const rapportiniArricchiti = useMemo(() => {
        if (!rapportiniLocali || !masterData || !userProfile) return [];

        const tipiGiornataMap = new Map(masterData.tipiGiornata.map((t) => [t.id, t]));
        const naviMap = new Map(masterData.navi.map((n) => [n.id, n.nome]));
        const luoghiMap = new Map(masterData.luoghi.map((l) => [l.id, l.nome]));
        
        return rapportiniLocali.map(report => {
            const oreLavoro = report.dettaglioOreTecnici?.find(d => d.tecnicoId === userProfile.tecnicoId)?.ore ?? report.oreLavoro ?? 0;
            const tipoGiornata = tipiGiornataMap.get(report.tipoGiornataId);
            
            return {
                ...report,
                data: new Date(report.data),
                tipoGiornata: tipoGiornata,
                oreGiorno: oreLavoro,
                naveNome: report.naveId ? naviMap.get(report.naveId) : undefined,
                luogoNome: report.luogoId ? luoghiMap.get(report.luogoId) : undefined,
            } as EnrichedRapportino;
        });
    }, [rapportiniLocali, masterData, userProfile]);

    const riepilogoMese = useMemo<RiepilogoMese | null>(() => {
        if (!rapportiniArricchiti.length || !masterData || !userProfile) return null;

        const tariffe = masterData.impostazioni.tariffe as TariffaLocale[];
        const tariffeMap = new Map(tariffe.map(t => [t.tipoGiornataId, t]));
        const tariffaOrdinaria = tariffe.find(t => t.nome.toLowerCase() === 'ordinaria');
        const tariffaStraordinaria = tariffe.find(t => t.nome.toLowerCase() === 'straordinario');

        const riepilogo: RiepilogoMese = { oreTotali: 0, costoTotale: 0, dettaglio: new Map() };

        for (const report of rapportiniArricchiti) {
            if (!report.tipoGiornata) continue;
            const oreGiorno = report.oreGiorno ?? 0;
            const tariffaCorrente = tariffeMap.get(report.tipoGiornata.id);
            if (!tariffaCorrente || (oreGiorno === 0 && tariffaCorrente.unita !== 'g')) continue;

            riepilogo.oreTotali += oreGiorno;

            let costoGiorno = 0;
            let oreOrdinarieLoop = 0;
            let oreStraordinarieLoop = 0;

            if (tariffaCorrente.unita === 'g') {
                costoGiorno = tariffaCorrente.costo;
                oreOrdinarieLoop = 8;
            } else {
                const tipoGiornataNome = report.tipoGiornata.nome.toLowerCase();

                if (['ordinaria', 'trasferta italia', 'trasferta europa', 'trasferta extraeuropea'].includes(tipoGiornataNome)) {
                    oreOrdinarieLoop = Math.min(oreGiorno, 8);
                    oreStraordinarieLoop = Math.max(0, oreGiorno - 8);
                    
                    const costoStraordinario = tariffaStraordinaria?.costo ?? tariffaOrdinaria?.costo ?? 0;
                    const costoOre = (oreOrdinarieLoop * (tariffaOrdinaria?.costo ?? 0)) + (oreStraordinarieLoop * costoStraordinario);
                    costoGiorno = tipoGiornataNome.startsWith('trasferta') ? costoOre + tariffaCorrente.costo : costoOre;

                } else if (tipoGiornataNome === 'straordinario') {
                    oreStraordinarieLoop = oreGiorno;
                    costoGiorno = oreGiorno * (tariffaStraordinaria?.costo ?? 0);
                } else {
                    oreOrdinarieLoop = oreGiorno;
                    costoGiorno = oreGiorno * tariffaCorrente.costo;
                }
            }
            
            riepilogo.costoTotale += costoGiorno;
            const dettaglioGiorno = riepilogo.dettaglio.get(report.tipoGiornata.id) || { nome: report.tipoGiornata.nome, colore: report.tipoGiornata.colore || '#808080', oreOrdinarie: 0, oreStraordinario: 0, costo: 0, unita: tariffaCorrente.unita, giorni: 0 };
            dettaglioGiorno.oreOrdinarie += oreOrdinarieLoop;
            dettaglioGiorno.oreStraordinario += oreStraordinarieLoop;
            dettaglioGiorno.costo += costoGiorno;
            if (oreGiorno > 0 || tariffaCorrente.unita === 'g') { dettaglioGiorno.giorni += 1; }
            riepilogo.dettaglio.set(report.tipoGiornata.id, dettaglioGiorno);
        }
        return riepilogo.oreTotali > 0 || riepilogo.dettaglio.size > 0 ? riepilogo : null;
    }, [rapportiniArricchiti, masterData, userProfile]);

    const handleMonthChange = (increment: number) => {
        setCurrentMonth(prev => increment > 0 ? addMonths(prev, 1) : subMonths(prev, 1));
    };
    
    const handleGenerateMonthlyReport = async () => {
        if (!rapportiniArricchiti || rapportiniArricchiti.length === 0 || !riepilogoMese) {
            showSnackbar('Nessun dato valido da includere nel PDF.', 'info');
            return;
        }

        const tecnico = masterData?.tecnici?.find(t => t.id === userProfile?.tecnicoId);

        if (!tecnico) {
            showSnackbar('Profilo tecnico non trovato nei dati locali.', 'error');
            return;
        }
    
        setIsGeneratingPdf(true);
        try {
            const pdfBlob = await generateMonthlyReportPDF(rapportiniArricchiti, riepilogoMese, tecnico, currentMonth);
            const fileName = `Riepilogo_Mensile_${tecnico.cognome}_${format(currentMonth, 'MMMM_yyyy', { locale: it })}.pdf`;
            await shareOrDownload(pdfBlob, fileName);
        } catch (error) {
            console.error("Errore durante la generazione del PDF mensile:", error);
            showSnackbar('Si è verificato un errore durante la creazione del report.', 'error');
        } finally {
            setIsGeneratingPdf(false);
        }
      };

    const isNextButtonDisabled = isSameMonth(currentMonth, new Date());
    const isLoadingPage = !localAnagrafiche || !impostazioniLocali || !masterData;

    if (isLoadingPage) {
        return <FullScreenLoader />;
    }

    return (
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
            <Grid container justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Grid size="auto">
                    <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
                        Report Mensile
                    </Typography>
                </Grid>
                <Grid size="auto">
                    <Tooltip title="Genera riepilogo PDF del mese corrente">
                        <span> {/* Span necessario per il Tooltip su un bottone disabilitato */}
                        <Button 
                            variant="outlined" 
                            startIcon={isGeneratingPdf ? <CircularProgress size={20}/> : <PdfIcon/>}
                            onClick={handleGenerateMonthlyReport}
                            disabled={isGeneratingPdf || !riepilogoMese}
                        >
                        Genera Mensile
                        </Button>
                        </span>
                    </Tooltip>
                </Grid>
            </Grid>

            <Paper sx={{ mb: 2, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Button variant="outlined" onClick={() => handleMonthChange(-1)}>Mese Prec.</Button>
                <Typography variant="h6">{format(currentMonth, 'MMMM yyyy', { locale: it })}</Typography>
                <Button variant="outlined" onClick={() => handleMonthChange(1)} disabled={isNextButtonDisabled}>Mese Succ.</Button>
            </Paper>
            {!riepilogoMese && (
                 <Paper sx={{ p: 4, textAlign: 'center' }}>
                     <Typography variant="h6">Nessun dato per questo mese</Typography>
                     <Typography color="text.secondary">Non sono stati trovati rapportini nella cache locale per il periodo selezionato.</Typography>
                 </Paper>
            )}
            {riepilogoMese && (
                 <Grid container spacing={3}>
                    <Grid
                        size={{
                            xs: 12,
                            md: 5,
                            lg: 4
                        }}>
                        <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
                            <Typography variant="h5" gutterBottom>Riepilogo</Typography>
                            <TableContainer component={Paper} variant="outlined">
                                <Table size="small">
                                    <TableBody>
                                        <TableRow>
                                            <TableCell><Typography fontWeight="bold">Ore Totali</Typography></TableCell>
                                            <TableCell align="right"><Typography variant="h6">{riepilogoMese.oreTotali.toFixed(2)}</Typography></TableCell>
                                        </TableRow>
                                        <TableRow sx={{ backgroundColor: 'primary.lighter' }}>
                                            <TableCell><Typography fontWeight="bold">Costo Stimato</Typography></TableCell>
                                            <TableCell align="right"><Typography variant="h5" color="primary.main" fontWeight="bold">€ {riepilogoMese.costoTotale.toFixed(2)}</Typography></TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>
                    </Grid>
                    <Grid
                        size={{
                            xs: 12,
                            md: 7,
                            lg: 8
                        }}>
                        <DettaglioCostiTipoGiornata dettaglio={riepilogoMese.dettaglio} />
                    </Grid>
                    <Grid sx={{ mt: 2 }} size={12}>
                        <ActivityBreakdown riepilogo={riepilogoMese} />
                    </Grid>
                </Grid>
            )}
        </Box>
    );
};

export default MonthlyReportPage;
