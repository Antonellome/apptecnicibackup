import { useState, useMemo, useContext, useEffect } from 'react';
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
import { format, startOfMonth, endOfMonth, subMonths, addMonths, isSameMonth, isWithinInterval } from 'date-fns';
import { it } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import { Rapportino, UserProfile, MasterData, RiepilogoMese } from '@/models/definitions';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/local-db';
import DailyBreakdownTable from '@/components/Rapportini/DailyBreakdownTable';
import FullScreenLoader from '@/components/FullScreenLoader';
import { generateMonthlyReportPDF } from '@/lib/report-generator';
import { calculateMonthlyReportData } from '@/lib/report-calculator';
import { shareOrDownload } from '@/lib/share-utils';
import { useSnackbar } from '@/contexts/SnackbarContext';
import MonthlyCalendarView from '@/components/Rapportini/MonthlyCalendarView';
import PdfPreviewModal from '@/components/Rapportini/PdfPreviewModal';
import MonthlyReportSkeleton from '@/components/Rapportini/MonthlyReportSkeleton';
import { toDateSafe as toDate } from '@/lib/date-utils'; 
import { GlobalDataContext } from '@/contexts/GlobalDataContext';

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
    const [clickCount, setClickCount] = useState(0);
    const [showCost, setShowCost] = useState(false);

    const tariffe = useLiveQuery(() => db.impostazioni.get('main').then(imp => imp?.tariffe || []), []);

    const rapportiniLocali = useLiveQuery(() => {
        if (!userProfile?.tecnicoId) return [];
        const interval = { start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) };
        return db.rapportini
            .filter(r => {
                const isParticipant = (r.presenze || []).includes(userProfile.tecnicoId!);
                const reportDate = toDate(r.data);
                return !!(reportDate && isWithinInterval(reportDate, interval) && isParticipant);
            })
            .sortBy('data');
    }, [currentMonth, userProfile.tecnicoId]);

    const { rapportiniArricchiti, riepilogoMese } = useMemo(() => {
        if (!rapportiniLocali || !masterData || !userProfile || !tariffe) {
            return { rapportiniArricchiti: [], riepilogoMese: null };
        }
        return calculateMonthlyReportData(rapportiniLocali as Rapportino[], masterData, userProfile, tariffe);
    }, [rapportiniLocali, masterData, userProfile, tariffe]);

    const reportDays = useMemo(() => {
        if (!rapportiniArricchiti) return [];
        return rapportiniArricchiti.map(r => r.data).filter(Boolean);
    }, [rapportiniArricchiti]);

    const handleTitleClick = () => setClickCount(c => c + 1);
    
    useEffect(() => {
        if (clickCount >= 5) {
            setShowCost(s => !s);
            setClickCount(0);
        }
    }, [clickCount]);

    const handleGenerateMonthlyReport = async () => {
        if (!rapportiniArricchiti || rapportiniArricchiti.length === 0 || !riepilogoMese) {
            showSnackbar('Nessun dato da includere nel PDF.', 'info');
            return;
        }
        setIsGeneratingPdf(true);
        try {
            const monthStr = format(currentMonth, 'MMMM yyyy', { locale: it });
            const pdfBlob = await generateMonthlyReportPDF(rapportiniArricchiti, monthStr, riepilGogoMese as RiepilogoMese);
            setPdfPreviewBlob(pdfBlob);
            setIsPreviewOpen(true);
        } catch (error) {
            console.error("Errore durante la generazione del PDF:", error);
            showSnackbar('Errore nella generazione del report.', 'error');
        } finally {
            setIsGeneratingPdf(false);
        }
    };    

    const handleShareFromPreview = async (blob: Blob, fileName: string) => {
        try {
            await shareOrDownload(blob, fileName);
        } catch (error) {
            console.error("Errore durante la condivisione:", error);
            showSnackbar('Errore durante la condivisione del file.', 'error');
        } finally {
            setIsPreviewOpen(false);
        }
    };

    if (rapportiniLocali === undefined || tariffe === undefined) {
        return <MonthlyReportSkeleton />;
    }
    
    const hasData = riepilogoMese && (riepilogoMese.oreTotali > 0 || riepilogoMese.giorniTotaliLavorati > 0);

    return (
        <>
            <Grid container justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                 <Grid size={6}>
                    <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', cursor: 'pointer' }} onClick={handleTitleClick}>
                        Report Mensile
                    </Typography>
                </Grid>
                <Grid sx={{ textAlign: 'right' }} size={6}>
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
                <Grid
                    size={{
                        xs: 12,
                        md: 4
                    }}>
                    <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
                        <Typography variant="h5" gutterBottom>Calendario</Typography>
                        <MonthlyCalendarView currentMonth={currentMonth} reportDays={reportDays} />
                    </Paper>
                </Grid>
                <Grid
                    size={{
                        xs: 12,
                        md: 8
                    }}>
                    {!hasData ? (
                        <Paper sx={{ p: 4, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <Typography variant="h6">Nessun dato per questo mese</Typography>
                            <Typography color="text.secondary">Non sono stati trovati rapportini per il periodo selezionato.</Typography>
                        </Paper>
                    ) : (
                        riepilogoMese && (
                            <Grid container spacing={3}>
                                <Grid size={12}>
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
                                                    <TableRow>
                                                        <TableCell><Typography fontWeight="bold">Giorni di Trasferta</Typography></TableCell>
                                                        <TableCell align="right"><Typography variant="h6">{riepilogoMese.giorniTrasferta}</Typography></TableCell>
                                                    </TableRow>
                                                    {showCost && (
                                                        <TableRow>
                                                            <TableCell><Typography fontWeight="bold" sx={{ color: '#1976d2' }}>Costo Stimato</Typography></TableCell>
                                                            <TableCell align="right"><Typography variant="h5" fontWeight="bold" sx={{ color: '#1976d2' }}>€ {riepilogoMese.costoTotale.toFixed(2)}</Typography></TableCell>
                                                        </TableRow>
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    </Paper>
                                </Grid>
                                <Grid sx={{ mt: 2 }} size={12}>
                                    <DailyBreakdownTable rapportini={rapportiniArricchiti} />
                                </Grid>
                            </Grid>
                        )
                    )}
                </Grid>
            </Grid>

            {userProfile.cognome && <PdfPreviewModal
                open={isPreviewOpen}
                onClose={() => setIsPreviewOpen(false)}
                pdfBlob={pdfPreviewBlob}
                fileName={`Riepilogo_Mensile_${userProfile.cognome}_${format(currentMonth, 'MMMM_yyyy', { locale: it })}.pdf`}
                onShare={handleShareFromPreview}
            />}
        </>
    );
}

const MonthlyReportPage = () => {
    const { userProfile } = useAuth();
    const globalDataContext = useContext(GlobalDataContext);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    
    if (!globalDataContext || globalDataContext.loading || !userProfile || !globalDataContext.masterData) {
        return <FullScreenLoader />;
    }

    const { masterData } = globalDataContext;
    
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
