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
import { Rapportino, EnrichedRapportino, UserProfile, MasterData } from '@/models/definitions';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/local-db';
import DailyBreakdownTable from '@/components/Rapportini/DailyBreakdownTable';
import FullScreenLoader from '@/components/FullScreenLoader';
import { generateMonthlyReportPDF, calculateMonthlyReportData } from '@/services/monthlyReportGenerator';
import { shareOrDownload } from '@/services/shareService';
import { useSnackbar } from '@/contexts/SnackbarContext';
import MonthlyCalendarView from '@/components/Rapportini/MonthlyCalendarView';
import PdfPreviewModal from '@/components/Rapportini/PdfPreviewModal';
import { useMasterData } from '@/hooks/useMasterData';
import MonthlyReportSkeleton from '@/components/Rapportini/MonthlyReportSkeleton';

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

    const rapportiniLocali = useLiveQuery(() => {
        const start = startOfMonth(currentMonth);
        const end = endOfMonth(currentMonth);
        return db.rapportini
            .where('data').between(start, end, true, true)
            .filter(r => (r.presenze || []).includes(userProfile.tecnicoId) || r.tecnicoId === userProfile.tecnicoId)
            .sortBy('data');
    }, [currentMonth, userProfile.tecnicoId]);

    const { rapportiniArricchiti, riepilogoMese } = useMemo(() => {
        if (!rapportiniLocali || !masterData || !userProfile) {
            return { rapportiniArricchiti: [], riepilogoMese: null };
        }
        return calculateMonthlyReportData(rapportiniLocali as Rapportino[], masterData, userProfile);
    }, [rapportiniLocali, masterData, userProfile]);

    const reportDays = useMemo(() => {
        if (!rapportiniArricchiti) return [];
        return rapportiniArricchiti.map(r => r.data);
    }, [rapportiniArricchiti]);

    const handleTitleClick = () => {
        const newClickCount = clickCount + 1;
        if (newClickCount >= 5) {
            setShowCost(!showCost);
            setClickCount(0);
        } else {
            setClickCount(newClickCount);
        }
    };

    const handleGenerateMonthlyReport = async () => {
        if (!rapportiniArricchiti || rapportiniArricchiti.length === 0) {
            showSnackbar('Nessun dato valido da includere nel PDF.', 'info');
            return;
        }
        setIsGeneratingPdf(true);
        try {
            const monthStr = format(currentMonth, 'MMMM yyyy', { locale: it });
            const pdfBlob = await generateMonthlyReportPDF(rapportiniArricchiti as EnrichedRapportino[], monthStr);
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

    if (rapportiniLocali === undefined) {
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
                <Grid size={6} sx={{ textAlign: 'right' }}>
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
                                <Grid size={12}>
                                    <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
                                        <Typography variant="h5" gutterBottom>Riepilogo</Typography>
                                        <TableContainer component={Paper} variant="outlined">
                                            <Table size="small">
                                                <TableBody>
                                                    <TableRow>
                                                        <TableCell><Typography fontWeight="bold">Ore Lavorate</Typography></TableCell>
                                                        <TableCell align="right"><Typography variant="h6">{(riepilogoMese.oreTotali || 0).toFixed(2)}</Typography></TableCell>
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
                                                            <TableCell align="right"><Typography variant="h5" fontWeight="bold" sx={{ color: '#1976d2' }}>€ {(riepilogoMese.costoTotale || 0).toFixed(2)}</Typography></TableCell>
                                                        </TableRow>
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    </Paper>
                                </Grid>
                                <Grid size={12} sx={{ mt: 2 }}>
                                    <DailyBreakdownTable rapportini={rapportiniArricchiti as EnrichedRapportino[]} />
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
