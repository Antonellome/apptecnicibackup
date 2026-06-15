
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
import { format, startOfMonth, endOfMonth, subMonths, addMonths, isSameMonth, differenceInMinutes } from 'date-fns';
import { it } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import { Rapportino, EnrichedRapportino, TariffaLocale, TipoGiornata } from '@/models/definitions';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/local-db';
import ActivityBreakdown from '@/components/Rapportini/ActivityBreakdown';
import DettaglioOreTipoGiornata from '@/components/Rapportini/DettaglioOreTipoGiornata';
import FullScreenLoader from '@/components/FullScreenLoader';
import { generateMonthlyReportPDF } from '@/services/monthlyReportGenerator';
import { shareOrDownload } from '@/services/shareService';
import { useSnackbar } from '@/contexts/SnackbarContext';
import MonthlyCalendarView from '@/components/Rapportini/MonthlyCalendarView';
import PdfPreviewModal from '@/components/Rapportini/PdfPreviewModal';
import { useMasterData } from '@/hooks/useMasterData'; // <-- IMPORTIAMO LA FONTE DI VERITÀ

// --- NUOVE STRUTTURE DATI ---
export interface DettaglioVoce {
    nome: string;
    colore: string;
    oreTotali: number;
    giorni: number;
    costo: number;
    unita: 'g' | 'h';
    id: string; // Aggiunto per lookup affidabile
}
export interface RiepilogoMese {
    oreTotali: number;
    costoTotale: number;
    giorniTotaliLavorati: number;
    dettaglio: Map<string, DettaglioVoce>;
}

const safeConvertToDate = (dateSource: any): Date | null => {
    if (!dateSource) return null;
    if (typeof dateSource === 'object' && dateSource !== null && typeof dateSource.seconds === 'number') {
        return new Date(dateSource.seconds * 1000);
    }
    const d = new Date(dateSource);
    if (!isNaN(d.getTime())) {
        return d;
    }
    return null;
};


const MonthlyReportPage = () => {
    const { userProfile } = useAuth();
    const { masterData, loading: masterDataLoading } = useMasterData();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const { showSnackbar } = useSnackbar();
    const [pdfPreviewBlob, setPdfPreviewBlob] = useState<Blob | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

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
        if (!rapportiniLocali || !masterData || !masterData.tipiGiornata || !masterData.navi || !masterData.luoghi || !userProfile) return [];
        const tipiGiornataMap = new Map(masterData.tipiGiornata.map((t) => [t.id, t]));
        const naviMap = new Map(masterData.navi.map((n) => [n.id, n.nome]));
        const luoghiMap = new Map(masterData.luoghi.map((l) => [l.id, l.nome]));
        
        return rapportiniLocali.map(report => {
            let oreLavoro = 0;
            const inizio = safeConvertToDate(report.oraInizio);
            const fine = safeConvertToDate(report.oraFine);

            if (inizio && fine) {
                const pausaInOre = (report.pausa ?? 0) / 60;
                const diffInMin = differenceInMinutes(fine, inizio);
                oreLavoro = Math.max(0, (diffInMin / 60) - pausaInOre);
            } else {
                oreLavoro = report.dettaglioOreTecnici?.find(d => d.tecnicoId === userProfile.tecnicoId)?.ore ?? report.oreLavoro ?? 0;
            }

            return {
                ...report,
                data: new Date(report.data),
                tipoGiornata: tipiGiornataMap.get(report.tipoGiornataId),
                oreGiorno: oreLavoro,
                naveNome: report.naveId ? naviMap.get(report.naveId) : undefined,
                luogoNome: report.luogoId ? luoghiMap.get(report.luogoId) : undefined,
            } as EnrichedRapportino;
        });
    }, [rapportiniLocali, masterData, userProfile]);

    const riepilogoMese = useMemo<RiepilogoMese | null>(() => {
        if (!rapportiniArricchiti.length || !masterData || !userProfile || !masterData.impostazioni || !masterData.tipiGiornata) return null;

        const tariffeMap = new Map(masterData.impostazioni.tariffe.map(t => [t.id, t]));
        const tipoGiornataOrdinaria = masterData.tipiGiornata.find(t => t.nome.toLowerCase() === 'ordinaria')!;
        const tipoGiornataStraordinario = masterData.tipiGiornata.find(t => t.nome.toLowerCase() === 'straordinario')!;
        const trasfertaIds = new Set(masterData.tipiGiornata.filter(t => t.nome.toLowerCase().includes('trasferta')).map(t => t.id));

        const tipoGiornataSforoVirtuale: DettaglioVoce = {
            id: 'straordinario-sforo-virtuale',
            nome: 'Straordinario (Oltre 8h)',
            colore: tipoGiornataStraordinario.colore, 
            unita: 'h',
            oreTotali: 0,
            giorni: 0,
            costo: 0,
        };
        const sforoVirtualeId = tipoGiornataSforoVirtuale.id;

        const riepilogoFinale: RiepilogoMese = { oreTotali: 0, costoTotale: 0, giorniTotaliLavorati: 0, dettaglio: new Map() };
        const riepilogoPerGiorno = new Map<string, { oreOrdinariePool: number, oreStraordinarieEsplicite: number, altriReport: EnrichedRapportino[] }>();

        for (const report of rapportiniArricchiti) {
            if (!report.oreGiorno || report.oreGiorno <= 0 || !report.tipoGiornata) continue;
            const dayKey = format(report.data, 'yyyy-MM-dd');
            if (!riepilogoPerGiorno.has(dayKey)) {
                riepilogoPerGiorno.set(dayKey, { oreOrdinariePool: 0, oreStraordinarieEsplicite: 0, altriReport: [] });
            }
            const dailySummary = riepilogoPerGiorno.get(dayKey)!;

            if (report.tipoGiornata.id === tipoGiornataOrdinaria.id) {
                dailySummary.oreOrdinariePool += report.oreGiorno;
            } else if (report.tipoGiornata.id === tipoGiornataStraordinario.id) {
                dailySummary.oreStraordinarieEsplicite += report.oreGiorno;
            } else {
                dailySummary.altriReport.push(report);
            }
        }
        
        const giorniConSforo = new Set<string>();

        for (const [dayKey, dailySummary] of riepilogoPerGiorno.entries()) {
            const sforo = Math.max(0, dailySummary.oreOrdinariePool - 8);
            const oreOrdinarieDaContabilizzare = dailySummary.oreOrdinariePool - sforo;
            if (sforo > 0) giorniConSforo.add(dayKey);

            if (oreOrdinarieDaContabilizzare > 0) {
                const dettaglio = riepilogoFinale.dettaglio.get(tipoGiornataOrdinaria.id) || { ...tipoGiornataOrdinaria, oreTotali: 0, giorni: 0, costo: 0, unita: 'h' };
                dettaglio.oreTotali += oreOrdinarieDaContabilizzare;
                riepilogoFinale.dettaglio.set(tipoGiornataOrdinaria.id, dettaglio);
            }
            if (dailySummary.oreStraordinarieEsplicite > 0) {
                const dettaglio = riepilogoFinale.dettaglio.get(tipoGiornataStraordinario.id) || { ...tipoGiornataStraordinario, oreTotali: 0, giorni: 0, costo: 0, unita: 'h' };
                dettaglio.oreTotali += dailySummary.oreStraordinarieEsplicite;
                riepilogoFinale.dettaglio.set(tipoGiornataStraordinario.id, dettaglio);
            }
            if (sforo > 0) {
                const dettaglio = riepilogoFinale.dettaglio.get(sforoVirtualeId) || { ...tipoGiornataSforoVirtuale };
                dettaglio.oreTotali += sforo;
                riepilogoFinale.dettaglio.set(sforoVirtualeId, dettaglio);
            }
            for (const report of dailySummary.altriReport) {
                const dettaglio = riepilogoFinale.dettaglio.get(report.tipoGiornata.id) || { ...report.tipoGiornata, oreTotali: 0, giorni: 0, costo: 0, unita: trasfertaIds.has(report.tipoGiornata.id) ? 'g' : 'h' };
                if (!trasfertaIds.has(report.tipoGiornata.id)) {
                    dettaglio.oreTotali += report.oreGiorno;
                }
                riepilogoFinale.dettaglio.set(report.tipoGiornata.id, dettaglio);
            }
        }

        const giorniPerTipo = new Map<string, Set<string>>();
        const giorniLavoratiUnici = new Set<string>();
        for (const report of rapportiniArricchiti) {
            if (report.tipoGiornata && (report.oreGiorno > 0 || trasfertaIds.has(report.tipoGiornata.id))) {
                const dayKey = format(report.data, 'yyyy-MM-dd');
                if (!trasfertaIds.has(report.tipoGiornata.id)) {
                     giorniLavoratiUnici.add(dayKey);
                }
                if (!giorniPerTipo.has(report.tipoGiornata.id)) {
                    giorniPerTipo.set(report.tipoGiornata.id, new Set());
                }
                giorniPerTipo.get(report.tipoGiornata.id)!.add(dayKey);
            }
        }
        
        riepilogoFinale.giorniTotaliLavorati = giorniLavoratiUnici.size;
        let oreTotaliFinali = 0;

        // ===== LA NUOVA LOGICA DI CALCOLO COSTI =====
        riepilogoFinale.costoTotale = 0; // Azzera il totale prima di ricalcolare
        for (const [tipoId, dettaglio] of riepilogoFinale.dettaglio.entries()) {
            const tariffaCorretta = tariffeMap.get(tipoId);
            const costoUnitario = tariffaCorretta?.costo ?? 0;
            const unita = tariffaCorretta?.unita ?? 'h';

            dettaglio.giorni = giorniPerTipo.get(tipoId)?.size ?? 0;
            
            if (unita === 'g') {
                dettaglio.costo = dettaglio.giorni * costoUnitario;
            } else { // 'h'
                dettaglio.costo = dettaglio.oreTotali * costoUnitario;
            }
            
            // Gestione speciale per lo sforo virtuale, che non ha una sua tariffa
            if(tipoId === sforoVirtualeId) {
                 const costoStraordinario = tariffeMap.get(tipoGiornataStraordinario.id)?.costo ?? 0;
                 dettaglio.costo = dettaglio.oreTotali * costoStraordinario;
                 dettaglio.giorni = giorniConSforo.size;
            }

            riepilogoFinale.costoTotale += dettaglio.costo;
            oreTotaliFinali += dettaglio.oreTotali;
        }
        
        riepilogoFinale.oreTotali = oreTotaliFinali;

        return riepilogoFinale.oreTotali > 0 || riepilogoFinale.dettaglio.size > 0 ? riepilogoFinale : null;
    }, [rapportiniArricchiti, masterData, userProfile]);

    const reportDays = useMemo(() => {
        return rapportiniArricchiti.map(r => r.data);
    }, [rapportiniArricchiti]);

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
            setPdfPreviewBlob(pdfBlob);
            setIsPreviewOpen(true);
        } catch (error) {
            console.error("Errore PDF:", error);
            showSnackbar('Errore generazione report.', 'error');
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    const handleShareFromPreview = async (blob: Blob, fileName: string) => {
        try {
            await shareOrDownload(blob, fileName);
        } catch (error) {
            console.error("Errore condivisione:", error);
            showSnackbar('Errore durante la condivisione.', 'error');
        }
    };

    const isNextButtonDisabled = isSameMonth(currentMonth, new Date());

    if (masterDataLoading) {
        return <FullScreenLoader />;
    }

    return (
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
            <Grid container justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Grid>
                    <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
                        Report Mensile
                    </Typography>
                </Grid>
                <Grid>
                    <Tooltip title="Genera riepilogo PDF del mese corrente">
                        <span>
                        <Button 
                            variant="outlined" 
                            startIcon={isGeneratingPdf ? <CircularProgress size={20}/> : <PdfIcon/>}
                            onClick={handleGenerateMonthlyReport}
                            disabled={isGeneratingPdf || !riepilogoMese}
                        >Genera Mensile</Button>
                        </span>
                    </Tooltip>
                </Grid>
            </Grid>

            <Paper sx={{ mb: 2, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Button variant="outlined" onClick={() => handleMonthChange(-1)}>Mese Prec.</Button>
                <Typography variant="h6">{format(currentMonth, 'MMMM yyyy', { locale: it })}</Typography>
                <Button variant="outlined" onClick={() => handleMonthChange(1)} disabled={isNextButtonDisabled}>Mese Succ.</Button>
            </Paper>
            
            <Grid container spacing={3}>
                 <Grid size={{ xs: 12, md: 4 }}>
                     <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
                         <Typography variant="h5" gutterBottom>Calendario</Typography>
                         <MonthlyCalendarView currentMonth={currentMonth} reportDays={reportDays} />
                     </Paper>
                 </Grid>
                 <Grid size={{ xs: 12, md: 8 }}>
                    {!riepilogoMese ? (
                        <Paper sx={{ p: 4, textAlign: 'center', height: '100%' }}>
                            <Typography variant="h6">Nessun dato per questo mese</Typography>
                            <Typography color="text.secondary">Non sono stati trovati rapportini nella cache locale per il periodo selezionato.</Typography>
                        </Paper>
                    ) : (
                        <Grid container spacing={3}>
                            <Grid size={{ xs: 12, lg: 6 }}>
                                <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
                                    <Typography variant="h5" gutterBottom>Riepilogo</Typography>
                                    <TableContainer component={Paper} variant="outlined">
                                        <Table size="small">
                                            <TableBody>
                                                <TableRow>
                                                    <TableCell><Typography fontWeight="bold">Ore Totali</Typography></TableCell>
                                                    <TableCell align="right"><Typography variant="h6">{riepilogoMese.oreTotali.toFixed(2)}</Typography></TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell><Typography fontWeight="bold">Giorni Totali</Typography></TableCell>
                                                    <TableCell align="right"><Typography variant="h6">{riepilogoMese.giorniTotaliLavorati}</Typography></TableCell>
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
                            <Grid size={{ xs: 12, lg: 6 }}>
                                <DettaglioOreTipoGiornata 
                                    dettaglio={riepilogoMese.dettaglio} 
                                    giorniTotali={riepilogoMese.giorniTotaliLavorati}
                                />
                            </Grid>
                            <Grid sx={{ mt: 2 }} size={12}>
                                <ActivityBreakdown riepilogo={riepilogoMese} />
                            </Grid>
                        </Grid>
                    )}
                </Grid>
            </Grid>
            <PdfPreviewModal
                open={isPreviewOpen}
                onClose={() => setIsPreviewOpen(false)}
                pdfBlob={pdfPreviewBlob}
                fileName={`Riepilogo_Mensile_${userProfile?.cognome}_${format(currentMonth, 'MMMM_yyyy', { locale: it })}.pdf`}
                onShare={handleShareFromPreview}
            />
        </Box>
    );
};

export default MonthlyReportPage;
