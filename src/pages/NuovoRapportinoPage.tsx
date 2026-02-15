import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '@/firebase';
import { doc, getDoc, addDoc, updateDoc, collection } from 'firebase/firestore';
import { useGlobalData } from '@/contexts/GlobalDataProvider';
import { useAuth } from '@/hooks/useAuth';
import { Rapportino } from '@/models/definitions';
import { rapportoConverter } from '@/utils/converters';

import {
    TextField, Button, Select, MenuItem, FormControl, InputLabel, Typography, 
    Container, Paper, Grid, CircularProgress, Alert, Box, Autocomplete
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { it } from 'date-fns/locale';

const RapportinoFormPage: React.FC = () => {
    const { reportId } = useParams<{ reportId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { tipiGiornata, navi, luoghi, veicoli, tecnici, loading: dataLoading } = useGlobalData();

    // Stato del Form
    const [data, setData] = useState<Date | null>(new Date());
    const [tecnicoScriventeId, setTecnicoScriventeId] = useState(user?.uid || '');
    const [tipoGiornataId, setTipoGiornataId] = useState(''); // CIAO: Corretto
    const [oreLavorate, setOreLavorate] = useState(8);
    const [oreViaggio, setOreViaggio] = useState(0);
    const [sedePartenza, setSedePartenza] = useState('');
    const [sedeArrivo, setSedeArrivo] = useState('');
    const [kmInizio, setKmInizio] = useState<number | '' >('');
    const [kmFine, setKmFine] = useState<number | '' >('');
    const [veicoloId, setVeicoloId] = useState('');
    const [naveId, setNaveId] = useState('');
    const [luogoId, setLuogoId] = useState('');
    const [breveDescrizione, setBreveDescrizione] = useState('');
    const [descrizioneLavoro, setDescrizioneLavoro] = useState('');
    const [materiali, setMateriali] = useState('');
    const [altriTecniciIds, setAltriTecniciIds] = useState<string[]>([]);
    
    // Stato UI
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Caricamento dati per modifica
    useEffect(() => {
        if (reportId) {
            const fetchReport = async () => {
                setLoading(true);
                try {
                    const reportRef = doc(db, 'rapportini', reportId).withConverter(rapportoConverter);
                    const reportSnap = await getDoc(reportRef);
                    if (reportSnap.exists()) {
                        const d = reportSnap.data();
                        setData(d.data.toDate());
                        setTecnicoScriventeId(d.tecnicoScriventeId);
                        setTipoGiornataId(d.tipoGiornataId); // CIAO: Corretto
                        setOreLavorate(d.oreLavorate);
                        setOreViaggio(d.oreViaggio);
                        setSedePartenza(d.sedePartenza || '');
                        setSedeArrivo(d.sedeArrivo || '');
                        setKmInizio(d.kmInizio ?? '');
                        setKmFine(d.kmFine ?? '');
                        setVeicoloId(d.veicoloId || '');
                        setNaveId(d.naveId || '');
                        setLuogoId(d.luogoId || '');
                        setBreveDescrizione(d.breveDescrizione || '');
                        setDescrizioneLavoro(d.descrizioneLavoro || '');
                        setMateriali(d.materiali || '');
                        setAltriTecniciIds(d.altriTecniciIds || []);
                    } else {
                        setError("Rapportino non trovato.");
                    }
                } catch (err) {
                    setError("Errore nel caricamento del rapportino.");
                } finally {
                    setLoading(false);
                }
            };
            fetchReport();
        } else {
            setTecnicoScriventeId(user?.uid || '');
        }
    }, [reportId, user?.uid]);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!tipoGiornataId || !tecnicoScriventeId) { // CIAO: Corretto
            setError('Tipo giornata e tecnico sono obbligatori.');
            return;
        }

        setLoading(true);
        setError(null);

        const rapportinoData: Omit<Rapportino, 'id'> = {
            data: data || new Date(),
            tecnicoScriventeId,
            tipoGiornataId, // CIAO: Corretto
            oreLavorate,
            oreViaggio,
            oreTotali: oreLavorate + oreViaggio,
            sedePartenza,
            sedeArrivo,
            kmInizio: kmInizio === '' ? undefined : kmInizio,
            kmFine: kmFine === '' ? undefined : kmFine,
            kmTotali: (kmFine !== '' && kmInizio !== '') ? Number(kmFine) - Number(kmInizio) : undefined,
            veicoloId: veicoloId || undefined,
            naveId: naveId || undefined,
            luogoId: luogoId || undefined,
            breveDescrizione,
            descrizioneLavoro,
            materiali,
            altriTecniciIds,
            concluso: true,
            approvato: false,
        };

        try {
            if (reportId) {
                const reportRef = doc(db, 'rapportini', reportId);
                await updateDoc(reportRef, rapportinoConverter.toFirestore(rapportinoData));
            } else {
                await addDoc(collection(db, 'rapportini').withConverter(rapportoConverter), rapportinoData);
            }
            navigate('/reports');
        } catch (err) {
            console.error(err);
            setError("Salvataggio fallito. Riprova.");
        } finally {
            setLoading(false);
        }
    };

    if (dataLoading) return <CircularProgress />;

    return (
        <Container maxWidth="lg" sx={{ my: 4 }}>
            <Paper sx={{ p: { xs: 2, md: 4 } }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    {reportId ? 'Modifica Rapportino' : 'Nuovo Rapportino'}
                </Typography>

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                <form onSubmit={handleSubmit}>
                    <Grid container spacing={3}>
                        {/* Data, Tipo Giornata, Ore... */}
                        <Grid
                            size={{
                                xs: 12,
                                sm: 4
                            }}>
                            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={it}>
                                <DatePicker
                                    label="Data"
                                    value={data}
                                    onChange={(newValue) => setData(newValue)}
                                    renderInput={(params) => <TextField {...params} fullWidth required />}
                                />
                            </LocalizationProvider>
                        </Grid>

                        <Grid
                            size={{
                                xs: 12,
                                sm: 5
                            }}>
                            <FormControl fullWidth required>
                                <InputLabel>Tipo Giornata</InputLabel>
                                <Select
                                    name="tipoGiornataId" // CIAO: Corretto
                                    value={tipoGiornataId} // CIAO: Corretto
                                    onChange={(e) => setTipoGiornataId(e.target.value)} // CIAO: Corretto
                                >
                                    {tipiGiornata.map(tipo => (
                                        <MenuItem key={tipo.id} value={tipo.id}>{tipo.nome}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid
                            size={{
                                xs: 6,
                                sm: 1.5
                            }}>
                            <TextField label="Ore Lavoro" type="number" value={oreLavorate} onChange={e => setOreLavorate(Number(e.target.value))} fullWidth required />
                        </Grid>
                        <Grid
                            size={{
                                xs: 6,
                                sm: 1.5
                            }}>
                             <TextField label="Ore Viaggio" type="number" value={oreViaggio} onChange={e => setOreViaggio(Number(e.target.value))} fullWidth required />
                        </Grid>

                        {/* Sezione Luoghi e Mezzi */}
                        <Grid
                            size={{
                                xs: 12,
                                sm: 6
                            }}>
                             <FormControl fullWidth>
                                <InputLabel>Nave</InputLabel>
                                <Select value={naveId} onChange={e => setNaveId(e.target.value)}>
                                    {navi.map(n => <MenuItem key={n.id} value={n.id}>{n.nome}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid
                            size={{
                                xs: 12,
                                sm: 6
                            }}>
                            <FormControl fullWidth>
                                <InputLabel>Luogo</InputLabel>
                                <Select value={luogoId} onChange={e => setLuogoId(e.target.value)}>
                                    {luoghi.map(l => <MenuItem key={l.id} value={l.id}>{l.nome}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>

                         {/* Sezione Viaggio e Km */}
                        <Grid
                            size={{
                                xs: 12,
                                sm: 6
                            }}>
                            <TextField label="Sede di Partenza" value={sedePartenza} onChange={e => setSedePartenza(e.target.value)} fullWidth />
                        </Grid>
                        <Grid
                            size={{
                                xs: 12,
                                sm: 6
                            }}>
                            <TextField label="Sede di Arrivo" value={sedeArrivo} onChange={e => setSedeArrivo(e.target.value)} fullWidth />
                        </Grid>
                        <Grid
                            size={{
                                xs: 12,
                                sm: 4
                            }}>
                             <FormControl fullWidth>
                                <InputLabel>Veicolo</InputLabel>
                                <Select value={veicoloId} onChange={e => setVeicoloId(e.target.value)}>
                                    {veicoli.map(v => <MenuItem key={v.id} value={v.id}>{`${v.marca} ${v.modello} (${v.targa})`}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid
                            size={{
                                xs: 6,
                                sm: 4
                            }}>
                            <TextField label="Km Inizio" type="number" value={kmInizio} onChange={e => setKmInizio(e.target.value === '' ? '' : Number(e.target.value))} fullWidth />
                        </Grid>
                        <Grid
                            size={{
                                xs: 6,
                                sm: 4
                            }}>
                            <TextField label="Km Fine" type="number" value={kmFine} onChange={e => setKmFine(e.target.value === '' ? '' : Number(e.target.value))} fullWidth />
                        </Grid>

                        {/* Descrizioni */}
                        <Grid size={12}>
                            <TextField label="Breve Descrizione Attività" value={breveDescrizione} onChange={e => setBreveDescrizione(e.target.value)} fullWidth />
                        </Grid>
                        <Grid size={12}>
                            <TextField label="Descrizione Dettagliata Lavoro" value={descrizioneLavoro} onChange={e => setDescrizioneLavoro(e.target.value)} multiline rows={4} fullWidth />
                        </Grid>
                        <Grid size={12}>
                            <TextField label="Materiali Utilizzati" value={materiali} onChange={e => setMateriali(e.target.value)} multiline rows={2} fullWidth />
                        </Grid>
                        
                        {/* Altri Tecnici */}
                        <Grid size={12}>
                             <Autocomplete
                                multiple
                                options={tecnici.filter(t => t.id !== tecnicoScriventeId)}
                                getOptionLabel={(option) => `${option.nome} ${option.cognome}`}
                                value={tecnici.filter(t => altriTecniciIds.includes(t.id))}
                                onChange={(_, newValue) => {
                                    setAltriTecniciIds(newValue.map(v => v.id));
                                }}
                                renderInput={(params) => <TextField {...params} label="Altri tecnici presenti" />}
                            />
                        </Grid>
                    </Grid>
                    <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button onClick={() => navigate('/reports')} sx={{ mr: 1 }} disabled={loading}>Annulla</Button>
                        <Button type="submit" variant="contained" disabled={loading}>
                            {loading ? <CircularProgress size={24} /> : (reportId ? 'Salva Modifiche' : 'Crea Rapportino')}
                        </Button>
                    </Box>
                </form>
            </Paper>
        </Container>
    );
};

export default RapportinoFormPage;
