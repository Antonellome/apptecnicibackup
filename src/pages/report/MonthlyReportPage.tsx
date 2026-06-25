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
import { Rapportino, EnrichedRapportino, UserProfile, MasterData, RiepilogoMese, Impostazioni, TipoGiornata } from '@/models/definitions';
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

const normalizeText = (value?: string): string =>
    (value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();

const isLegacyTrasferta = (tipo: TipoGiornata | undefined) => tipo?.nome.toLowerCase().includes('trasferta');
const isTrasfertaTipo = (tipo: TipoGiornata | undefined) => Boolean(tipo && (tipo.categoria === 'trasferta' || isLegacyTrasferta(tipo)));

const calculateHoursFromRange = (oraInizio?: string, oraFine?: string, pausaMinuti?: number): number => {
    if (!oraInizio || !oraFine) return 0;
    try {
        const inizio = new Date(`1970-01-01T${oraInizio}`);
        const fine = new Date(`1970-01-01T${oraFine}`);
        if (fine <= inizio) {
            fine.setDate(fine.getDate() + 1);
        }
        const diff = (fine.getTime() - inizio.getTime()) / (1000 * 60 * 60);
        const pausaInOre = (pausaMinuti ?? 0) / 60;
        return Math.max(0, diff - pausaInOre);
    } catch (e) {
        return 0;
    }
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
            const dettaglioTecnico = report.dettaglioOreTecnici?.find(d => d.tecnicoId === userProfile.tecnicoId);
            let oreLavoro = 0;
            if (dettaglioTecnico) {
                if (dettaglioTecnico.isManual) {
                    oreLavoro = dettaglioTecnico.ore ?? 0;
                } else {
                    oreLavoro = calculateHoursFromRange(dettaglioTecnico.oraInizio, dettaglioTecnico.oraFine, dettaglioTecnico.pausa);
                }
            } else if (report.oreLavoro) {
                oreLavoro = report.oreLavoro;
            }
            return {
                ...report,
                data: new Date(report.data),
                tipoGiornata: tipoGiornata,
                oreGiorno: oreLavoro > 0 ? oreLavoro : 0,
            } as EnrichedRapportino;
        });
    }, [rapportiniLocali, masterData, userProfile.tecnicoId]);

    const riepilogoMese = useMemo<RiepilogoMese | null>(() => {
        if (!rapportiniArricchiti || !masterData) return null;
        const { tipiGiornata, impostazioni } = masterData;
        
        const TARIFFE = new Map(impostazioni.tariffe.map(t => [t.tipoGiornataId, t]));
        const TIPI_GIORNATA = new Map(tipiGiornata.map(t => [t.id, t]));
        const ORDINARIA_ID = tipiGiornata.find(t => t.categoria === 'normale' || normalizeText(t.nome).includes('ordinaria'))?.id;
        const STRAORDINARIA_ID = tipiGiornata.find(t => normalizeText(t.nome).includes('straordinar'))?.id;

        if (!ORDINARIA_ID || !STRAORDINARIA_ID) return null;

        const dailyData = new Map<string, {
            oreNelCalderone: number;
            orePerTipo: Map<string, number>;
            giorniPerTipo: Set<string>;
            costiAggiuntivi: number;
        }>();

        for (const report of rapportiniArricchiti) {
            const dayKey = format(report.data, 'yyyy-MM-dd');
            let daySummary = dailyData.get(dayKey);
            if (!daySummary) {
                daySummary = { oreNelCalderone: 0, orePerTipo: new Map(), giorniPerTipo: new Set(), costiAggiuntivi: 0 };
                dailyData.set(dayKey, daySummary);
            }
            const tipoGiornataPrincipale = report.tipoGiornata;
            const isLegacy = tipoGiornataPrincipale && !report.trasfertaId && isTrasfertaTipo(tipoGiornataPrincipale);
            const trasfertaId = isLegacy ? tipoGiornataPrincipale!.id : report.trasfertaId;
            if (trasfertaId) {
                const tariffaTrasferta = TARIFFE.get(trasfertaId);
                if (tariffaTrasferta) daySummary.costiAggiuntivi += tariffaTrasferta.costo;
            }
            if (isLegacy) {
                daySummary.oreNelCalderone += report.oreGiorno;
            } else if (tipoGiornataPrincipale) {
                const tariffa = TARIFFE.get(tipoGiornataPrincipale.id);
                if (tariffa?.unita === 'g') {
                    daySummary.giorniPerTipo.add(tipoGiornataPrincipale.id);
                } else if (tipoGiornataPrincipale.id === ORDINARIA_ID) {
                    daySummary.oreNelCalderone += report.oreGiorno;
                } else {
                    const oreAttuali = daySummary.orePerTipo.get(tipoGiornataPrincipale.id) || 0;
                    daySummary.orePerTipo.set(tipoGiornataPrincipale.id, oreAttuali + report.oreGiorno);
                }
            }
        }

        const riepilogo: RiepilogoMese = {
            oreTotali: 0, costoTotale: 0, giorniTotaliLavorati: 0, dettaglio: new Map(),
            oreOrdinarie: 0, oreStraordinarie: 0,
        };
        tipiGiornata.forEach(t => {
            riepilogo.dettaglio.set(t.id, { id: t.id, nome: t.nome, colore: t.colore, unita: TARIFFE.get(t.id)?.unita || 'h', oreTotali: 0, giorni: 0, costo: 0, giorniSet: new Set() });
        });

        dailyData.forEach((summary, dayKey) => {
            const oreStra = Math.max(0, summary.oreNelCalderone - 8);
            const oreOrd = summary.oreNelCalderone - oreStra;
            if (oreOrd > 0) {
              riepilogo.dettaglio.get(ORDINARIA_ID)!.oreTotali += oreOrd;
              riepilogo.dettaglio.get(ORDINARIA_ID)!.giorniSet.add(dayKey);
            }
            if (oreStra > 0) {
              riepilogo.dettaglio.get(STRAORDINARIA_ID)!.oreTotali += oreStra;
              riepilogo.dettaglio.get(STRAORDINARIA_ID)!.giorniSet.add(dayKey);
            }

            summary.orePerTipo.forEach((ore, tipoId) => {
                riepilogo.dettaglio.get(tipoId)!.oreTotali += ore;
                riepilogo.dettaglio.get(tipoId)!.giorniSet.add(dayKey);
            });

            summary.giorniPerTipo.forEach(tipoId => {
                riepilogo.dettaglio.get(tipoId)!.giorniSet.add(dayKey);
            });
            riepilogo.costoTotale += summary.costiAggiuntivi;
        });

        riepilogo.dettaglio.forEach(voce => {
            const tariffa = TARIFFE.get(voce.id);
            voce.giorni = voce.giorniSet.size;
            if (!tariffa) return;
            
            if (isTrasfertaTipo(TIPI_GIORNATA.get(voce.id))) {
                voce.costo = voce.giorni * tariffa.costo;
            } else if (voce.unita === 'g') {
                voce.costo = voce.giorni * tariffa.costo;
                riepilogo.costoTotale += voce.costo;
                 voce.oreTotali = voce.giorni * 8;
            } else {
                voce.costo = voce.oreTotali * tariffa.costo;
                riepilogo.costoTotale += voce.costo;
            }
        });

        riepilogo.oreOrdinarie = riepilogo.dettaglio.get(ORDINARIA_ID)!.oreTotali;
        riepilogo.oreStraordinarie = riepilogo.dettaglio.get(STRAORDINARIA_ID)!.oreTotali;
        riepilogo.dettaglio.forEach(d => {
             if (!isTrasfertaTipo(TIPI_GIORNATA.get(d.id))) {
                riepilogo.oreTotali += d.oreTotali;
             }
        });
        riepilogo.giorniTotaliLavorati = dailyData.size;
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
    
    const hasData = riepilogoMese && (riepilogoMese.oreTotali > 0 || riepilogoMese.giorniTotaliLavorati > 0 || riepilogoMese.costoTotale > 0);

    return (
        <>
            <Grid container justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Grid item xs={6}>
                    <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
                        Report Mensile
                    </Typography>
                </Grid>
                <Grid item xs={6} sx={{ textAlign: 'right' }}>
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
                <Grid item xs={12} md={4}>
                    <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
                        <Typography variant="h5" gutterBottom>Calendario</Typography>
                        <MonthlyCalendarView currentMonth={currentMonth} reportDays={reportDays} />
                    </Paper>
                </Grid>
                <Grid item xs={12} md={8}>
                    {!hasData ? (
                        <Paper sx={{ p: 4, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <Typography variant="h6">Nessun dato per questo mese</Typography>
                            <Typography color="text.secondary">Non sono stati trovati rapportini per il periodo selezionato.</Typography>
                        </Paper>
                    ) : (
                        riepilogoMese && (
                            <Grid container spacing={3}>
                                <Grid item xs={12} lg={6}>
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
                                <Grid item xs={12} lg={6}>
                                    <DettaglioOreTipoGiornata 
                                        dettaglio={riepilogoMese.dettaglio}
                                    />
                                </Grid>
                                <Grid item sx={{ mt: 2 }} xs={12}>
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
