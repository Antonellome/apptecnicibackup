
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '@/firebase';
import { doc, getDoc, addDoc, updateDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useGlobalData } from '@/contexts/GlobalDataProvider';
import { useAuth } from '@/hooks/useAuth';
import { Rapportino } from '@/models/definitions';
import { rapportoConverter } from '@/utils/converters';

import {
    TextField, Button, Select, MenuItem, FormControl, InputLabel, Typography, 
    Container, Paper, Grid, CircularProgress, Alert, Box
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

    const [data, setData] = useState<Date | null>(new Date());
    const [tecnicoScriventeId, setTecnicoScriventeId] = useState(user?.uid || '');
    const [giornataId, setGiornataId] = useState(''); // CORRETTO: da tipoGiornataId a giornataId
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
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
                        setGiornataId(d.giornataId); // CORRETTO
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
            // Reset per un nuovo form
            setData(new Date());
            setTecnicoScriventeId(user?.uid || '');
            setGiornataId(''); // CORRETTO
            setOreLavorate(8);
        }
    }, [reportId, user?.uid]);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!giornataId || !tecnicoScriventeId) {
            setError('Tipo giornata e tecnico sono obbligatori.');
            return;
        }

        setLoading(true);
        setError(null);

        const rapportinoData: Omit<Rapportino, 'id'> = {
            data: data || new Date(),
            tecnicoScriventeId,
            giornataId, // CORRETTO
            oreLavorate,
            oreViaggio,
            oreTotali: oreLavorate + oreViaggio,
            sedePartenza,
            sedeArrivo,
            kmInizio: kmInizio === '' ? undefined : kmInizio,
            kmFine: kmFine === '' ? undefined : kmFine,
            kmTotali: (kmFine !== '' && kmInizio !== '') ? kmFine - kmInizio : undefined,
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
                await updateDoc(reportRef, rapportinoData);
            } else {
                await addDoc(collection(db, 'rapportini'), rapportinoData);
            }
            navigate('/reports');
        } catch (err) {
            console.error(err);
            setError("Salvataggio fallito. Riprova.");
        } finally {
            setLoading(false);
        }
    };

    if (dataLoading || loading) return <CircularProgress />;

    return (
        <Container maxWidth="lg" sx={{ my: 4 }}>
            <Paper sx={{ p: { xs: 2, md: 4 } }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    {reportId ? 'Modifica Rapportino' : 'Nuovo Rapportino'}
                </Typography>

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                <form onSubmit={handleSubmit}>
                    <Grid container spacing={3}>
                        <Grid item xs={12} sm={4}>
                            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={it}>
                                <DatePicker
                                    label="Data"
                                    value={data}
                                    onChange={(newValue) => setData(newValue)}
                                    renderInput={(params) => <TextField {...params} fullWidth />}
                                />
                            </LocalizationProvider>
                        </Grid>

                        <Grid item xs={12} sm={8}>
                            <FormControl fullWidth required>
                                <InputLabel>Tipo Giornata</InputLabel>
                                <Select
                                    name="giornataId" // CORRETTO
                                    value={giornataId} // CORRETTO
                                    onChange={(e) => setGiornataId(e.target.value)} // CORRETTO
                                >
                                    {tipiGiornata.map(tipo => (
                                        <MenuItem key={tipo.id} value={tipo.id}>{tipo.nome}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        {/* ... tutti gli altri campi del form ... */}
                    </Grid>
                    <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button onClick={() => navigate('/reports')} sx={{ mr: 1 }}>Annulla</Button>
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
