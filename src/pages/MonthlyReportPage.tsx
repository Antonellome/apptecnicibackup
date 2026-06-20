
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
import { Rapportino, EnrichedRapportino, UserProfile, MasterData, RiepilogoMese, Impostazioni } from '@/models/definitions';
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
            .filter(r => (r.presenze || []).includes(userProfile.tecnicoId) || r.tecnicoId === userProfile.tecnicoId)
            .sortBy('data');
    }, [currentMonth, userProfile.tecnicoId]);

    const rapportiniArricchiti = useMemo<EnrichedRapportino[] | null>(() => {
        if (!rapportiniLocali || !masterData) return null;

        const tipiGiornataMap = new Map(masterData.tipiGiornata.map((t) => [t.id, t]));
        
        return (rapportiniLocali as Rapportino[]).map(report => {
            const tipoGiornata = tipiGiornataMap.get(report.tipoGiornataId);
            
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
                tipoGiornata: tipoGiornata,
                oreGiorno: oreLavoro,
            } as EnrichedRapportino;
        });
    }, [rapportiniLocali, masterData, userProfile.tecnicoId]);

    const riepilogoMese = useMemo<RiepilogoMese | null>(() => {
    if (!rapportiniArricchiti || !masterData) return null;

    const TIPO_ORDINARIA_ID = masterData.tipiGiornata.find(t => t.nome.toLowerCase() === 'ordinaria')?.id;
    const TIPO_STRAORDINARIA_ID = masterData.tipiGiornata.find(t => t.nome.toLowerCase() === 'straordinario')?.id;
    const SFORO_ID = 'virtual-sforo-straordinario';
    
    const TARIFFE_MAP = new Map((masterData.impostazioni as Impostazioni).tariffe.map(t => [t.id, t]));
    const TIPI_GIORNATA_MAP = new Map(masterData.tipiGiornata.map(t => [t.id, t]));

    if (!TIPO_ORDINARIA_ID || !TIPO_STRAORDINARIA_ID) {
        console.error("Tipi giornata base (Ordinaria, Straordinario) non trovati!");
        return null;
    }

    const riepilogo: RiepilogoMese = {
        oreTotali: 0, costoTotale: 0, giorniTotaliLavorati: 0, dettaglio: new Map(),
        oreOrdinarie: 0, oreStraordinarie: 0,
    };

    masterData.tipiGiornata.forEach(tipo => {
        riepilogo.dettaglio.set(tipo.id, {
            id: tipo.id, nome: tipo.nome, colore: tipo.colore, 
            unita: tipo.tipo === 'giornaliera' ? 'g' : 'h', 
            oreTotali: 0, giorni: 0, costo: 0, giorniSet: new Set<string>(),
        });
    });
    riepilogo.dettaglio.set(SFORO_ID, {
        id: SFORO_ID, nome: 'Straordinario (>8h)', colore: TIPI_GIORNATA_MAP.get(TIPO_STRAORDINARIA_ID)?.colore || '#ff8c00',
        unita: 'h', oreTotali: 0, giorni: 0, costo: 0, giorniSet: new Set<string>(),
    });

    if (rapportiniArricchiti.length === 0) {
        riepilogo.dettaglio.forEach(voce => { voce.giorni = voce.giorniSet?.size || 0; delete voce.giorniSet; });
        return riepilogo;
    }
    
    const dailyData = new Map<string, { orePerSforo: number, tipiPresenti: Set<string> }>();
    const allDaysOfPresence = new Set<string>();

    for (const report of rapportiniArricchiti) {
        if (!report.tipoGiornata) continue;
        const dayKey = format(report.data, 'yyyy-MM-dd');
        allDaysOfPresence.add(dayKey);

        let daySummary = dailyData.get(dayKey);
        if (!daySummary) {
            daySummary = { orePerSforo: 0, tipiPresenti: new Set() };
            dailyData.set(dayKey, daySummary);
        }

        daySummary.tipiPresenti.add(report.tipoGiornata.id);

        const nomeTipo = report.tipoGiornata.nome.toLowerCase();
        if (report.tipoGiornata.id === TIPO_ORDINARIA_ID || nomeTipo.includes('trasferta')) {
            daySummary.orePerSforo += report.oreGiorno;
        } else {
            const voce = riepilogo.dettaglio.get(report.tipoGiornata.id);
            if (voce) {
                voce.oreTotali += report.oreGiorno;
            }
        }
    }

    dailyData.forEach((summary, dayKey) => {
        const sforo = Math.max(0, summary.orePerSforo - 8);
        const oreOrdinarieEffettive = summary.orePerSforo - sforo;
        
        const voceOrdinaria = riepilogo.dettaglio.get(TIPO_ORDINARIA_ID)!;
        voceOrdinaria.oreTotali += oreOrdinarieEffettive;
        
        if (sforo > 0) {
            const voceSforo = riepilogo.dettaglio.get(SFORO_ID)!;
            voceSforo.oreTotali += sforo;
            if(voceSforo.giorniSet) voceSforo.giorniSet.add(dayKey);
        }

        summary.tipiPresenti.forEach(tipoId => {
            const voce = riepilogo.dettaglio.get(tipoId);
            if (voce && voce.giorniSet) voce.giorniSet.add(dayKey);
        });
    });

    let costoTotaleFinale = 0;
    const tariffaSforo = TARIFFE_MAP.get(TIPO_STRAORDINARIA_ID);

    riepilogo.dettaglio.forEach(voce => {
        voce.giorni = voce.giorniSet?.size || 0;
        delete voce.giorniSet;

        let costoUnitario = 0;
        if (voce.id === SFORO_ID) {
            costoUnitario = tariffaSforo?.costo ?? 0;
        } else {
            const tariffa = TARIFFE_MAP.get(voce.id);
            costoUnitario = tariffa?.costo ?? 0;
        }
        
        const nomeVoceLower = voce.nome.toLowerCase();
        if ((voce.unita === 'g' && !nomeVoceLower.includes('trasferta')) || nomeVoceLower === 'ferie' || nomeVoceLower === 'festivo') {
             voce.costo = (voce.oreTotali / 8) * costoUnitario;
        } else if (nomeVoceLower.includes('trasferta')) {
            voce.costo = voce.giorni * costoUnitario;
        } else {
            voce.costo = voce.oreTotali * costoUnitario;
        }
        costoTotaleFinale += voce.costo;
    });

    const oreOrdinarieFinali = riepilogo.dettaglio.get(TIPO_ORDINARIA_ID)!.oreTotali;
    const oreStraordinarioEsplicito = riepilogo.dettaglio.get(TIPO_STRAORDINARIA_ID)?.oreTotali || 0;
    const oreStraordinarioSforo = riepilogo.dettaglio.get(SFORO_ID)!.oreTotali;
    riepilogo.oreStraordinarie = oreStraordinarioEsplicito + oreStraordinarioSforo;
    
    let oreComplessive = 0;
    riepilogo.dettaglio.forEach(voce => {
        if (!voce.nome.toLowerCase().includes('trasferta')) {
            oreComplessive += voce.oreTotali;
        }
    });
    
    riepilogo.costoTotale = costoTotaleFinale;
    riepilogo.oreTotali = oreComplessive;
    riepilogo.giorniTotaliLavorati = allDaysOfPresence.size;
    riepilogo.oreOrdinarie = oreOrdinarieFinali;

    return riepilogo;
}, [rapportiniArricchiti, masterData]);

    const reportDays = useMemo(() => {
        if (!rapportiniArricchiti) return [];
        return rapportiniArricchiti.map(r => r.data);
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

    const isCalculating = rapportiniLocali === undefined || rapportiniArricchiti === null;

    if (isCalculating) {
        return <MonthlyReportSkeleton />;
    }
    
    const hasData = riepilogoMese && (riepilogoMese.oreTotali > 0 || riepilogoMese.giorniTotaliLavorati > 0);

    return (
        <>
            <Grid container justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Grid size={{ xs: 6 }}>
                    <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
                        Report Mensile
                    </Typography>
                </Grid>
                <Grid size={{ xs: 6 }} sx={{ textAlign: 'right' }}>
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
                        riepilogoMese && (
                            <Grid container spacing={3}>
                                <Grid size={{ xs: 12, lg: 6 }}>
                                    <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
                                        <Typography variant="h5" gutterBottom>Riepilogo</Typography>
                                        <TableContainer component={Paper} variant="outlined">
                                            <Table size="small">
                                                <TableBody>
                                                    <TableRow>
                                                        <TableCell><Typography fontWeight="bold">Ore Lavorate</Typography></TableCell>
                                                        <TableCell align="right"><Typography variant="h6">{riepilogoMese.oreTotali.toFixed(2)}</Typography></TableCell>
                                                    </TableRow>
                                                    <TableRow>
                                                        <TableCell><Typography fontWeight="bold">Giorni di Presenza</Typography></TableCell>
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
                        )
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
    const { masterData } = useMasterData();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    
    if (!userProfile || !masterData) {
        return <FullScreenLoader />;
    }
    
    const handleMonthChange = (increment: number) => {
        setCurrentMonth(prev => increment > 0 ? addMonths(prev, 1) : subMonths(prev, 1));
    };

    const isNextButtonDisabled = isSameMonth(currentMonth, new Date());

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
