import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    doc, getDoc, collection, getDocs, updateDoc, deleteDoc, Timestamp, DocumentReference 
} from 'firebase/firestore';
import { db } from '@/firebase';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createRapportinoSchema, type RapportinoSchema } from '@/models/rapportino.schema';
import { 
    TextField, Button, Grid, CircularProgress, Typography, Paper, Box, 
    Autocomplete, IconButton, Divider, Switch, FormControlLabel, Select, 
    MenuItem, InputLabel, FormControl, Stack
} from '@mui/material';
import { DatePicker, TimePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/it';

import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useAlert } from '@/contexts/AlertContext';
import type { Tecnico, Nave, Luogo, TipoGiornata, Veicolo, Cliente, Rapportino } from '@/models/definitions';

dayjs.locale('it');

const useAnagraficheData = () => {
    const [options, setOptions] = useState<{ 
        tecnici: Tecnico[], navi: Nave[], luoghi: Luogo[], tipiGiornata: TipoGiornata[], veicoli: Veicolo[], clienti: Cliente[] 
    }>({ tecnici: [], navi: [], luoghi: [], tipiGiornata: [], veicoli: [], clienti: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const collections = { 
                    tecnici: collection(db, 'tecnici'), navi: collection(db, 'navi'), 
                    luoghi: collection(db, 'luoghi'), tipiGiornata: collection(db, 'tipiGiornata'), 
                    veicoli: collection(db, 'veicoli'), clienti: collection(db, 'clienti') 
                };
                const keys = Object.keys(collections) as (keyof typeof collections)[];
                const results = await Promise.all(Object.values(collections).map(coll => getDocs(coll)));
                
                const data = keys.reduce((acc, key, index) => {
                    acc[key] = results[index].docs.map(d => ({ id: d.id, ...d.data() })) as any;
                    return acc;
                }, {} as { [K in keyof typeof collections]: any[] });

                data.tecnici.sort((a,b) => (a.cognome || '').localeCompare(b.cognome));
                data.navi.sort((a,b) => (a.nome || '').localeCompare(b.nome));
                data.luoghi.sort((a,b) => (a.nome || '').localeCompare(b.nome));
                data.clienti.sort((a,b) => (a.nome || '').localeCompare(b.nome));

                setOptions(data as any);
            } catch (err) {
                console.error("Errore caricamento anagrafiche:", err);
                setError("Impossibile caricare i dati necessari.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    return { ...options, loading, error };
};

const RapportinoEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showAlert } = useAlert();
  
  const { tecnici, navi, luoghi, tipiGiornata, veicoli, clienti, loading: loadingOptions, error: optionsError } = useAnagraficheData();
  const [loadingRapportino, setLoadingRapportino] = useState(!!id);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const rapportinoSchema = useMemo(() => createRapportinoSchema(tipiGiornata), [tipiGiornata]);

  const { control, handleSubmit, reset, watch, formState: { errors } } = useForm<RapportinoSchema>({
    resolver: zodResolver(rapportinoSchema),
    defaultValues: { data: new Date() },
  });

  useEffect(() => {
    if (id && tipiGiornata.length > 0) {
      setLoadingRapportino(true);
      const docRef = doc(db, 'rapportini', id);
      getDoc(docRef).then(docSnap => {
        if (docSnap.exists()) {
          const data = docSnap.data() as Rapportino;
          const getRefId = (ref: unknown) => ref instanceof DocumentReference ? ref.id : null;

          reset({
            ...data,
            data: data.data instanceof Timestamp ? data.data.toDate() : new Date(),
            oraInizio: data.oraInizio instanceof Timestamp ? data.oraInizio.toDate() : null,
            oraFine: data.oraFine instanceof Timestamp ? data.oraFine.toDate() : null,
            tecnicoScriventeId: getRefId(data.tecnicoScriventeId),
            giornataId: getRefId(data.giornataId),
            naveId: getRefId(data.naveId),
            luogoId: getRefId(data.luogoId),
            veicoloId: getRefId(data.veicoloId),
            clienteId: getRefId(data.clienteId),
            tecniciAggiuntiIds: Array.isArray(data.tecniciAggiuntiIds) ? data.tecniciAggiuntiIds.map(getRefId).filter(Boolean) as string[] : [],
          });
        } else {
          showAlert('Rapportino non trovato.', 'error');
          navigate('/');
        }
      }).catch(err => {
          console.error("Errore caricamento rapportino:", err);
          showAlert("Errore nel caricamento del rapportino.", 'error');
      }).finally(() => {
          setLoadingRapportino(false);
      });
    }
  }, [id, reset, navigate, showAlert, tipiGiornata]);


  const onSubmit = async (data: RapportinoSchema) => {
    if (!id) return;
    setIsSubmitting(true);
    try {
        const createRef = (collectionName: string, docId: string | null | undefined) => docId ? doc(db, collectionName, docId) : null;

        const saveData: any = {
            ...data,
            data: Timestamp.fromDate(data.data || new Date()),
            oraInizio: data.oraInizio ? Timestamp.fromDate(data.oraInizio) : null,
            oraFine: data.oraFine ? Timestamp.fromDate(data.oraFine) : null,
            tecnicoScriventeId: createRef('tecnici', data.tecnicoScriventeId),
            giornataId: createRef('tipiGiornata', data.giornataId),
            naveId: createRef('navi', data.naveId),
            luogoId: createRef('luoghi', data.luogoId),
            veicoloId: createRef('veicoli', data.veicoloId),
            clienteId: createRef('clienti', data.clienteId),
            tecniciAggiuntiIds: (data.tecniciAggiuntiIds || []).map(tId => createRef('tecnici', tId)),
        };

        Object.keys(saveData).forEach(key => { if (saveData[key] === null) delete saveData[key]; });

      await updateDoc(doc(db, 'rapportini', id), saveData);
      showAlert('Rapportino aggiornato con successo!', 'success');
      navigate('/');
    } catch (error) {
      console.error("Errore salvataggio: ", error);
      showAlert(error instanceof Error ? error.message : 'Errore sconosciuto', 'error');
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (window.confirm('Sei sicuro di voler eliminare questo rapportino?')) {
      try {
        await deleteDoc(doc(db, 'rapportini', id));
        showAlert('Rapportino eliminato.', 'warning');
        navigate('/');
      } catch (error) {
        showAlert(error instanceof Error ? error.message : 'Errore durante l\'eliminazione', 'error');
      }
    }
  };

  const watchGiornataId = watch('giornataId');
  const watchInserimentoManuale = watch('inserimentoManualeOre');
  const isGiornataLavorativa = useMemo(() => tipiGiornata.find(t => t.id === watchGiornataId)?.lavorativa || false, [watchGiornataId, tipiGiornata]);
  
  if (loadingOptions || loadingRapportino) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>;
  if (optionsError) return <Typography color="error" sx={{p:3}}>{optionsError}</Typography>;

  return (
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="it">
          <Paper sx={{ p: { xs: 2, md: 4 }, m: { xs: 1, md: 2 } }}>
             <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                <IconButton onClick={() => navigate(-1)}><ArrowBackIcon /></IconButton>
                <Typography variant="h4" component="h1">Modifica Rapportino</Typography>
                <Box sx={{width: 40}} />
            </Stack>
            
            <form onSubmit={handleSubmit(onSubmit)}>
              <Stack spacing={3}>
                <Grid container spacing={2}>
                    <Grid xs={12} sm={4}><Controller name="data" control={control} render={({ field }) => <DatePicker label="Data" value={dayjs(field.value)} onChange={(date) => field.onChange(date?.toDate())} sx={{ width: '100%' }} slotProps={{ textField: { error: !!errors.data, helperText: errors.data?.message} }} />} /></Grid>
                    <Grid xs={12} sm={8}><Controller name="tecnicoScriventeId" control={control} render={({ field }) => <Autocomplete<Tecnico> disabled options={tecnici} getOptionLabel={o => `${o.cognome} ${o.nome}`} value={tecnici.find(t => t.id === field.value) || null} renderInput={params => <TextField {...params} label="Tecnico" />} />} /></Grid>
                    <Grid xs={12}><Controller name="giornataId" control={control} render={({ field }) => <Autocomplete<TipoGiornata> options={tipiGiornata} getOptionLabel={o => o.nome} value={tipiGiornata.find(t => t.id === field.value) || null} onChange={(_, val) => field.onChange(val?.id || null)} isOptionEqualToValue={(o,v) => o.id === v.id} renderInput={params => <TextField {...params} label="Tipo Giornata" required error={!!errors.giornataId} helperText={errors.giornataId?.message} />} />} /></Grid>
                </Grid>
                
                {isGiornataLavorativa && (
                <>
                    <Divider>Riferimenti</Divider>
                    <Grid container spacing={2}>
                        <Grid xs={12} sm={6}>
                            <Controller name="clienteId" control={control} render={({ field }) => (
                                <Autocomplete<Cliente> options={clienti} getOptionLabel={o => o.nome} value={clienti.find(c => c.id === field.value) || null} onChange={(_, val) => field.onChange(val?.id || null)} isOptionEqualToValue={(o,v) => o.id === v.id} renderInput={params => <TextField {...params} label="Cliente" error={!!errors.clienteId} helperText={errors.clienteId?.message} />} />
                            )} />
                        </Grid>
                        <Grid xs={12} sm={6}>
                            <Controller name="naveId" control={control} render={({ field }) => (
                                <Autocomplete<Nave> options={navi} getOptionLabel={o => o.nome} value={navi.find(n => n.id === field.value) || null} onChange={(_, val) => field.onChange(val?.id || null)} isOptionEqualToValue={(o,v) => o.id === v.id} renderInput={params => <TextField {...params} label="Nave" error={!!errors.naveId} helperText={errors.naveId?.message} />} />
                            )} />
                        </Grid>
                        <Grid xs={12} sm={6}>
                            <Controller name="luogoId" control={control} render={({ field }) => (
                                <Autocomplete<Luogo> options={luoghi} getOptionLabel={o => o.nome} value={luoghi.find(l => l.id === field.value) || null} onChange={(_, val) => field.onChange(val?.id || null)} isOptionEqualToValue={(o,v) => o.id === v.id} renderInput={params => <TextField {...params} label="Luogo" error={!!errors.luogoId} helperText={errors.luogoId?.message} />} />
                            )} />
                        </Grid>
                        <Grid xs={12} sm={6}>
                             <Controller name="veicoloId" control={control} render={({ field }) => (
                                <Autocomplete<Veicolo> options={veicoli} getOptionLabel={o => o.nome} value={veicoli.find(v => v.id === field.value) || null} onChange={(_, val) => field.onChange(val?.id || null)} isOptionEqualToValue={(o,v) => o.id === v.id} renderInput={params => <TextField {...params} label="Veicolo" />} />
                            )} />
                        </Grid>
                    </Grid>
                    
                    <Divider>Ore</Divider>
                    <FormControlLabel control={<Controller name="inserimentoManualeOre" control={control} render={({ field }) => <Switch {...field} checked={!!field.value} />} />} label="Inserisci ore manuali" />
                    {watchInserimentoManuale ? (
                        <Controller name="oreLavorate" control={control} render={({ field }) => <TextField {...field} type="number" label="Ore Lavorate" fullWidth error={!!errors.oreLavorate} helperText={errors.oreLavorate?.message} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />} />
                    ) : (
                        <Grid container spacing={2} alignItems="center">
                            <Grid xs={6} sm={4}><Controller name="oraInizio" control={control} render={({ field }) => <TimePicker label="Inizio" value={field.value ? dayjs(field.value): null} onChange={date => field.onChange(date?.toDate())} sx={{ width: '100%' }} slotProps={{ textField: { error: !!errors.oraInizio, helperText: errors.oraInizio?.message} }} />}/></Grid>
                            <Grid xs={6} sm={4}><Controller name="oraFine" control={control} render={({ field }) => <TimePicker label="Fine" value={field.value ? dayjs(field.value) : null} onChange={date => field.onChange(date?.toDate())} sx={{ width: '100%' }} slotProps={{ textField: { error: !!errors.oraFine, helperText: errors.oraFine?.message} }} />}/></Grid>
                            <Grid xs={12} sm={4}><Controller name="pausa" control={control} render={({ field }) => <FormControl fullWidth><InputLabel>Pausa</InputLabel><Select {...field} label="Pausa"><MenuItem value={0}>0 min</MenuItem><MenuItem value={30}>30 min</MenuItem><MenuItem value={60}>60 min</MenuItem></Select></FormControl>} /></Grid>
                        </Grid>
                    )}
                    
                    <Divider>Dettagli</Divider>
                    <Controller name="breveDescrizione" control={control} render={({ field }) => <TextField {...field} label="Breve Descrizione" fullWidth multiline rows={2} required={isGiornataLavorativa} error={!!errors.breveDescrizione} helperText={errors.breveDescrizione?.message} />} />
                    <Controller name="lavoroEseguito" control={control} render={({ field }) => <TextField {...field} label="Lavoro Eseguito" fullWidth multiline rows={4} required={isGiornataLavorativa} error={!!errors.lavoroEseguito} helperText={errors.lavoroEseguito?.message} />} />
                    <Controller name="materialiImpiegati" control={control} render={({ field }) => <TextField {...field} label="Materiali Impiegati" fullWidth multiline rows={2} />} />

                    <Divider>Altri Tecnici</Divider>
                    <Controller name="tecniciAggiuntiIds" control={control} render={({ field }) => <Autocomplete<Tecnico, true> multiple options={tecnici} getOptionLabel={o => `${o.cognome} ${o.nome}`} value={tecnici.filter(t => (field.value || []).includes(t.id))} onChange={(_, val) => field.onChange(val.map(v => v.id))} isOptionEqualToValue={(o, v) => o.id === v.id} renderInput={params => <TextField {...params} label="Altri tecnici presenti" />} />} />
                </>
                )}
                
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 3 }}>
                    <Button variant="outlined" color="error" onClick={handleDelete} startIcon={<DeleteIcon />} disabled={isSubmitting}>Elimina</Button>
                    <Button type="submit" variant="contained" color="primary" startIcon={<SaveIcon />} disabled={isSubmitting}>
                        {isSubmitting ? <CircularProgress size={24}/> : 'Salva Modifiche'}
                    </Button>
                </Stack>
              </Stack>
            </form>
          </Paper>
      </LocalizationProvider>
  );
};

export default RapportinoEdit;
