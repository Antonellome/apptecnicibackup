import React, { useMemo, useEffect } from 'react';
import { Formik, Form, Field, useFormikContext } from 'formik';
import { TextField as FormikTextField } from 'formik-mui';
import { Button, DialogActions, DialogContent, DialogTitle, CircularProgress, Grid, MenuItem, Autocomplete, TextField, Switch, FormControlLabel, Typography, Chip } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import dayjs, { Dayjs } from 'dayjs';
import { useCollection } from '../hooks/useCollection';
import type { Rapportino, Tecnico, Nave, Luogo, TipoGiornata, Veicolo } from '../models/definitions';
import { doc, setDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { createRapportinoSchema } from '../models/rapportino.schema';
import duration from 'dayjs/plugin/duration';
import { useNavigate } from 'react-router-dom';
dayjs.extend(duration);

// Helper per la visualizzazione delle ore straordinarie
const formatOreLavorate = (ore: number) => {
    const oreFormattate = parseFloat(ore.toFixed(2));
    if (oreFormattate <= 8) {
        return oreFormattate.toString();
    }
    const straordinario = oreFormattate - 8;
    return `8+${straordinario.toString()}`;
};

// Componente per il calcolo automatico delle ore
const OreLavorateCalculator = () => {
    const { values, setFieldValue } = useFormikContext<any>();
    useEffect(() => {
        if (!values.inserimentoManualeOre) {
            const start = dayjs(values.oraInizio, 'HH:mm');
            const end = dayjs(values.oraFine, 'HH:mm');
            if (start.isValid() && end.isValid() && end.isAfter(start)) {
                const diffInMinutes = end.diff(start, 'minute');
                const totalHours = (diffInMinutes - values.pausa) / 60;
                setFieldValue('oreLavorate', totalHours);
            } else {
                setFieldValue('oreLavorate', 0);
            }
        }
    }, [values.oraInizio, values.oraFine, values.pausa, values.inserimentoManualeOre, setFieldValue]);
    return null;
};

interface RapportinoFormProps {
    rapportino?: Rapportino | null;
    currentTecnico?: Tecnico;
    initialDate?: Dayjs;
}

const NuovoRapportino: React.FC<RapportinoFormProps> = ({ rapportino, currentTecnico, initialDate }) => {
    const navigate = useNavigate();
    const { data: tecnici, loading: loadingTecnici } = useCollection<Tecnico>('tecnici');
    const { data: navi, loading: loadingNavi } = useCollection<Nave>('navi');
    const { data: luoghi, loading: loadingLuoghi } = useCollection<Luogo>('luoghi');
    const { data: tipiGiornata, loading: loadingTipi } = useCollection<TipoGiornata>('tipiGiornata');
    const { data: veicoli, loading: loadingVeicoli } = useCollection<Veicolo>('veicoli');

    const validationSchema = useMemo(() => createRapportinoSchema(tipiGiornata || []), [tipiGiornata]);

    const initialValues = useMemo(() => {
        const defaultValues = {
            data: initialDate || dayjs(),
            tecnicoId: currentTecnico?.id || '',
            giornataId: '',
            oreLavorate: 8,
            naveId: null,
            luogoId: null,
            veicoloId: null,
            altriTecnici: [],
            breveDescrizione: '',
            lavoroEseguito: '',
            materialiImpiegati: '',
            inserimentoManualeOre: false,
            oraInizio: '07:30',
            oraFine: '16:30',
            pausa: 60,
        };

        if (rapportino) {
            return {
                ...defaultValues,
                ...rapportino,
                data: rapportino.data ? dayjs(rapportino.data.toDate()) : dayjs(),
                naveId: navi?.find(n => n.id === (rapportino.naveId as any)?.id || rapportino.naveId) || null,
                luogoId: luoghi?.find(l => l.id === (rapportino.luogoId as any)?.id || rapportino.luogoId) || null,
                veicoloId: veicoli?.find(v => v.id === (rapportino.veicoloId as any)?.id || rapportino.veicoloId) || null,
            };
        }

        return defaultValues;
    }, [rapportino, currentTecnico, initialDate, navi, luoghi, veicoli]);

    const handleSubmit = async (values: any, { setSubmitting }: any) => {
        try {
            const id = rapportino?.id || doc(collection(db, 'rapportini')).id;
            const naveId = values.naveId && typeof values.naveId === 'object' ? (values.naveId as Nave).id : values.naveId;
            const luogoId = values.luogoId && typeof values.luogoId === 'object' ? (values.luogoId as Luogo).id : values.luogoId;
            const veicoloId = values.veicoloId && typeof values.veicoloId === 'object' ? (values.veicoloId as Veicolo).id : values.veicoloId;
            const altriTecniciIds = values.altriTecnici.map((t: Tecnico | string) => typeof t === 'string' ? t : t.id);

            const docData = {
                ...values,
                naveId,
                luogoId,
                veicoloId,
                altriTecniciIds,
                data: (values.data as Dayjs).toDate(),
                updatedAt: serverTimestamp(),
                ...( !rapportino && { createdAt: serverTimestamp(), createdBy: currentTecnico?.id })
            };
            delete docData.altriTecnici;

            await setDoc(doc(db, 'rapportini', id), docData, { merge: true });
            navigate('/'); // Torna alla dashboard dopo il salvataggio
        } catch (error) {
            console.error("Errore nel salvataggio del rapportino:", error);
        } finally {
            setSubmitting(false);
        }
    };
    
    const handleClose = () => {
        navigate('/'); // Torna alla dashboard
    }

    const isLoading = loadingNavi || loadingLuoghi || loadingTipi || loadingTecnici || loadingVeicoli;

    if (isLoading) {
        return <DialogContent><CircularProgress /></DialogContent>
    }
    
    const altriTecniciOptions = tecnici?.filter(t => t.id !== currentTecnico?.id) || [];

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleSubmit} enableReinitialize>
                {({ isSubmitting, setFieldValue, values, errors, touched }) => (
                    <Form>
                        <OreLavorateCalculator />
                        <DialogTitle>{rapportino ? 'Modifica Rapportino' : 'Nuovo Rapportino'}</DialogTitle>
                        <DialogContent>
                            <Grid container spacing={2} sx={{pt: 1}}>
                                <Grid size={12}><Typography variant="subtitle1" gutterBottom>Dati Principali</Typography></Grid>
                                <Grid
                                    size={{
                                        xs: 12,
                                        sm: 4
                                    }}>
                                    <DatePicker label="Data" value={values.data} onChange={(newValue) => setFieldValue('data', newValue)} sx={{width: '100%'}} />
                                </Grid>
                                <Grid
                                    size={{
                                        xs: 12,
                                        sm: 8
                                    }}>
                                    <TextField label="Tecnico Scrivente" fullWidth disabled value={currentTecnico ? `${currentTecnico.cognome} ${currentTecnico.nome}` : ''} />
                                </Grid>

                                <Grid size={12}><Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>Calcolo Ore</Typography></Grid>
                                <Grid size={12}>
                                    <FormControlLabel control={<Switch checked={values.inserimentoManualeOre} onChange={(e) => setFieldValue('inserimentoManualeOre', e.target.checked)} />} label="Totale ore manuale" />
                                </Grid>
                                
                                {values.inserimentoManualeOre ? (
                                    <Grid size={12}>
                                        <Field name="oreLavorate" component={FormikTextField} select label="Ore Lavorate" fullWidth required>
                                            {[...Array(16).keys()].map(i => (
                                                <MenuItem key={i + 1} value={i + 1}>{formatOreLavorate(i + 1)}</MenuItem>
                                            ))}
                                        </Field>
                                    </Grid>
                                ) : (
                                    <>
                                        <Grid
                                            size={{
                                                xs: 12,
                                                sm: 3
                                            }}><Field as={TextField} type="time" name="oraInizio" label="Inizio" fullWidth InputLabelProps={{ shrink: true }} /></Grid>
                                        <Grid
                                            size={{
                                                xs: 12,
                                                sm: 3
                                            }}><Field as={TextField} type="time" name="oraFine" label="Fine" fullWidth InputLabelProps={{ shrink: true }} /></Grid>
                                        <Grid
                                            size={{
                                                xs: 12,
                                                sm: 3
                                            }}>
                                            <Field name="pausa" component={FormikTextField} select label="Pausa (min)" fullWidth>
                                                <MenuItem value={0}>0</MenuItem>
                                                <MenuItem value={30}>30</MenuItem>
                                                <MenuItem value={60}>60</MenuItem>
                                                <MenuItem value={90}>90</MenuItem>
                                                <MenuItem value={120}>120</MenuItem>
                                            </Field>
                                        </Grid>
                                        <Grid
                                            size={{
                                                xs: 12,
                                                sm: 3
                                            }}>
                                            <TextField label="Totale Ore" fullWidth disabled value={formatOreLavorate(values.oreLavorate)} InputProps={{ readOnly: true }} />
                                        </Grid>
                                    </>
                                )}
                                
                                <Grid size={12}><Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>Riferimenti</Typography></Grid>
                                <Grid
                                    size={{
                                        xs: 12,
                                        sm: 6
                                    }}>
                                    <Field name="giornataId" component={FormikTextField} select label="Tipo Giornata" fullWidth required>
                                        {tipiGiornata?.map(option => <MenuItem key={option.id} value={option.id}>{option.nome}</MenuItem>) || []}
                                    </Field>
                                </Grid>
                                <Grid
                                    size={{
                                        xs: 12,
                                        sm: 6
                                    }}>
                                    <Autocomplete options={veicoli || []} getOptionLabel={(option) => option.nome} value={values.veicoloId as any} onChange={(_, newValue) => setFieldValue('veicoloId', newValue)} renderInput={(params) => <TextField {...params} label="Veicolo" error={touched.veicoloId && !!errors.veicoloId} />} isOptionEqualToValue={(option, value) => option.id === value.id} />
                                </Grid>
                                <Grid
                                    size={{
                                        xs: 12,
                                        sm: 6
                                    }}>
                                    <Autocomplete options={navi || []} getOptionLabel={(option) => option.nome} value={values.naveId as any} onChange={(_, newValue) => setFieldValue('naveId', newValue)} renderInput={(params) => <TextField {...params} label="Nave" error={touched.naveId && !!errors.naveId} />} isOptionEqualToValue={(option, value) => option.id === value.id}/>
                                </Grid>
                                <Grid
                                    size={{
                                        xs: 12,
                                        sm: 6
                                    }}>
                                    <Autocomplete options={luoghi || []} getOptionLabel={(option) => option.nome} value={values.luogoId as any} onChange={(_, newValue) => setFieldValue('luogoId', newValue)} renderInput={(params) => <TextField {...params} label="Luogo" error={touched.luogoId && !!errors.luogoId} />} isOptionEqualToValue={(option, value) => option.id === value.id}/>
                                </Grid>

                                <Grid size={12}><Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>Dettagli Intervento</Typography></Grid>
                                <Grid size={12}>
                                    <Field name="breveDescrizione" component={FormikTextField} label="Breve Descrizione Intervento" multiline rows={2} fullWidth />
                                </Grid>
                                <Grid size={12}>
                                    <Field name="lavoroEseguito" component={FormikTextField} label="Lavoro Eseguito" multiline rows={4} fullWidth />
                                </Grid>
                                <Grid size={12}>
                                    <Field name="materialiImpiegati" component={FormikTextField} label="Materiali Impiegati" multiline rows={3} fullWidth />
                                </Grid>
                                
                                <Grid size={12}><Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>Altri Tecnici</Typography></Grid>
                                <Grid size={12}>
                                    <Autocomplete
                                        multiple
                                        options={altriTecniciOptions}
                                        getOptionLabel={(option) => `${option.cognome} ${option.nome}`}
                                        value={values.altriTecnici.map(id => tecnici?.find(t => t.id === id)).filter(Boolean)}
                                        onChange={(_, newValue) => setFieldValue('altriTecnici', newValue.map(t => t.id))}
                                        renderTags={(value, getTagProps) => value.map((option, index) => (
                                            <Chip key={option.id} variant="outlined" label={`${option.cognome} ${option.nome}`} {...getTagProps({ index })} />
                                        ))}
                                        renderInput={(params) => <TextField {...params} label="Aggiungi Tecnici" />}
                                        isOptionEqualToValue={(option, value) => option.id === value.id}
                                    />
                                </Grid>
                            </Grid>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={handleClose}>Annulla</Button>
                            <Button type="submit" variant="contained" disabled={isSubmitting}>
                                {isSubmitting ? <CircularProgress size={24} /> : 'Salva'}
                            </Button>
                        </DialogActions>
                    </Form>
                )}
            </Formik>
        </LocalizationProvider>
    );
};

export default NuovoRapportino;
