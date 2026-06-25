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
import { Rapportino, EnrichedRapportino, UserProfile, MasterData, RiepilogoMese, Impostazioni, TipoGiornata } from '@/models/definitions';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/local-db';
import DailyBreakdownTable from '@/components/Rapportini/DailyBreakdownTable';
import RiepilogoCosti from '@/components/Rapportini/RiepilogoCosti';
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

const normalizeText = (value?: string): string =>
    (value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();

const extractLegacyTipoFromReportName = (reportName?: string): string | null => {
    if (!reportName) return null;
    const match = reportName.match(/-\s*(.+)$/);
    if (!match?.[1]) return null;
    return match[1].trim();
};

// Funzione helper per determinare se un tipo di giornata è una trasferta (per retrocompatibilità)
const isLegacyTrasferta = (tipo: TipoGiornata | undefined) => tipo?.nome.toLowerCase().includes('trasferta');
const isTrasfertaTipo = (tipo: TipoGiornata | undefined) => Boolean(tipo && (tipo.categoria === 'trasferta' || isLegacyTrasferta(tipo)));

const calculateHoursFromRange = (oraInizio?: string, oraFine?: string, pausaMinuti?: number): number => {
    if (!oraInizio || !oraFine) return 0;
    const inizio = safeConvertToDate(oraInizio);
    const fine = safeConvertToDate(oraFine);
    if (!inizio || !fine) return 0;
    const pausaInOre = (pausaMinuti ?? 0) / 60;
    const diffInMin = differenceInMinutes(fine, inizio);
    return Math.max(0, (diffInMin / 60) - pausaInOre);
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
        const tipiGiornataByNormalizedName = new Map(
            masterData.tipiGiornata.map((t) => [normalizeText(t.nome), t])
        );
        
        return (rapportiniLocali as Rapportino[]).map(report => {
            // Legacy-first: nei vecchi rapportini il tipo giornata affidabile puo essere nel titolo.
            const legacyTipoLabel = extractLegacyTipoFromReportName((report as any).nome);
            const tipoDaLegacy = legacyTipoLabel
                ? tipiGiornataByNormalizedName.get(normalizeText(legacyTipoLabel))
                : undefined;
            const tipoDaId = tipiGiornataMap.get(report.tipoGiornataId);
            const tipoGiornata = tipoDaLegacy || tipoDaId;

            const dettaglioTecnico = report.dettaglioOreTecnici?.find(d => d.tecnicoId === userProfile.tecnicoId);

            let oreLavoro = 0;
            if (dettaglioTecnico) {
                if (dettaglioTecnico.isManual) {
                    oreLavoro = dettaglioTecnico.ore ?? 0;
                } else {
                    const oreDaOrarioTecnico = calculateHoursFromRange(dettaglioTecnico.oraInizio, dettaglioTecnico.oraFine, dettaglioTecnico.pausa);
                    oreLavoro = oreDaOrarioTecnico > 0 ? oreDaOrarioTecnico : (dettaglioTecnico.ore ?? 0);
                }
            } else {
                const oreDaOrarioReport = calculateHoursFromRange(report.oraInizio, report.oraFine, report.pausa);
                oreLavoro = oreDaOrarioReport > 0 ? oreDaOrarioReport : (report.oreLavoro ?? 0);
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
    
        const TIPO_ORDINARIA_ID = masterData.tipiGiornata.find(t => t.categoria === 'normale' || t.nome.toLowerCase().includes('ordinaria'))?.id;
        const TIPO_STRAORDINARIA_ID = masterData.tipiGiornata.find(t => t.nome.toLowerCase().includes('straordin'))?.id;
        
        const TARIFFE_MAP = new Map((masterData.impostazioni as Impostazioni).tariffe.map(t => [t.id, t]));
        const TARIFFE_BY_TIPO_ID = new Map((masterData.impostazioni as Impostazioni).tariffe.map(t => [t.tipoGiornataId, t]));
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
            const tariffaTipo = TARIFFE_BY_TIPO_ID.get(tipo.id) || TARIFFE_MAP.get(tipo.id);
            riepilogo.dettaglio.set(tipo.id, {
                id: tipo.id, nome: tipo.nome, colore: tipo.colore, 
                unita: tariffaTipo?.unita || (tipo.tipo === 'giornaliera' ? 'g' : 'h'), 
                oreTotali: 0, giorni: 0, costo: 0, giorniSet: new Set<string>(),
            });
        });
        // voce per tipi sconosciuti (rapporti senza tipoGiornata)
        if (!riepilogo.dettaglio.has('unknown')) {
            riepilogo.dettaglio.set('unknown', {
                id: 'unknown', nome: 'Sconosciuto', colore: '#9e9e9e', unita: 'h', oreTotali: 0, giorni: 0, costo: 0, giorniSet: new Set<string>(),
            });
        }
    
        if (rapportiniArricchiti.length === 0) {
            riepilogo.dettaglio.forEach(voce => { voce.giorni = voce.giorniSet?.size || 0; delete voce.giorniSet; });
            return riepilogo;
        }
        
        const dailyData = new Map<string, { oreOrdinarie: number, tipiPresenti: Set<string> }>();
        const allDaysOfPresence = new Set<string>();

        const defaultTrasfertaTipo = masterData.tipiGiornata.find(t => isTrasfertaTipo(t));
    
        for (const report of rapportiniArricchiti) {
            // Accettiamo e includiamo anche rapporti senza tipoGiornata o con trasferte collegate
            // (vengono comunque contati nei giorni di presenza e nelle voci appropriate)
            const tipoG = report.tipoGiornata;
            if (!tipoG) {
                // assegna id fittizio per mantenere il conteggio
                report.tipoGiornata = { id: 'unknown', nome: 'Sconosciuto', descrizione: undefined, tariffa: 0, tipo: 'oraria', colore: '#9e9e9e', sigla: undefined, lavorativo: true, icona: '' } as any;
            }
            const dayKey = format(report.data, 'yyyy-MM-dd');
            allDaysOfPresence.add(dayKey);
    
            let daySummary = dailyData.get(dayKey);
            if (!daySummary) {
                daySummary = { oreOrdinarie: 0, tipiPresenti: new Set() };
                dailyData.set(dayKey, daySummary);
            }
    
            daySummary.tipiPresenti.add(report.tipoGiornata.id);
            const effectiveTrasfertaId = report.trasfertaId || ((report as any).isTrasferta ? defaultTrasfertaTipo?.id : undefined);
            if (effectiveTrasfertaId) {
                daySummary.tipiPresenti.add(effectiveTrasfertaId);
                // Se la trasferta non ha una voce nel riepilogo, creala dinamicamente (conteggio presenze)
                if (!riepilogo.dettaglio.has(effectiveTrasfertaId)) {
                    const trasfertaInfo = TIPI_GIORNATA_MAP.get(effectiveTrasfertaId) || defaultTrasfertaTipo;
                    riepilogo.dettaglio.set(effectiveTrasfertaId, {
                        id: effectiveTrasfertaId,
                        nome: trasfertaInfo?.nome || 'Trasferta',
                        colore: trasfertaInfo?.colore || '#90caf9',
                        unita: 'g', oreTotali: 0, giorni: 0, costo: 0, giorniSet: new Set<string>(),
                        // @ts-ignore - flag informativo per escludere le ore complessive dalle trasferte
                        isTrasferta: true,
                    } as any);
                }
            }
    
            // Le ore ordinarie sono soggette a soglia 8h/giorno; lo sforo confluisce nello straordinario.
            if (report.tipoGiornata.id === TIPO_ORDINARIA_ID) {
                daySummary.oreOrdinarie += report.oreGiorno;
            } else if (report.tipoGiornata.id === TIPO_STRAORDINARIA_ID) {
                const voceStraordinaria = riepilogo.dettaglio.get(TIPO_STRAORDINARIA_ID);
                if (voceStraordinaria) {
                    voceStraordinaria.oreTotali += report.oreGiorno;
                }
            } else if (isTrasfertaTipo(report.tipoGiornata) || effectiveTrasfertaId) {
                // Le trasferte devono comparire con presenze, senza ore.
            } else {
                // Tutti gli altri tipi (Ferie, Malattia, etc.) vengono accumulati separatamente.
                const voce = riepilogo.dettaglio.get(report.tipoGiornata.id);
                if (voce) {
                    voce.oreTotali += report.oreGiorno;
                }
            }
        }
    
        dailyData.forEach((summary, dayKey) => {
            const sforo = Math.max(0, summary.oreOrdinarie - 8);
            const oreOrdinarieEffettive = summary.oreOrdinarie - sforo;
            
            const voceOrdinaria = riepilogo.dettaglio.get(TIPO_ORDINARIA_ID)!;
            voceOrdinaria.oreTotali += oreOrdinarieEffettive;
            
            if (sforo > 0) {
                const voceStraordinaria = riepilogo.dettaglio.get(TIPO_STRAORDINARIA_ID);
                if (voceStraordinaria) {
                    voceStraordinaria.oreTotali += sforo;
                    if (voceStraordinaria.giorniSet) voceStraordinaria.giorniSet.add(dayKey);
                }
            }
    
            summary.tipiPresenti.forEach(tipoId => {
                const voce = riepilogo.dettaglio.get(tipoId);
                if (voce && voce.giorniSet) voce.giorniSet.add(dayKey);
            });
        });
    
        let costoTotaleFinale = 0;
        riepilogo.dettaglio.forEach(voce => {
            voce.giorni = voce.giorniSet?.size || 0;
            delete voce.giorniSet;
    
            const tariffa = TARIFFE_BY_TIPO_ID.get(voce.id) || TARIFFE_MAP.get(voce.id);
            const costoUnitario = tariffa?.costo ?? 0;
            
            const tipoGiornataInfo = TIPI_GIORNATA_MAP.get(voce.id);
            const isVoceTrasferta = isTrasfertaTipo(tipoGiornataInfo) || (voce as any).isTrasferta === true;

            if (isVoceTrasferta || voce.unita === 'g') {
                // Le trasferte e i tipi giornalieri hanno costo per giorno.
                voce.costo = voce.giorni * costoUnitario;
            } else {
                // Tutti gli altri tipi hanno costo orario.
                voce.costo = voce.oreTotali * costoUnitario;
            }

            costoTotaleFinale += voce.costo;
        });
    
        const oreOrdinarieFinali = riepilogo.dettaglio.get(TIPO_ORDINARIA_ID)!.oreTotali;
        const oreStraordinarioEsplicito = riepilogo.dettaglio.get(TIPO_STRAORDINARIA_ID)?.oreTotali || 0;
        riepilogo.oreStraordinarie = oreStraordinarioEsplicito;
        
        let oreComplessive = 0;
        riepilogo.dettaglio.forEach(voce => {
            // Sommiamo le ore, escludendo le trasferte (solo presenze).
            const tipoInfo = TIPI_GIORNATA_MAP.get(voce.id);
            const isVoceTrasferta = (voce as any).isTrasferta === true || isTrasfertaTipo(tipoInfo);
            if (!isVoceTrasferta) {
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
            const pdfBlob = await generateMonthlyReportPDF(rapportiniArricchiti, masterData.tipiGiornata, tecnico, currentMonth);
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
                                    <RiepilogoCosti riepilogo={riepilogoMese} />
                                </Grid>
                                <Grid sx={{ mt: 2 }} size={12}>
                                    <DailyBreakdownTable rapportini={rapportiniArricchiti} />
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
