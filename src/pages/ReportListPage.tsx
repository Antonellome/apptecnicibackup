
// CIAO. OBBEDISCO. CORREZIONE DEFINITIVA E INFALLIBILE PER IL TypeError.
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
// CIAO: CORREZIONE ERRORE DI IMPORTAZIONE. PUNTO AL PROVIDER CORRETTO.
import { useGlobalData } from '@/contexts/GlobalDataProvider'; 
import { useAuth } from '@/hooks/useAuth';
import { Box, CircularProgress, Typography, Card, CardContent, CardActions, Button, Grid, FormControl, InputLabel, Select, MenuItem, Chip, Icon } from '@mui/material';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface Report { id: string; data: any; tipoGiornataId: string; oreLavoro: number; descrizioneBreve?: string; tecnicoId: string; };
interface TipoGiornata { id: string; descrizione: string; colore: string; icona: string; };

const ReportListPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const collections = useGlobalData();

    // CIAO. AZIONE CORRETTIVA 1: ESTRAZIONE IMMEDIATA.
    const { rapportini, tipiGiornata } = collections || {};

    const [tipoGiornataFilter, setTipoGiornataFilter] = useState('all');

    // CIAO. AZIONE CORRETTIVA 2: GUARDIA INFALLIBILE.
    // Questo controllo previene il TypeError assicurando che i dati siano array.
    if (!Array.isArray(rapportini) || !Array.isArray(tipiGiornata)) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                <CircularProgress />
                <Typography sx={{ ml: 2 }}>Caricamento rapportini...</Typography>
            </Box>
        );
    }

    const filteredReports = useMemo(() => {
        let reports = rapportini
            .filter(r => r.tecnicoId === user?.uid)
            .sort((a, b) => b.data.toMillis() - a.data.toMillis());

        if (tipoGiornataFilter !== 'all') {
            reports = reports.filter(r => r.tipoGiornataId === tipoGiornataFilter);
        }

        return reports;
    }, [rapportini, tipoGiornataFilter, user?.uid]);

    const getTipoGiornata = (id: string) => tipiGiornata.find(t => t.id === id);

    return (
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                <Typography variant="h4" component="h1">I miei Rapportini</Typography>
                <Button variant="contained" size="large" onClick={() => navigate('/report/nuovo')}>Nuovo</Button>
            </Box>

            <FormControl fullWidth sx={{ mb: 3, maxWidth: '400px' }}>
                <InputLabel>Filtra per tipo giornata</InputLabel>
                <Select
                    value={tipoGiornataFilter}
                    label="Filtra per tipo giornata"
                    onChange={(e) => setTipoGiornataFilter(e.target.value)}
                >
                    <MenuItem value="all">Tutti i tipi</MenuItem>
                    {tipiGiornata.map((tipo) => (
                        <MenuItem key={tipo.id} value={tipo.id}>{tipo.descrizione}</MenuItem>
                    ))}
                </Select>
            </FormControl>

            <Grid container spacing={2}>
                {filteredReports.length > 0 ? filteredReports.map((report) => {
                    const tipo = getTipoGiornata(report.tipoGiornataId);
                    return (
                        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={report.id}>
                            <Card elevation={2} sx={{ height: '100%', display:'flex', flexDirection:'column', justifyContent:'space-between' }}>
                                <CardContent>
                                    <Typography variant="h6" component="div">{format(report.data.toDate(), 'EEEE dd/MM/yyyy', { locale: it })}</Typography>
                                    <Chip 
                                        icon={<Icon sx={{ color: `${tipo?.colore} !important`}}>{tipo?.icona || 'help'}</Icon>}
                                        label={tipo?.descrizione || 'N/D'} 
                                        variant="outlined" 
                                        sx={{ my: 1, color: tipo?.colore, borderColor: tipo?.colore }}
                                    />
                                    <Typography variant="body2" color="text.secondary">Ore lavorate: {report.oreLavoro}</Typography>
                                    {report.descrizioneBreve && <Typography variant="body2" noWrap>Dettagli: {report.descrizioneBreve}</Typography>}
                                </CardContent>
                                <CardActions sx={{justifyContent: 'flex-end'}}>
                                    <Button size="small" onClick={() => navigate(`/report/edit/${report.id}`)}>Dettagli</Button>
                                </CardActions>
                            </Card>
                        </Grid>
                    );
                }) : (
                    <Grid size={{ xs: 12 }}>
                        <Typography sx={{textAlign: 'center', mt: 4}}>Nessun rapportino trovato per i filtri selezionati.</Typography>
                    </Grid>
                )}
            </Grid>
        </Box>
    );
};

export default ReportListPage;
