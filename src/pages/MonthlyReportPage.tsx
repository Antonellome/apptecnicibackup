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
import { Rapportino, EnrichedRapportino, TariffaLocale, RiepilogoMese, DettaglioVoce, UserProfile, MasterData } from '@/models/definitions';
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
import { useMasterData } from '@/hooks/useMasterData';
import MonthlyReportSkeleton from '@/components/Rapportini/MonthlyReportSkeleton';

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

interface MonthlyReportContentProps {
    userProfile: UserProfile;
    masterData: MasterData;
    currentMonth: Date;
    isGeneratingPdf: boolean;
    setIsGeneratingPdf: (isGenerating: boolean) => void;
}

const MonthlyReportContent = ({ 
    userProfile, 
    masterData, 
    currentMonth,
    isGeneratingPdf,
    setIsGeneratingPdf
}: MonthlyReportContentProps) => {
    const { showSnackbar } = useSnackbar();
    const [pdfPreviewBlob, setPdfPreviewBlob] = useState<Blob | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    const rapportiniLocali = useLiveQuery(() => {
        const start = startOfMonth(currentMonth);
        const end = endOfMonth(currentMonth);
        return db.rapportini
            .where('data').between(start, end, true, true)
            .filter(r => (r.presenze || []).includes(userProfile.tecnicoId))
            .sortBy('data');
    }, [currentMonth, userProfile.tecnicoId]);

    const rapportiniArricchiti = useMemo<EnrichedRapportino[] | null>(() => {
        if (!rapportiniLocali) return null;
        const tipiGiornataMap = new Map(masterData.tipiGiornata.map((t) => [t.id, t]));
        const naviMap = new Map(masterData.navi.map((n) => [n.id, n.nome]));
        const luoghiMap = new Map(masterData.luoghi.map((l) => [l.id, l.nome]));
        
        return (rapportiniLocali as Rapportino[]).map(report => {
            const tipoGiornata = tipiGiornataMap.get(report.tipoGiornataId);
            const isDailyRate = tipoGiornata?.nome.toLowerCase().includes('ferie') || tipoGiornata?.nome.toLowerCase().includes('festivo');

            let oreLavoro = 0;
            if (isDailyRate) {
                oreLavoro = 8;
            } else {
                const inizio = safeConvertToDate(report.oraInizio);
                const fine = safeConvertToDate(report.oraFine);
                if (inizio && fine) {
                    const pausaInOre = (report.pausa ?? 0) / 60;
                    const diffInMin = differenceInMinutes(fine, inizio);
                    oreLavoro = Math.max(0, (diffInMin / 60) - pausaInOre);
                } else {
                    oreLavoro = report.dettaglioOreTecnici?.find(d => d.tecnicoId === userProfile.tecnicoId)?.ore ?? report.oreLavoro ?? 0;
                }
            }

            return {
                ...report,
                data: new Date(report.data),
                tipoGiornata: tipoGiornata,
                oreGiorno: oreLavoro,
                naveNome: report.naveId ? naviMap.get(report.naveId) : undefined,
                luogoNome: report.luogoId ? luoghiMap.get(report.luogoId) : undefined,
            } as EnrichedRapportino;
        });
    }, [rapportiniLocali, masterData, userProfile.tecnicoId]);

    const riepilogoMese = useMemo<RiepilogoMese | null>(() => {
        if (!rapportiniArricchiti) return null;
        if (rapportiniArricchiti.length === 0) return {
          oreTotali: 0, costoTotale: 0, giorniTotaliLavorati: 0, dettaglio: new Map(),
          giorniLavorati: 0, giorniStraordinario: 0, giorniFerie: 0, giorniMalattia: 0,
          giorniPermesso: 0, giorniFestivo: 0, giorniTrasferta: 0, giorniLavoratiUnici: 0,
          oreOrdinarie: 0, oreStraordinarie: 0,
        };

        const tariffe = masterData.impostazioni.tariffe as TariffaLocale[];
        const tariffeMap = new Map(tariffe.map(t => [t.id, t]));
        const tipiGiornataMap = new Map(masterData.tipiGiornata.map(t => [t.id, t]));
    
        const sforoId = 'straordinario-sforo-virtuale';
        const tipoGiornataOrdinaria = masterData.tipiGiornata.find(t => t.nome.toLowerCase() === 'ordinaria')!;
        const tariffaStraordinario = tariffe.find(t => t.nome.toLowerCase() === 'straordinario');
    
        const dataAggregati = new Map<string, { ore: number; giorni: Set<string> }>();
        const dailyTotals = new Map<string, { oreOrdinarie: number }>();
    
        for (const report of rapportiniArricchiti) {
            if (!report.tipoGiornata) continue;
            const dayKey = format(new Date(report.data), 'yyyy-MM-dd');
    
            if (!dataAggregati.has(report.tipoGiornata.id)) {
                dataAggregati.set(report.tipoGiornata.id, { ore: 0, giorni: new Set() });
            }
            const voce = dataAggregati.get(report.tipoGiornata.id)!;
            voce.ore += report.oreGiorno;
            voce.giorni.add(dayKey);

            if (report.tipoGiornata.id === tipoGiornataOrdinaria.id) {
                const daily = dailyTotals.get(dayKey) || { oreOrdinarie: 0 };
                daily.oreOrdinarie += report.oreGiorno;
                dailyTotals.set(dayKey, daily);
            }
        }
    
        let sforoTotaleOre = 0;
        const giorniSforo = new Set<string>();
    
        dailyTotals.forEach((day, dayKey) => {
            const sforoGiorno = Math.max(0, day.oreOrdinarie - 8);
            if (sforoGiorno > 0) {
                sforoTotaleOre += sforoGiorno;
                giorniSforo.add(dayKey);

                const voceOrdinaria = dataAggregati.get(tipoGiornataOrdinaria.id)!;
                voceOrdinaria.ore -= sforoGiorno;
            }
        });
    
        if (sforoTotaleOre > 0) {
            dataAggregati.set(sforoId, { ore: sforoTotaleOre, giorni: giorniSforo });
        }

        const riepilogoFinale: RiepilogoMese = {
          oreTotali: 0, costoTotale: 0, giorniTotaliLavorati: 0, dettaglio: new Map(),
          giorniLavorati: 0, giorniStraordinario: 0, giorniFerie: 0, giorniMalattia: 0,
          giorniPermesso: 0, giorniFestivo: 0, giorniTrasferta: 0, giorniLavoratiUnici: 0,
          oreOrdinarie: 0, oreStraordinarie: 0,
        };
        let costoTotaleAcc = 0;
        let oreTotaliAcc = 0;
        const giorniLavoratiSet = new Set<string>();

        dataAggregati.forEach((val, key) => {
            const tariffa = tariffeMap.get(key);
            const tipoGiornata = tipiGiornataMap.get(key);
            const unita = tariffa?.unita || 'h';
            const nome = tipoGiornata?.nome || (key === sforoId ? 'Straordinario (>8h)' : 'N/D');
            const colore = tipoGiornata?.colore || '';

            let costoVoce = 0;
            let costoUnitario = 0;

            if (key === sforoId) {
                costoUnitario = tariffaStraordinario?.costo ?? 0;
            } else if (tariffa) {
                costoUnitario = tariffa.costo;
            }

            if (nome.toLowerCase().includes('trasferta')) {
                costoVoce = val.giorni.size * costoUnitario;
            } else if (unita === 'g') {
                 costoVoce = val.giorni.size * costoUnitario;
            } else {
                costoVoce = val.ore * costoUnitario;
            }
            
            if (!nome.toLowerCase().includes('trasferta')) {
                oreTotaliAcc += val.ore;
                val.giorni.forEach(g => giorniLavoratiSet.add(g));
            }
            costoTotaleAcc += costoVoce;
            
            riepilogoFinale.dettaglio.set(key, {
                id: key, nome, colore, unita, oreTotali: val.ore, giorni: val.giorni.size,
                costo: costoVoce, tipo: tipoGiornata?.tipo ?? 'oraria', lavorativo: tipoGiornata?.lavorativo ?? false,
                icona: tipoGiornata?.icona ?? '',
            } as DettaglioVoce);
        });

        riepilogoFinale.costoTotale = costoTotaleAcc;
        riepilogoFinale.oreTotali = oreTotaliAcc;
        riepilogoFinale.giorniTotaliLavorati = giorniLavoratiSet.size;
    
        return riepilogoFinale;
    }, [rapportiniArricchiti, masterData]);

    const reportDays = useMemo(() => {
        return rapportiniArricchiti?.map(r => r.data) ?? [];
    }, [rapportiniArricchiti]);

    const handleGenerateMonthlyReport = async () => {
        if (!rapportiniArricchiti || !riepilogoMese) {
            showSnackbar('Nessun dato valido da includere nel PDF.', 'info');
            return;
        }
        const tecnico = masterData.tecnici.find(t => t.id === userProfile.tecnicoId);
        if (!tecnico) {
            showSnackbar('Profilo tecnico non trovato.', 'error');
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
        } finally {
            setIsPreviewOpen(false);
        }
    };

    const isCalculating = rapportiniLocali === undefined || rapportiniArricchiti === null || riepilogoMese === null;

    if (isCalculating) {
        return <MonthlyReportSkeleton />;
    }

    const hasData = riepilogoMese && (riepilogoMese.oreTotali > 0 || riepilogoMese.costoTotale > 0);

    return (
        <>
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
                            disabled={isGeneratingPdf || !hasData}
                        >Genera Mensile</Button>
                        </span>
                    </Tooltip>
                </Grid>
            </Grid>
            
            <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 4 }}>
                    <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
                        <Typography variant="h5" gutterBottom>Calendario</Typography>
                        <MonthlyCalendarView currentMonth={currentMonth} reportDays={reportDays} />
                    </Paper>
                </Grid>
                <Grid size={{ xs: 12, md: 8 }}>
                    {!hasData ? (
                        <Paper sx={{ p: 4, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <Typography variant="h6">Nessun dato per questo mese</Typography>
                            <Typography color="text.secondary">Non sono stati trovati rapportini per il periodo selezionato.</Typography>
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
                                                    <TableCell><Typography fontWeight="bold">Giorni Lavorati</Typography></TableCell>
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
                            <Grid sx={{ mt: 2 }} size={{ xs: 12 }}>
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
                fileName={`Riepilogo_Mensile_${userProfile.cognome}_${format(currentMonth, 'MMMM_yyyy', { locale: it })}.pdf`}
                onShare={handleShareFromPreview}
            />
        </>
    );
}

const MonthlyReportPage = () => {
    const { userProfile } = useAuth();
    const { masterData, loading: masterDataLoading } = useMasterData();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    
    const handleMonthChange = (increment: number) => {
        setCurrentMonth(prev => increment > 0 ? addMonths(prev, 1) : subMonths(prev, 1));
    };

    const isNextButtonDisabled = isSameMonth(currentMonth, new Date());
    
    if (masterDataLoading || !userProfile || !masterData) {
        return <FullScreenLoader />;
    }

    return (
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
             <Paper sx={{ mb: 2, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Button variant="outlined" onClick={() => handleMonthChange(-1)}>Mese Prec.</Button>
                <Typography variant="h6">{format(currentMonth, 'MMMM yyyy', { locale: it })}</Typography>
                <Button variant="outlined" onClick={() => handleMonthChange(1)} disabled={isNextButtonDisabled}>Mese Succ.</Button>
            </Paper>

            <MonthlyReportContent 
                userProfile={userProfile}
                masterData={masterData}
                currentMonth={currentMonth}
                isGeneratingPdf={isGeneratingPdf}
                setIsGeneratingPdf={setIsGeneratingPdf}
            />
        </Box>
    );
};

export default MonthlyReportPage;
