import { useState, useMemo, useEffect } from 'react';
import { Box, Typography, Paper, Grid, Button, CircularProgress, Tooltip, IconButton } from '@mui/material';
import { ArrowBack as ArrowBackIcon, ArrowForward as ArrowForwardIcon } from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { Rapportino, EnrichedRapportino, TipoGiornata } from '@/models/definitions';
import { getRapportiniArricchiti } from '@/services/rapportiniService';
import { getTipiGiornata } from '@/services/tipiGiornataService';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, isSameMonth } from 'date-fns';
import { it } from 'date-fns/locale';

import { DailySummary, Totals } from '@/models/report-definitions';
import { shareOrDownload } from '@/services/shareService';
import { generateDailyBreakdownPDF } from '@/services/dailyBreakdownReportGenerator';
import DailyBreakdownTable from '@/components/Rapportini/DailyBreakdownTable';

const MonthlyReportPage = () => {
    const { user, loading: userLoading } = useAuth();
    const { showSnackbar } = useSnackbar();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [rapportini, setRapportini] = useState<EnrichedRapportino[] | null>(null);
    const [tipiGiornata, setTipiGiornata] = useState<TipoGiornata[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            if (userLoading || !user?.uid) return;

            setIsLoading(true);
            try {
                let tipi = tipiGiornata;
                if (tipi.length === 0) {
                    tipi = await getTipiGiornata();
                    setTipiGiornata(tipi);
                }

                if (tipi.length === 0) {
                    throw new Error("I tipi di giornata non sono stati caricati correttamente.");
                }

                const startDate = startOfMonth(currentMonth);
                const endDate = endOfMonth(currentMonth);
                const fetchedRapports = await getRapportiniArricchiti(user.uid, { startDate, endDate });
                setRapportini(fetchedRapports);

            } catch (error) {
                console.error("Errore nel caricamento dei dati della pagina report:", error);
                showSnackbar("Errore critico nel caricamento dei dati. Riprova più tardi.", "error");
                setRapportini([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, userLoading, currentMonth]);

    const { dailySummaries, otherHourTypes, totals } = useMemo(() => {
        if (!rapportini || tipiGiornata.length === 0) {
            return { dailySummaries: [], otherHourTypes: [], totals: {} as Totals };
        }

        const tipiGiornataMap = new Map(tipiGiornata.map(t => [t.id, t]));
        const TIPO_ORDINARIA_ID = tipiGiornata.find(t => t.nome.toLowerCase().includes('ordinaria'))?.id;
        const TIPO_STRAORDINARIA_NOME = tipiGiornata.find(t => t.nome.toLowerCase().includes('straordinar'))?.nome || 'Straordinario';

        const isLegacyTrasferta = (report: EnrichedRapportino): boolean => {
            return !report.trasfertaId && report.tipoGiornata?.categoria === 'trasferta';
        };

        const groupedByDay: { [key: string]: EnrichedRapportino[] } = {};
        for (const report of rapportini) {
            const dayKey = format(report.data, 'yyyy-MM-dd');
            if (!groupedByDay[dayKey]) groupedByDay[dayKey] = [];
            groupedByDay[dayKey].push(report);
        }

        const summaries: DailySummary[] = Object.values(groupedByDay).map(reports => {
            const day = reports[0].data;
            let oreDaSplittare = 0;
            let insertedHours = 0;
            const otherHours: { [key: string]: number } = {};
            const activities = new Map<string, { nome: string; colore: string | undefined }>();

            for (const report of reports) {
                insertedHours += report.oreGiorno;
                
                if (report.tipoGiornata) {
                    activities.set(report.tipoGiornata.id, { nome: report.tipoGiornata.nome, colore: report.tipoGiornata.colore });
                }
                if (report.trasfertaId) {
                    const trasfertaTipo = tipiGiornataMap.get(report.trasfertaId);
                    if (trasfertaTipo) {
                        activities.set(trasfertaTipo.id, { nome: trasfertaTipo.nome, colore: trasfertaTipo.colore });
                    }
                }

                const tipoG = report.tipoGiornata;
                if (tipoG) {
                    const deveEssereSplittato = (tipoG.id === TIPO_ORDINARIA_ID) || isLegacyTrasferta(report);
                    
                    if (deveEssereSplittato) {
                        oreDaSplittare += report.oreGiorno;
                    } else {
                        otherHours[tipoG.nome] = (otherHours[tipoG.nome] || 0) + report.oreGiorno;
                    }
                }
            }

            const oreStraordinarieDaSforo = Math.max(0, oreDaSplittare - 8);
            const oreOrdinarie = oreDaSplittare - oreStraordinarieDaSforo;
            const oreStraordinariePure = otherHours[TIPO_STRAORDINARIA_NOME] || 0;
            const oreTotaliStraordinarie = oreStraordinarieDaSforo + oreStraordinariePure;

            return {
                day,
                activities: Array.from(activities.values()),
                insertedHours,
                ordinarie: oreOrdinarie,
                straordinarie: oreTotaliStraordinarie,
                otherHours,
            };
        }).sort((a, b) => a.day.getTime() - b.day.getTime());

        const oht = new Set<string>();
        summaries.forEach(s => Object.keys(s.otherHours).forEach(type => {
            if (type !== TIPO_STRAORDINARIA_NOME) oht.add(type);
        }));
        const otherHourTypes = Array.from(oht).sort();

        const initialTotals: Totals = { insertedHours: 0, ordinarie: 0, straordinarie: 0 };
        otherHourTypes.forEach(type => initialTotals[type] = 0);

        const calculatedTotals = summaries.reduce((acc, s) => {
            acc.insertedHours += s.insertedHours;
            acc.ordinarie += s.ordinarie;
            acc.straordinarie += s.straordinarie;
            otherHourTypes.forEach(type => {
                acc[type] = (acc[type] || 0) + (s.otherHours[type] || 0);
            });
            return acc;
        }, initialTotals);

        return { dailySummaries: summaries, otherHourTypes, totals: calculatedTotals };

    }, [rapportini, tipiGiornata]);

    const handleMonthChange = (direction: 'next' | 'prev') => {
        setCurrentMonth(current => direction === 'next' ? addMonths(current, 1) : subMonths(current, 1));
    };
    
    const handleGenerateMonthlyReport = async () => {
        if (!rapportini || rapportini.length === 0 || !user?.profile) {
            showSnackbar("Nessun dato da esportare per il mese corrente.", "warning");
            return;
        }
        setIsGenerating(true);
        try {
            const fileName = `Dettaglio_Ore_${user.profile.cognome}_${format(currentMonth, 'MMMM_yyyy', { locale: it })}.pdf`;
            const pdfBlob = await generateDailyBreakdownPDF(dailySummaries, otherHourTypes, totals, user.profile, currentMonth);
            await shareOrDownload(pdfBlob, fileName);
        } catch (error) {
            console.error("Errore durante la generazione del PDF:", error);
            showSnackbar("Errore durante la generazione del report.", "error");
        } finally {
            setIsGenerating(false);
        }
    };

    const monthName = format(currentMonth, 'MMMM yyyy', { locale: it });
    const isCurrentMonthNav = isSameMonth(new Date(), currentMonth);

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
                <Grid container justifyContent="space-between" alignItems="center">
                    <Grid>
                        <Typography variant="h4" component="h1">
                            PAGINA DI PROVA IN FILE PROTETTO
                        </Typography>
                        <Typography variant="subtitle1" color="text.secondary">
                            Riepilogo delle tue attività mensili
                        </Typography>
                    </Grid>
                    <Grid>
                         <Button
                            variant="contained"
                            color="primary"
                            onClick={handleGenerateMonthlyReport}
                            disabled={isGenerating || isLoading || !rapportini || rapportini.length === 0}
                            startIcon={isGenerating ? <CircularProgress size={20} color="inherit" /> : null}
                        >
                            {isGenerating ? 'Generazione...' : 'Genera Mensile'}
                        </Button>
                    </Grid>
                </Grid>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 2 }}>
                    <Tooltip title="Mese Precedente">
                        <IconButton onClick={() => handleMonthChange('prev')}>
                            <ArrowBackIcon />
                        </IconButton>
                    </Tooltip>
                    <Typography variant="h6" sx={{ mx: 2 }}>Naviga Mesi</Typography>
                    <Tooltip title="Mese Successivo">
                        <span>
                        <IconButton onClick={() => handleMonthChange('next')} disabled={isCurrentMonthNav}>
                            <ArrowForwardIcon />
                        </IconButton>
                        </span>
                    </Tooltip>
                </Box>
            </Paper>
            {isLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                    <CircularProgress />
                    <Typography sx={{ ml: 2, alignSelf: 'center' }}>Caricamento dati...</Typography>
                </Box>
            )}
            {!isLoading && rapportini && rapportini.length > 0 && (
                 <DailyBreakdownTable 
                    dailySummaries={dailySummaries}
                    otherHourTypes={otherHourTypes}
                    totals={totals}
                 />
            )}
            {!isLoading && (!rapportini || rapportini.length === 0) && (
                <Typography variant="h6" color="text.secondary" align="center" sx={{ mt: 4 }}>
                    Nessun rapportino trovato per questo mese.
                </Typography>
            )}
        </Box>
    );
};

export default MonthlyReportPage;
