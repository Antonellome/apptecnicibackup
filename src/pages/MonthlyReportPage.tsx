
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
import { Rapportino, EnrichedRapportino, TariffaLocale, MasterData } from '@/models/definitions';
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

// Funzione robusta per la conversione delle date
const safeConvertToDate = (dateSource: any): Date | null => {
    if (!dateSource) return null;
    // Gestisce oggetti Timestamp di Firestore { seconds, nanoseconds }
    if (typeof dateSource === 'object' && dateSource !== null && typeof dateSource.seconds === 'number') {
        return new Date(dateSource.seconds * 1000);
    }
    // Gestisce oggetti Date o stringhe di data valide
    const d = new Date(dateSource);
    if (!isNaN(d.getTime())) {
        return d;
    }
    return null;
};


const MonthlyReportPage = () => {
    const { userProfile } = useAuth();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const { showSnackbar } = useSnackbar();
    const [pdfPreviewBlob, setPdfPreviewBlob] = useState<Blob | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

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
            let oreLavoro = 0;
            const inizio = safeConvertToDate(report.oraInizio);
            const fine = safeConvertToDate(report.oraFine);

            if (inizio && fine) {
                const pausaInOre = report.pausa ?? 0;
                const diffInMin = differenceInMinutes(fine, inizio);
                oreLavoro = Math.max(0, (diffInMin / 60) - pausaInOre);
            } else {
                oreLavoro = report.dettaglioOreTecnici?.find(d => d.tecnicoId === userProfile.tecnicoId)?.ore ?? report.oreLavoro ?? 0;
            }

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
        const tariffaOrdinaria = tariffe.find(t => t.nome.toLowerCase() === 'ordinaria');
        const tariffaStraordinaria = tariffe.find(t => t.nome.toLowerCase() === 'straordinario');
        const costoOrdinarioTariffa = tariffaOrdinaria?.costo ?? 0;
        const costoStraordinarioTariffa = tariffaStraordinaria?.costo ?? 0;

        const tipoGiornataStraordinario = masterData.tipiGiornata.find(t => t.nome.toLowerCase() === 'straordinario');
        if (!tipoGiornataStraordinario) {
            console.error("Definizione 'Straordinario' non trovata in tipiGiornata.");
            return null;
        }
        const straordinarioId = tipoGiornataStraordinario.id;

        const riepilogo: RiepilogoMese = { oreTotali: 0, costoTotale: 0, dettaglio: new Map() };

        const dailyData = new Map<string, { oreNormali: number; oreStraordinarieEsplicite: number; reports: EnrichedRapportino[] }>();

        for (const report of rapportiniArricchiti) {
             if(!report.oreGiorno || report.oreGiorno <= 0) continue;

            const dayKey = format(report.data, 'yyyy-MM-dd');
            if (!dailyData.has(dayKey)) {
                dailyData.set(dayKey, { oreNormali: 0, oreStraordinarieEsplicite: 0, reports: [] });
            }
            const dayEntry = dailyData.get(dayKey)!;
            
            if (report.tipoGiornata?.nome.toLowerCase() === 'straordinario') {
                dayEntry.oreStraordinarieEsplicite += report.oreGiorno;
            } else {
                dayEntry.oreNormali += report.oreGiorno;
            }
            dayEntry.reports.push(report);
        }

        for (const [, data] of dailyData.entries()) {
            const oreOrdinarieDelGiorno = Math.min(data.oreNormali, 8);
            const oreStraordinarieDaSforo = Math.max(0, data.oreNormali - 8);
            const oreStraordinarieTotaliDelGiorno = data.oreStraordinarieEsplicite + oreStraordinarieDaSforo;

            riepilogo.oreTotali += oreOrdinarieDelGiorno + oreStraordinarieTotaliDelGiorno;

            if (oreOrdinarieDelGiorno > 0) {
                for (const report of data.reports) {
                     if (!report.tipoGiornata || report.tipoGiornata.nome.toLowerCase() === 'straordinario' || !report.oreGiorno) continue;
                    
                    const dettaglio = riepilogo.dettaglio.get(report.tipoGiornata.id) || {
                        nome: report.tipoGiornata.nome, colore: report.tipoGiornata.colore || '#808080',
                        oreOrdinarie: 0, oreStraordinario: 0, costo: 0, unita: 'h', giorni: 0
                    };
                    
                    const percentuale = data.oreNormali > 0 ? (report.oreGiorno / data.oreNormali) : 0;
                    dettaglio.oreOrdinarie += oreOrdinarieDelGiorno * percentuale;
                    riepilogo.dettaglio.set(report.tipoGiornata.id, dettaglio);
                }
            }
            
            if (oreStraordinarieTotaliDelGiorno > 0) {
                const dettaglioStra = riepilogo.dettaglio.get(straordinarioId) || {
                    nome: tipoGiornataStraordinario.nome, colore: tipoGiornataStraordinario.colore || '#ff0000',
                    oreOrdinarie: 0, oreStraordinario: 0, costo: 0, unita: 'h', giorni: 0
                };
                dettaglioStra.oreStraordinario += oreStraordinarieTotaliDelGiorno;
                riepilogo.dettaglio.set(straordinarioId, dettaglioStra);
            }
        }

        const giorniLavoratiPerTipo = new Map<string, Set<string>>();
        for (const report of rapportiniArricchiti) {
            if(report.tipoGiornata && report.oreGiorno && report.oreGiorno > 0){
                if (!giorniLavoratiPerTipo.has(report.tipoGiornata.id)) {
                    giorniLavoratiPerTipo.set(report.tipoGiornata.id, new Set());
                }
                giorniLavoratiPerTipo.get(report.tipoGiornata.id)!.add(format(report.data, 'yyyy-MM-dd'));
            }
        }

        for (const [tipoId, dettaglio] of riepilogo.dettaglio.entries()) {
            dettaglio.costo = (dettaglio.oreOrdinarie * costoOrdinarioTariffa) + (dettaglio.oreStraordinario * costoStraordinarioTariffa);
            riepilogo.costoTotale += dettaglio.costo;

            dettaglio.giorni = giorniLavoratiPerTipo.get(tipoId)?.size ?? 0;
            if (tipoId === straordinarioId) {
                const giorniStraEspliciti = new Set<string>();
                rapportiniArricchiti.forEach(r => {
                    if(r.tipoGiornataId === straordinarioId && r.oreGiorno && r.oreGiorno > 0){
                        giorniStraEspliciti.add(format(r.data, 'yyyy-MM-dd'));
                    }
                });
                dettaglio.giorni = giorniStraEspliciti.size;
            }
        }

        return riepilogo.oreTotali > 0 || riepilogo.dettaglio.size > 0 ? riepilogo : null;
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
            console.error("Errore durante la generazione del PDF mensile:", error);
            showSnackbar('Si è verificato un errore durante la creazione del report.', 'error');
        } finally {
            setIsGeneratingPdf(false);
        }
      };

    const handleShareFromPreview = async (blob: Blob, fileName: string) => {
        try {
            await shareOrDownload(blob, fileName);
        } catch (error) {
            console.error("Errore durante la condivisione del PDF:", error);
            showSnackbar('Si è verificato un errore durante la condivisione.', 'error');
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
                <Grid>
                    <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
                        Report Mensile
                    </Typography>
                </Grid>
                <Grid>
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
            
            <Grid container spacing={3}>
                 <Grid size={{ xs: 12, md: 4 }}>
                     <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
                         <Typography variant="h5" gutterBottom>Calendario</Typography>
                         <MonthlyCalendarView currentMonth={currentMonth} reportDays={reportDays} />
                     </Paper>
                 </Grid>
                 <Grid size={{ xs: 12, md: 8 }}>
                    {!riepilogoMese && (
                        <Paper sx={{ p: 4, textAlign: 'center', height: '100%' }}>
                            <Typography variant="h6">Nessun dato per questo mese</Typography>
                            <Typography color="text.secondary">Non sono stati trovati rapportini nella cache locale per il periodo selezionato.</Typography>
                        </Paper>
                    )}
                    {riepilogoMese && (
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
                                <DettaglioOreTipoGiornata dettaglio={riepilogoMese.dettaglio} />
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
