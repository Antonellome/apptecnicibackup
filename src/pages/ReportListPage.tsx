
// CIAO. OBBEDISCO. REVISIONE COMPLETA DELLA PAGINA REPORT CON FILTRI AVANZATI.
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGlobalData } from '@/contexts/GlobalDataProvider';
import { useAuth } from '@/hooks/useAuth';
import {
    Box, CircularProgress, Typography, Card, CardContent, CardActions,
    Button, Grid, FormControl, InputLabel, Select, MenuItem, Chip,
    Icon, Paper, TextField
} from '@mui/material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, isSameDay } from 'date-fns';
import { it } from 'date-fns/locale';

// Definizioni dei tipi per chiarezza
interface Report {
    id: string;
    data: any; // Firestore Timestamp
    tipoGiornataId: string;
    oreLavoro: number;
    descrizioneBreve?: string;
    tecnicoId: string;
    naveId?: string;
    luogoId?: string;
    lavoroEseguito?: string;
    materialiImpiegati?: string;
};
interface TipoGiornata { id: string; nome: string; colore: string; icona: string; };
interface Nave { id: string; nome: string; };
interface Luogo { id: string; nome: string; };

const ReportListPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const collections = useGlobalData();

    // Estrazione sicura dei dati dal context globale
    const { rapportini, tipiGiornata, navi, luoghi } = collections || {};

    // --- STATI PER I FILTRI ---
    const [searchText, setSearchText] = useState('');
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [tipoGiornataFilter, setTipoGiornataFilter] = useState('all');
    const [selectedNave, setSelectedNave] = useState('all');
    const [selectedLuogo, setSelectedLuogo] = useState('all');

    // Guardia per il caricamento dei dati essenziali
    if (!Array.isArray(rapportini) || !Array.isArray(tipiGiornata) || !Array.isArray(navi) || !Array.isArray(luoghi)) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                <CircularProgress />
                <Typography sx={{ ml: 2 }}>Caricamento dati...</Typography>
            </Box>
        );
    }

    // --- LOGICA DI FILTRAGGIO INTELLIGENTE ---
    const filteredReports = useMemo(() => {
        let reports: Report[] = rapportini.filter((r: Report) => r.tecnicoId === user?.uid);

        if (tipoGiornataFilter !== 'all') reports = reports.filter(r => r.tipoGiornataId === tipoGiornataFilter);
        if (selectedNave !== 'all') reports = reports.filter(r => r.naveId === selectedNave);
        if (selectedLuogo !== 'all') reports = reports.filter(r => r.luogoId === selectedLuogo);
        if (selectedDate) reports = reports.filter(r => isSameDay(r.data.toDate(), selectedDate));

        if (searchText.trim() !== '') {
            const lowercasedFilter = searchText.toLowerCase();
            reports = reports.filter(r =>
                (r.descrizioneBreve && r.descrizioneBreve.toLowerCase().includes(lowercasedFilter)) ||
                (r.lavoroEseguito && r.lavoroEseguito.toLowerCase().includes(lowercasedFilter)) ||
                (r.materialiImpiegati && r.materialiImpiegati.toLowerCase().includes(lowercasedFilter))
            );
        }

        return reports.sort((a, b) => b.data.toMillis() - a.data.toMillis());

    }, [rapportini, tipoGiornataFilter, selectedNave, selectedLuogo, selectedDate, searchText, user?.uid]);

    const resetFilters = () => {
        setSearchText('');
        setSelectedDate(null);
        setTipoGiornataFilter('all');
        setSelectedNave('all');
        setSelectedLuogo('all');
    };

    const getTipoGiornata = (id: string) => tipiGiornata.find((t: TipoGiornata) => t.id === id);

    // --- RENDER ---
    return (
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={it}>
            <Box sx={{ p: { xs: 2, sm: 3 } }}>
                <Typography variant="h4" component="h1" sx={{ mb: 3 }}>I miei Rapportini</Typography>

                <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
                    <Typography variant="h6" gutterBottom>Filtri</Typography>
                    <Grid container spacing={2} alignItems="center">
                        <Grid
                            size={{
                                xs: 12,
                                md: 6,
                                lg: 4
                            }}>
                            <TextField fullWidth label="Cerca testo..." value={searchText} onChange={(e) => setSearchText(e.target.value)} />
                        </Grid>
                        <Grid
                            size={{
                                xs: 12,
                                sm: 6,
                                md: 3,
                                lg: 2
                            }}>
                            <DatePicker label="Filtra per data" value={selectedDate} onChange={setSelectedDate} slotProps={{ textField: { fullWidth: true } }} />
                        </Grid>
                        <Grid
                            size={{
                                xs: 12,
                                sm: 6,
                                md: 3,
                                lg: 2
                            }}>
                            <FormControl fullWidth><InputLabel>Tipo Giornata</InputLabel><Select value={tipoGiornataFilter} label="Tipo Giornata" onChange={(e) => setTipoGiornataFilter(e.target.value)}><MenuItem value="all">Tutti i tipi</MenuItem>{tipiGiornata.map((tipo: TipoGiornata) => (<MenuItem key={tipo.id} value={tipo.id}>{tipo.nome}</MenuItem>))}</Select></FormControl>
                        </Grid>
                        <Grid
                            size={{
                                xs: 12,
                                sm: 6,
                                md: 3,
                                lg: 2
                            }}>
                            <FormControl fullWidth><InputLabel>Nave</InputLabel><Select value={selectedNave} label="Nave" onChange={(e) => setSelectedNave(e.target.value)}><MenuItem value="all">Tutte le navi</MenuItem>{navi.map((nave: Nave) => (<MenuItem key={nave.id} value={nave.id}>{nave.nome}</MenuItem>))}</Select></FormControl>
                        </Grid>
                        <Grid
                            size={{
                                xs: 12,
                                sm: 6,
                                md: 3,
                                lg: 2
                            }}>
                            <FormControl fullWidth><InputLabel>Luogo</InputLabel><Select value={selectedLuogo} label="Luogo" onChange={(e) => setSelectedLuogo(e.target.value)}><MenuItem value="all">Tutti i luoghi</MenuItem>{luoghi.map((luogo: Luogo) => (<MenuItem key={luogo.id} value={luogo.id}>{luogo.nome}</MenuItem>))}</Select></FormControl>
                        </Grid>
                        <Grid
                            container
                            justifyContent="flex-end"
                            size={{
                                xs: 12,
                                sm: 6,
                                md: 3,
                                lg: 12
                            }}>
                            <Button onClick={resetFilters}>Azzera Filtri</Button>
                        </Grid>
                    </Grid>
                </Paper>

                <Grid container spacing={2}>
                    {filteredReports.length > 0 ? filteredReports.map((report) => {
                        const tipo = getTipoGiornata(report.tipoGiornataId);
                        return (
                            <Grid
                                key={report.id}
                                size={{
                                    xs: 12,
                                    sm: 6,
                                    md: 4
                                }}>
                                <Card elevation={2} sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                    <CardContent>
                                        <Typography variant="h6" component="div">{format(report.data.toDate(), 'EEEE dd/MM/yyyy', { locale: it })}</Typography>
                                        <Chip icon={tipo?.icona ? <Icon sx={{ color: `${tipo?.colore} !important` }}>{tipo.icona}</Icon> : undefined} label={tipo?.nome || 'N/D'} variant="outlined" sx={{ my: 1, color: tipo?.colore, borderColor: tipo?.colore }} />
                                        <Typography variant="body2" color="text.secondary">Ore lavorate: {report.oreLavoro}</Typography>
                                        {report.descrizioneBreve && <Typography variant="body2" noWrap>Dettagli: {report.descrizioneBreve}</Typography>}
                                    </CardContent>
                                    <CardActions sx={{ justifyContent: 'flex-end' }}>
                                        <Button size="small" onClick={() => navigate(`/report/edit/${report.id}`)}>Dettagli</Button>
                                    </CardActions>
                                </Card>
                            </Grid>
                        );
                    }) : (
                        <Grid size={12}>
                            <Typography sx={{ textAlign: 'center', mt: 4 }}>Nessun rapportino trovato per i filtri selezionati.</Typography>
                        </Grid>
                    )}
                </Grid>
            </Box>
        </LocalizationProvider>
    );
};

export default ReportListPage;
