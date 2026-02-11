
import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    doc, getDoc, collection, getDocs, Timestamp, addDoc, updateDoc,
    QuerySnapshot, DocumentData, QueryDocumentSnapshot 
} from 'firebase/firestore';
import { db } from '../firebase'; // Usando percorso relativo
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createRapportinoSchema, type RapportinoSchema } from '../models/rapportino.schema';
import { 
    TextField, Button, Grid, CircularProgress, Typography, Paper, Box, 
    Autocomplete, IconButton, Switch, FormControlLabel, Tooltip, Select, MenuItem, InputLabel, FormControl 
} from '@mui/material';
import { DatePicker, TimePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import dayjs from 'dayjs';
import 'dayjs/locale/it';
import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
// import { useAlert } from '../contexts/AlertContext'; // Commentato come opzionale
import { Tecnico, Nave, Luogo, TipoGiornata, Veicolo, Rapportino } from '../models/definitions';
import { useAuth } from '../hooks/useAuth'; // CORRETTO: Aggiunto per ottenere l'utente attuale

// Imposta la lingua per dayjs
dayjs.locale('it');

// Funzione helper per caricare una collection da Firestore
const fetchCollection = async <T extends { id: string }>(colName: string): Promise<T[]> => {
    const querySnapshot = await getDocs(collection(db, colName));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
};


// --- Inizio del componente ---
const RapportinoEdit: React.FC<{ isReadOnly?: boolean }> = ({ isReadOnly = false }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  // const { showAlert } = useAlert();
  const { user } = useAuth(); // Ottiene l'utente corrente dal contesto di autenticazione
  const isNew = !id;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [options, setOptions] = useState<{
      tecnici: Tecnico[],
      navi: Nave[],
      luoghi: Luogo[],
      tipiGiornata: TipoGiornata[],
      veicoli: Veicolo[],
  }>({
      tecnici: [],
      navi: [],
      luoghi: [],
      tipiGiornata: [],
      veicoli: [],
  });

  const rapportinoSchema = useMemo(() => createRapportinoSchema(options.tipiGiornata), [options.tipiGiornata]);

  const { control, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<RapportinoSchema>({
    resolver: zodResolver(rapportinoSchema),
    defaultValues: {
        data: dayjs(),
        inserimentoManualeOre: false,
        oraInizio: dayjs().hour(7).minute(30),
        oraFine: dayjs().hour(16).minute(30),
        pausa: 60,
        oreLavorate: 8,
        tecnicoScriventeId: user?.uid || '',
        tecniciAggiuntiIds: [],
        naveId: null,
        luogoId: null,
        giornataId: '',
        veicoloId: null,
        breveDescrizione: '',
        lavoroEseguito: '',
        materialiImpiegati: '',
    },
    reValidateMode: 'onChange',
  });

  // Watch per logica condizionale
  const watchGiornataId = watch('giornataId');
  const isGiornataLavorativa = useMemo(() => {
    const tipo = options.tipiGiornata.find(t => t.id === watchGiornataId);
    return tipo ? tipo.lavorativa : false;
  }, [watchGiornataId, options.tipiGiornata]);
  
  const watchInserimentoManuale = watch('inserimentoManualeOre');
  
  // Effetto per calcolare le ore lavorate
  useEffect(() => {
    const subscription = watch((value, { name }) => {
        if (!value.inserimentoManualeOre && (name === 'oraInizio' || name === 'oraFine' || name === 'pausa')) {
            const inizio = dayjs(value.oraInizio);
            const fine = dayjs(value.oraFine);
            if (fine.isAfter(inizio)) {
                const diffMinuti = fine.diff(inizio, 'minute');
                const pausaMinuti = value.pausa || 0;
                const ore = (diffMinuti - pausaMinuti) / 60;
                setValue('oreLavorate', Math.max(0, parseFloat(ore.toFixed(2))));
            }
        }
    });
    return () => subscription.unsubscribe();
  }, [watch, setValue]);

  // Effetto per caricare i dati dal DB
  useEffect(() => {
    const fetchOptionsAndData = async () => {
        setLoading(true);
        try {
            const [tecnici, navi, luoghi, tipiGiornata, veicoli] = await Promise.all([
                fetchCollection<Tecnico>('tecnici'),
                fetchCollection<Nave>('navi_data'),
                fetchCollection<Luogo>('luoghi_data'),
                fetchCollection<TipoGiornata>('tipi_giornata_data'),
                fetchCollection<Veicolo>('veicoli_data'),
            ]);
            setOptions({ tecnici, navi, luoghi, tipiGiornata, veicoli });

            if (!isNew) {
                const docRef = doc(db, 'rapportini', id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data() as Rapportino;
                    // Converte i Timestamp di Firestore in oggetti dayjs per il form
                    reset({
                        ...data,
                        data: dayjs(data.data.toDate()),
                        oraInizio: data.oraInizio ? dayjs(data.oraInizio.toDate()) : null,
                        oraFine: data.oraFine ? dayjs(data.oraFine.toDate()) : null,
                    });
                } else {
                    console.error("No such document!");
                    // showAlert("Rapportino non trovato.", "error");
                    navigate('/');
                }
            } else {
                // Imposta il tecnico che scrive di default se è un nuovo rapportino
                setValue('tecnicoScriventeId', user?.uid || '');
            }

        } catch (error) {
            console.error("Errore nel caricamento dati:", error);
            // showAlert("Errore nel caricamento dei dati.", "error");
        } finally {
            setLoading(false);
        }
    };
    fetchOptionsAndData();
  }, [id, reset, navigate, isNew, setValue, user]);

  const onSubmit = async (data: RapportinoSchema) => { 
    setSubmitting(true);
    try {
        const firestoreData = {
            ...data,
            data: Timestamp.fromDate(data.data.toDate()),
            oraInizio: data.oraInizio ? Timestamp.fromDate(dayjs(data.oraInizio).toDate()) : null,
            oraFine: data.oraFine ? Timestamp.fromDate(dayjs(data.oraFine).toDate()) : null,
        };

        if (isNew) {
            await addDoc(collection(db, 'rapportini'), firestoreData);
            // showAlert("Rapportino creato con successo!", "success");
            alert("Rapportino creato con successo!");
        } else {
            const docRef = doc(db, 'rapportini', id);
            await updateDoc(docRef, firestoreData);
            // showAlert("Rapportino aggiornato con successo!", "success");
            alert("Rapportino aggiornato con successo!");
        }
        navigate(-1); // Torna alla pagina precedente
    } catch (error) {
        console.error("Errore nel salvataggio:", error);
        // showAlert("Errore durante il salvataggio.", "error");
        alert("Errore durante il salvataggio.");
    } finally {
        setSubmitting(false);
    }
  };
  
  const formatHour = (hour: number) => {
      if (hour > 8) return `8 + ${hour - 8}`;
      return hour.toString();
  }
  const hourOptions = Array.from({ length: 17 }, (_, i) => i); // 0 to 16

  if (loading) return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
          <CircularProgress />
      </Box>
  );

  // JSX del componente
  return (
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="it">
        <Box sx={{ maxWidth: 1200, margin: 'auto', p: { xs: 1, sm: 2, md: 3 } }}>
            <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 } }}>
              <>
                <Grid container justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                    <Grid item>
                        <Typography variant="h4" component="h1">{isNew ? 'Nuovo Rapportino' : 'Modifica Rapportino'}</Typography>
                    </Grid>
                    <Grid item>
                        <Tooltip title="Torna Indietro">
                            <IconButton onClick={() => navigate(-1)}>
                                <ArrowBackIcon />
                            </IconButton>
                        </Tooltip>
                    </Grid>
                </Grid>
            
                <form onSubmit={handleSubmit(onSubmit)} noValidate>
                    <Grid container spacing={3}>
                        
                        {/* SEZIONE DATI PRINCIPALI */}
                        <Grid item xs={12}>
                            <Typography variant="h6" gutterBottom>Dati Principali</Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <Controller name="data" control={control} render={({ field, fieldState }) => <DatePicker {...field} label="Data" sx={{ width: '100%' }} slotProps={{ textField: { required: true, error: !!fieldState.error, helperText: fieldState.error?.message } }} />} />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Controller name="tecnicoScriventeId" control={control} render={({ field, fieldState }) => <Autocomplete options={options.tecnici} getOptionLabel={(o) => o.nome ? `${o.nome} ${o.cognome}`: ''} value={options.tecnici.find(t => t.id === field.value) || null} onChange={(_, nv) => field.onChange(nv?.id || '')} disabled renderInput={(params) => <TextField {...params} label="Tecnico Responsabile" required error={!!fieldState.error} helperText={fieldState.error?.message} />} />} />
                                </Grid>
                            </Grid>
                        </Grid>
                        
                        {/* SEZIONE RIFERIMENTI */}
                        <Grid item xs={12}>
                             <Typography variant="h6" gutterBottom>Riferimenti</Typography>
                             <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <Controller name="giornataId" control={control} render={({ field, fieldState }) => <Autocomplete options={options.tipiGiornata} getOptionLabel={(o) => o.nome || ''} value={options.tipiGiornata.find(t => t.id === field.value) || null} onChange={(_, nv) => field.onChange(nv?.id || '')} renderInput={(params) => <TextField {...params} label="Tipo Giornata" required error={!!fieldState.error} helperText={fieldState.error?.message} />} />} />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                     <Controller name="naveId" control={control} render={({ field, fieldState }) => <Autocomplete options={options.navi} getOptionLabel={(o) => o.nome || ''} value={options.navi.find(n => n.id === field.value) || null} onChange={(_, nv) => field.onChange(nv?.id || '')} renderInput={(params) => <TextField {...params} label="Nave" required={isGiornataLavorativa} error={!!fieldState.error} helperText={fieldState.error?.message} />} />} />
                                </Grid>
                                 <Grid item xs={12} sm={6}>
                                     <Controller name="luogoId" control={control} render={({ field, fieldState }) => <Autocomplete options={options.luoghi} getOptionLabel={(o) => o.nome || ''} value={options.luoghi.find(l => l.id === field.value) || null} onChange={(_, nv) => field.onChange(nv?.id || '')} renderInput={(params) => <TextField {...params} label="Luogo" required={isGiornataLavorativa} error={!!fieldState.error} helperText={fieldState.error?.message} />} />} />
                                </Grid>
                             </Grid>
                        </Grid>

                        {/* SEZIONE ORARI */}
                        <Grid item xs={12}>
                            <Typography variant="h6" gutterBottom>Calcolo Ore</Typography>
                            <FormControlLabel control={<Controller name="inserimentoManualeOre" control={control} render={({ field }) => <Switch {...field} checked={field.value} />} />} label="Inserimento Manuale Ore" sx={{ mb: 1 }}/>
                            <Grid container spacing={2} alignItems="center">
                                <Grid item xs={6} sm={3}>
                                    <Controller name="oraInizio" control={control} render={({ field, fieldState }) => <TimePicker {...field} label="Ora Inizio" ampm={false} sx={{ width: '100%' }} disabled={watchInserimentoManuale} slotProps={{ textField: { error: !!fieldState.error, helperText: fieldState.error?.message } }} />} />
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                    <Controller name="oraFine" control={control} render={({ field, fieldState }) => <TimePicker {...field} label="Ora Fine" ampm={false} sx={{ width: '100%' }} disabled={watchInserimentoManuale} slotProps={{ textField: { error: !!fieldState.error, helperText: fieldState.error?.message } }} />} />
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                     <Controller name="pausa" control={control} render={({ field }) => <Autocomplete options={[0, 30, 60, 90, 120]} getOptionLabel={(o) => `${o} min`} value={field.value} onChange={(_, nv) => field.onChange(nv ?? 0)} disabled={watchInserimentoManuale} renderInput={(params) => <TextField {...params} label="Pausa" />} />} />
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                     <Controller name="oreLavorate" control={control} render={({ field, fieldState }) => <FormControl fullWidth disabled={!watchInserimentoManuale} required={isGiornataLavorativa} error={fieldState.invalid}>
                                                <InputLabel id="ore-lavorate-label">Totale Ore</InputLabel>
                                                <Select {...field} labelId="ore-lavorate-label" label="Totale Ore" renderValue={(selectedValue) => formatHour(selectedValue as number)}>
                                                    {hourOptions.map((hour) => <MenuItem key={hour} value={hour}>{formatHour(hour)}</MenuItem>)}
                                                </Select>
                                                {fieldState.error && <Typography color="error" variant="caption">{fieldState.error.message}</Typography>}
                                            </FormControl>}
                                    />
                                </Grid>
                            </Grid>
                        </Grid>
                        
                        {/* SEZIONE DETTAGLI */}
                        <Grid item xs={12}>
                            <Typography variant="h6" gutterBottom>Dettagli Intervento</Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={12}>
                                    <Controller name="breveDescrizione" control={control} render={({ field, fieldState }) => <TextField {...field} label="Breve Descrizione" fullWidth required={isGiornataLavorativa} error={!!fieldState.error} helperText={fieldState.error?.message} />} />
                                </Grid>
                                <Grid item xs={12}>
                                    <Controller name="lavoroEseguito" control={control} render={({ field, fieldState }) => <TextField {...field} label="Lavoro Eseguito" fullWidth multiline rows={4} required={isGiornataLavorativa} error={!!fieldState.error} helperText={fieldState.error?.message} />} />
                                </Grid>
                                <Grid item xs={12}>
                                    <Controller name="materialiImpiegati" control={control} render={({ field, fieldState }) => <TextField {...field} label="Materiali Impiegati (opzionale)" fullWidth multiline rows={2} error={!!fieldState.error} helperText={fieldState.error?.message} />} />
                                </Grid>
                            </Grid>
                        </Grid>

                        {/* SEZIONE TECNICI AGGIUNTI */}
                        <Grid item xs={12}>
                            <Box>
                                <Typography variant="h6" gutterBottom>Altri Tecnici</Typography>
                                <Controller name="tecniciAggiuntiIds" control={control} render={({ field, fieldState }) => <Autocomplete multiple options={options.tecnici} getOptionLabel={(o) => `${o.nome} ${o.cognome}`} value={options.tecnici.filter(t => field.value?.includes(t.id)) || []} onChange={(_, nv) => field.onChange(nv.map(item => item.id))} filterSelectedOptions renderInput={(params) => <TextField {...params} label="Aggiungi tecnici (opzionale)" error={!!fieldState.error} helperText={fieldState.error?.message} />} />} />
                            </Box>
                        </Grid>


                        <Grid item xs={12} sx={{ mt: 3, textAlign: 'center' }}>
                            <Button type="submit" variant="contained" color="primary" size="large" disabled={submitting} startIcon={<SaveIcon />}>
                                {submitting ? 'Salvataggio in corso...' : 'Salva Rapportino'}
                            </Button>
                        </Grid>
                    </Grid>
                </form>
              </>
            </Paper>
        </Box>
      </LocalizationProvider>
  );
};

export default RapportinoEdit;
