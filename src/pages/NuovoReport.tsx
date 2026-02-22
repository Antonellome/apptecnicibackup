import React from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, Timestamp, doc, writeBatch } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useAuth } from '../hooks/useAuth';
import { useGlobalData } from '../contexts/GlobalDataProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider, DatePicker, TimePicker } from '@mui/x-date-pickers';
import { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { eachDayOfInterval, isBefore, startOfDay } from 'date-fns';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Autocomplete,
  IconButton,
  Grid,
  FormControlLabel,
  Switch,
  Divider
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';

// Zod Schema for validation
const rapportinoSchema = z.object({
  isPeriodo: z.boolean(),
  data: z.instanceof(Dayjs).nullable(),
  dataInizio: z.instanceof(Dayjs).nullable(),
  dataFine: z.instanceof(Dayjs).nullable(),
  isOraInizioFine: z.boolean(),
  oraInizio: z.instanceof(Dayjs).nullable(),
  oraFine: z.instanceof(Dayjs).nullable(),
  oreLavoro: z.number().min(0).nullable(),
  tipoGiornataId: z.string().min(1, 'Il tipo di giornata è obbligatorio'),
  veicoloId: z.string().nullable(),
  naveId: z.string().nullable(),
  luogoId: z.string().nullable(),
  descrizioneBreve: z.string().optional(),
  lavoroEseguito: z.string().optional(),
  materialiImpiegati: z.string().optional(),
  altriTecnici: z.array(z.object({ id: z.string() })).optional(),
}).superRefine((data, ctx) => {
    if (data.isPeriodo) {
        if (!data.dataInizio) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'La data di inizio è obbligatoria', path: ['dataInizio'] });
        if (!data.dataFine) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'La data di fine è obbligatoria', path: ['dataFine'] });
        if (data.dataInizio && data.dataFine && isBefore(startOfDay(data.dataFine.toDate()), startOfDay(data.dataInizio.toDate()))) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'La data di fine non può precedere quella di inizio', path: ['dataFine'] });
        }
    } else {
        if (!data.data) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'La data è obbligatoria', path: ['data'] });
    }
});

type RapportinoFormData = z.infer<typeof rapportinoSchema>;

const NuovoReportPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tipiGiornata, navi, luoghi, tecnici, veicoli, loading, error } = useGlobalData();

  const { control, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<RapportinoFormData>({
    resolver: zodResolver(rapportinoSchema),
    defaultValues: {
      isPeriodo: false,
      data: dayjs(),
      dataInizio: dayjs(),
      dataFine: dayjs(),
      isOraInizioFine: true,
      oraInizio: dayjs().hour(7).minute(30),
      oraFine: dayjs().hour(16).minute(30),
      altriTecnici: [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "altriTecnici" });

  const isPeriodo = watch("isPeriodo");
  const isOraInizioFine = watch("isOraInizioFine");

  const onSubmit = async (data: RapportinoFormData) => {
    if (!user) return;

    if (data.isPeriodo) {
        const { dataInizio, dataFine, tipoGiornataId } = data;
        if (!dataInizio || !dataFine) return;

        const batch = writeBatch(db);
        const days = eachDayOfInterval({ start: dataInizio.toDate(), end: dataFine.toDate() });

        days.forEach(day => {
            const newReportRef = doc(collection(db, 'rapportini'));
            batch.set(newReportRef, {
                data: Timestamp.fromDate(day),
                tecnicoId: user.uid,
                tipoGiornataId: tipoGiornataId,
                isLavorativo: false,
                createdAt: Timestamp.now(),
            });
        });

        await batch.commit();
        alert(`Salvataggio completato. Creati ${days.length} rapportini di assenza.`);
    } else {
        const { data: singleDate, ...rest } = data;
        await addDoc(collection(db, 'rapportini'), {
            ...rest,
            data: Timestamp.fromDate(singleDate!.toDate()),
            oraInizio: rest.oraInizio ? Timestamp.fromDate(rest.oraInizio.toDate()) : null,
            oraFine: rest.oraFine ? Timestamp.fromDate(rest.oraFine.toDate()) : null,
            tecnicoId: user.uid,
            createdAt: Timestamp.now(),
        });
        alert('Rapportino creato con successo!');
    }
    navigate('/rapportini');
  };

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ p: 3, maxWidth: 900, margin: 'auto' }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>Nuovo Report</Typography>
          <form onSubmit={handleSubmit(onSubmit)}>
            <Grid container spacing={3}>
                <Grid size={12}>
                    <FormControlLabel
                        control={<Controller name="isPeriodo" control={control} render={({ field }) => <Switch {...field} checked={field.value} />} />}
                        label="Inserisci per un periodo di più giorni (es. Malattia, Ferie)"
                    />
                </Grid>

                <Grid container spacing={3} sx={{ display: isPeriodo ? 'flex' : 'none', ml:0, width: '100%' }}>
                    <Grid size={{ xs: 12, sm: 6 }}><Controller name="dataInizio" control={control} render={({ field }) => <DatePicker {...field} label="Data Inizio" sx={{ width: '100%' }} slotProps={{ textField: { error: !!errors.dataInizio, helperText: errors.dataInizio?.message } }} />} /></Grid>
                    <Grid size={{ xs: 12, sm: 6 }}><Controller name="dataFine" control={control} render={({ field }) => <DatePicker {...field} label="Data Fine" sx={{ width: '100%' }} slotProps={{ textField: { error: !!errors.dataFine, helperText: errors.dataFine?.message } }} />} /></Grid>
                </Grid>

                <Grid size={12} sx={{ display: isPeriodo ? 'none' : 'block', width: '100%' }}>
                    <Controller name="data" control={control} render={({ field }) => <DatePicker {...field} label="Data" sx={{ width: '100%' }} slotProps={{ textField: { error: !!errors.data, helperText: errors.data?.message } }} />} />
                </Grid>

              <Grid size={12} sx={{width: '100%'}}>
                 <Controller name="tipoGiornataId" control={control} render={({ field }) => (
                    <Autocomplete
                        options={tipiGiornata}
                        getOptionLabel={(option) => option.nome}
                        onChange={(_, value) => field.onChange(value?.id || '')}
                        renderInput={(params) => <TextField {...params} label="Tipo Giornata" error={!!errors.tipoGiornataId} helperText={errors.tipoGiornataId?.message} />}
                    />
                )} />
              </Grid>
              
              <Box sx={{ width: '100%', display: isPeriodo ? 'none' : 'block' }}>
                  <Grid container spacing={3} sx={{pt: 3}}>
                    <Grid size={12}><Divider sx={{ mb: 2 }} /></Grid>
                    <Grid size={12}>
                        <FormControlLabel control={<Controller name="isOraInizioFine" control={control} render={({ field }) => <Switch {...field} checked={field.value} />} />} label="Calcola ore da orario inizio/fine" />
                    </Grid>
                    <Grid container spacing={3} sx={{ display: isOraInizioFine ? 'flex' : 'none', ml: 0, pt: 3, width: '100%' }}>
                        <Grid size={{ xs: 12, sm: 6 }}><Controller name="oraInizio" control={control} render={({ field }) => <TimePicker {...field} label="Ora Inizio" sx={{ width: '100%' }} />} /></Grid>
                        <Grid size={{ xs: 12, sm: 6 }}><Controller name="oraFine" control={control} render={({ field }) => <TimePicker {...field} label="Ora Fine" sx={{ width: '100%' }} />} /></Grid>
                    </Grid>
                     <Grid size={12} sx={{ display: isOraInizioFine ? 'none' : 'block', pt:3, width: '100%' }}>
                        <Controller name="oreLavoro" control={control} render={({ field }) => <TextField {...field} type="number" label="Ore Lavorate" fullWidth onChange={e => field.onChange(parseFloat(e.target.value))} />} />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}><Controller name="veicoloId" control={control} render={({ field }) => <Autocomplete options={veicoli} getOptionLabel={(o) => o.nome} onChange={(_, v) => field.onChange(v?.id || '')} renderInput={(params) => <TextField {...params} label="Veicolo" />} />} /></Grid>
                    <Grid size={{ xs: 12, sm: 6 }}><Controller name="naveId" control={control} render={({ field }) => <Autocomplete options={navi} getOptionLabel={(o) => o.nome} onChange={(_, v) => field.onChange(v?.id || '')} renderInput={(params) => <TextField {...params} label="Nave" />} />} /></Grid>
                    <Grid size={12}><Controller name="luogoId" control={control} render={({ field }) => <Autocomplete options={luoghi} getOptionLabel={(o) => o.nome} onChange={(_, v) => field.onChange(v?.id || '')} renderInput={(params) => <TextField {...params} label="Luogo" />} />} /></Grid>
                    <Grid size={12}><Controller name="descrizioneBreve" control={control} render={({ field }) => <TextField {...field} label="Breve Descrizione" fullWidth />} /></Grid>
                    <Grid size={12}><Controller name="lavoroEseguito" control={control} render={({ field }) => <TextField {...field} label="Lavoro Eseguito" multiline rows={3} fullWidth />} /></Grid>
                    <Grid size={12}><Controller name="materialiImpiegati" control={control} render={({ field }) => <TextField {...field} label="Materiali Impiegati" multiline rows={2} fullWidth />} /></Grid>

                    <Grid size={12}><Divider sx={{ my: 2 }}>Collaboratori</Divider></Grid>
                    {fields.map((item, index) => (
                        <Grid container spacing={2} key={item.id} alignItems="center" sx={{ mb: 1, pl: 2, width: '100%' }}>
                            <Grid size={10}><Controller name={`altriTecnici.${index}.id`} control={control} render={({ field }) => <Autocomplete options={tecnici.filter(t => t.id !== user?.uid)} getOptionLabel={(o) => `${o.nome} ${o.cognome}`} onChange={(_, v) => field.onChange(v?.id || '')} renderInput={(params) => <TextField {...params} label={`Altro Tecnico ${index + 1}`} />} />} /></Grid>
                            <Grid size={2}><IconButton onClick={() => remove(index)}><RemoveCircleOutlineIcon /></IconButton></Grid>
                        </Grid>
                    ))}
                    <Grid size={12}><Button startIcon={<AddCircleOutlineIcon />} onClick={() => append({ id: '' })}>Aggiungi tecnico</Button></Grid>
                  </Grid>
              </Box>

              <Grid size={12} sx={{ mt: 4, textAlign: 'right' }}>
                <Button onClick={() => navigate(-1)} sx={{ mr: 2 }}>Annulla</Button>
                <Button type="submit" variant="contained" color="primary" disabled={isSubmitting} size="large">
                  {isSubmitting ? <CircularProgress size={24} /> : 'Salva'}
                </Button>
              </Grid>
            </Grid>
          </form>
        </Paper>
      </Box>
    </LocalizationProvider>
  );
};

export default NuovoReportPage;
