import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Paper, Typography, CircularProgress, Alert, TextField, Autocomplete, Box } from '@mui/material';
import Grid from '@mui/material/Grid';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/it';
import { useGlobalData } from '@/hooks/useGlobalData';
import { useReports } from '@/hooks/useReports';
import ConsuntivoTable from '@/components/ConsuntivoTable';
import { Tecnico, Rapportino, TipoGiornata } from '@/models/definitions';

dayjs.locale('it');

const loadTariffe = (userId: string): Record<string, number> => {
    try {
        const savedTariffeJSON = localStorage.getItem(`tariffe_${userId}`);
        if (savedTariffeJSON) {
            const parsedTariffe = JSON.parse(savedTariffeJSON);
            Object.keys(parsedTariffe).forEach(key => {
                parsedTariffe[key] = Number(parsedTariffe[key]) || 0;
            });
            return parsedTariffe;
        }
    } catch (error) {
        console.error("Errore nel caricamento o parsing delle tariffe:", error);
    }
    return {};
};

const ConsuntivoPage: React.FC = () => {
    const [selectedMonth, setSelectedMonth] = useState<Dayjs>(dayjs());
    const [selectedTecnico, setSelectedTecnico] = useState<Tecnico | null>(null);

    const { tecnici, tipiGiornata, loading: dataLoading, error: dataError } = useGlobalData();
    const { reports, loading: reportsLoading, error: reportsError } = useReports(selectedMonth, selectedTecnico?.uid);

    const [tariffe, setTariffe] = useState<Record<string, number>>({});

    useEffect(() => {
        if (selectedTecnico?.uid) {
            setTariffe(loadTariffe(selectedTecnico.uid));
        } else {
            setTariffe({});
        }
    }, [selectedTecnico]);

    const getTipoGiornata = useCallback((tipoGiornataId: string): TipoGiornata | undefined => {
        return tipiGiornata.find(t => t.id === tipoGiornataId);
    }, [tipiGiornata]);

    const enrichedReports = useMemo(() => {
        if (!reports) return [];
        return reports.map(report => {
            const tipo = getTipoGiornata(report.tipoGiornataId);
            // --- CORREZIONE TARIFFA DEFAULT ---
            const tariffa = tipo ? (tariffe[tipo.nome] ?? (tipo.lavorativo ? 10 : 0)) : 0;
            const guadagno = (report.oreLavoro ?? 0) * tariffa;
            return {
                ...report,
                tipoGiornata: tipo,
                guadagno: guadagno,
            };
        });
    }, [reports, getTipoGiornata, tariffe]);

    const totalGuadagno = useMemo(() => {
        return enrichedReports.reduce((sum, report) => sum + (report.guadagno ?? 0), 0);
    }, [enrichedReports]);

    const handleTecnicoChange = (event: React.SyntheticEvent, value: Tecnico | null) => {
        setSelectedTecnico(value);
    };

    const isLoading = dataLoading || reportsLoading;
    const error = dataError || reportsError;

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="it">
            <Box sx={{ p: 3 }}>
                <Typography variant="h4" gutterBottom>Consuntivo Mensile</Typography>

                <Paper sx={{ p: 2, mb: 3 }}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={6}>
                            <DatePicker
                                views={['month', 'year']}
                                label="Seleziona Mese"
                                value={selectedMonth}
                                onChange={(newMonth) => setSelectedMonth(newMonth || dayjs())}
                                sx={{ width: '100%' }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Autocomplete
                                options={tecnici}
                                getOptionLabel={(option) => `${option.nome} ${option.cognome}`}
                                value={selectedTecnico}
                                onChange={handleTecnicoChange}
                                renderInput={(params) => <TextField {...params} label="Seleziona Tecnico" />}
                                disabled={dataLoading}
                                fullWidth
                            />
                        </Grid>
                    </Grid>
                </Paper>

                {isLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4}}><CircularProgress /></Box>
                ) : error ? (
                    <Alert severity="error">{error.message || 'Si è verificato un errore'}</Alert>
                ) : !selectedTecnico ? (
                    <Alert severity="info">Seleziona un tecnico per visualizzare il consuntivo.</Alert>
                ) : (
                    <ConsuntivoTable reports={enrichedReports} totalGuadagno={totalGuadagno} />
                )}
            </Box>
        </LocalizationProvider>
    );
};

export default ConsuntivoPage;
