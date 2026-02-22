
import React, { useState, useMemo, useCallback } from 'react';
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

const ConsuntivoPage: React.FC = () => {
    const [selectedMonth, setSelectedMonth] = useState<Dayjs>(dayjs());
    const [selectedTecnico, setSelectedTecnico] = useState<Tecnico | null>(null);

    const { tecnici, tipiGiornata, loading: dataLoading, error: dataError } = useGlobalData();
    const { reports, loading: reportsLoading, error: reportsError } = useReports(selectedMonth, selectedTecnico?.uid);

    const getTipoGiornata = useCallback((tipoGiornataId: string): TipoGiornata | undefined => {
        return tipiGiornata.find(t => t.id === tipoGiornataId);
    }, [tipiGiornata]);

    const enrichedReports = useMemo(() => {
        if (!reports) return [];
        return reports.map(report => ({
            ...report,
            tipoGiornata: getTipoGiornata(report.tipoGiornataId),
        }));
    }, [reports, getTipoGiornata]);


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
                        <Grid
                            size={{
                                xs: 12,
                                md: 6
                            }}>
                            <DatePicker
                                views={['month', 'year']}
                                label="Seleziona Mese"
                                value={selectedMonth}
                                onChange={(newMonth) => setSelectedMonth(newMonth || dayjs())}
                                sx={{ width: '100%' }}
                            />
                        </Grid>
                        <Grid
                            size={{
                                xs: 12,
                                md: 6
                            }}>
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
                    <CircularProgress />
                ) : error ? (
                    <Alert severity="error">{error.message}</Alert>
                ) : !selectedTecnico ? (
                    <Alert severity="info">Seleziona un tecnico per visualizzare il consuntivo.</Alert>
                ) : (
                    <ConsuntivoTable reports={enrichedReports} />
                )}
            </Box>
        </LocalizationProvider>
    );
};

export default ConsuntivoPage;
