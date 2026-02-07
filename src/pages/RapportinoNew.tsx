import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import {
  Box,
  Button,
  FormControl,
  FormControlLabel,
  FormHelperText,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Switch,
  TextField,
  Typography,
  CircularProgress,
  Divider,
  Stack,
  Autocomplete,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useContext, useEffect, useMemo, useState } from 'react';
import { collection, addDoc, doc, Timestamp } from "firebase/firestore"; 
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, TimePicker } from '@mui/x-date-pickers';

import { db } from '../firebase';
import { AuthContext } from '@/contexts/AuthContext';
import MenuBar from '../components/MenuBar';
import {
  createRapportinoSchema,
  type RapportinoSchema,
} from '../models/rapportino.schema.ts';
import type {
  TipoGiornata,
  Tecnico,
  Nave,
  Luogo,
  Veicolo,
  Cliente,
} from '../models/definitions';
import { useNewReportData } from '../hooks/useNewReportData';

interface ReportFormProps {
  tipiGiornata: TipoGiornata[];
  tecnici: Tecnico[];
  navi: Nave[];
  luoghi: Luogo[];
  veicoli: Veicolo[];
  clienti: Cliente[];
}

const TIPI_GIORNATA_LAVORATIVA = ['Ordinaria', 'Straordinario', 'Lavoro'];

const ReportForm = ({ tipiGiornata, tecnici, navi, luoghi, veicoli, clienti }: ReportFormProps) => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const rapportinoSchema = useMemo(() => createRapportinoSchema(tipiGiornata), [tipiGiornata]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const firstLavorativaId = useMemo(() => 
    tipiGiornata.find(t => TIPI_GIORNATA_LAVORATIVA.includes(t.nome))?.id || 
    (tipiGiornata.length > 0 ? tipiGiornata[0].id : ''), 
    [tipiGiornata]
  );

  const { control, handleSubmit, watch, formState: { errors }, reset } = useForm<RapportinoSchema>({
    resolver: zodResolver(rapportinoSchema),
    defaultValues: {
        tecnicoScriventeId: undefined,
        tecniciAggiuntiIds: [],
        data: new Date(),
        giornataId: firstLavorativaId || '',
        inserimentoManualeOre: false,
        oraInizio: new Date(),
        oraFine: new Date(),
        pausa: 60,
        oreLavorate: 8,
        naveId: null,
        luogoId: null,
        veicoloId: null,
        clienteId: null,
        breveDescrizione: '',
        lavoroEseguito: '',
        materialiImpiegati: '',
    }
  });

  useEffect(() => {
    if (user && firstLavorativaId) {
      const defaultStartTime = new Date();
      defaultStartTime.setHours(7, 30, 0, 0);

      const defaultEndTime = new Date();
      defaultEndTime.setHours(16, 30, 0, 0);

      reset({
        tecnicoScriventeId: user.uid, 
        tecniciAggiuntiIds: [],
        data: new Date(),
        giornataId: firstLavorativaId,
        inserimentoManualeOre: false,
        oraInizio: defaultStartTime,
        oraFine: defaultEndTime,
        pausa: 60,
        oreLavorate: 8,
        naveId: null,
        luogoId: null,
        veicoloId: null,
        clienteId: null,
      });
    }
  }, [user, firstLavorativaId, reset]);

  const inserimentoManuale = watch('inserimentoManualeOre');
  const giornataId = watch('giornataId');
  const giornataSelezionata = useMemo(() => tipiGiornata.find(g => g.id === giornataId), [giornataId, tipiGiornata]);
  const isLavorativa = useMemo(() => giornataSelezionata ? TIPI_GIORNATA_LAVORATIVA.includes(giornataSelezionata.nome) : false, [giornataSelezionata]);

  const onSubmit = async (data: RapportinoSchema) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const {
        tecnicoScriventeId, 
        tecniciAggiuntiIds, 
        giornataId,
        naveId, 
        luogoId, 
        veicoloId, 
        clienteId,
        data: dataInput,
        oraInizio,
        oraFine,
        ...rest 
      } = data;

      // Prepare the document with correct Firestore types
      const docData: any = {
        ...rest,
        // References
        tecnicoScriventeId: doc(db, "tecnici", tecnicoScriventeId),
        giornataId: doc(db, "tipiGiornata", giornataId),
        // Timestamps
        data: Timestamp.fromDate(new Date(dataInput)),
      };

      if (oraInizio) docData.oraInizio = Timestamp.fromDate(new Date(oraInizio));
      if (oraFine) docData.oraFine = Timestamp.fromDate(new Date(oraFine));

      if (naveId) docData.naveId = doc(db, "navi", naveId);
      if (luogoId) docData.luogoId = doc(db, "luoghi", luogoId);
      if (veicoloId) docData.veicoloId = doc(db, "veicoli", veicoloId);
      if (clienteId) docData.clienteId = doc(db, "clienti", clienteId);
      if (tecniciAggiuntiIds && tecniciAggiuntiIds.length > 0) {
        docData.tecniciAggiuntiIds = tecniciAggiuntiIds.map(id => doc(db, "tecnici", id));
      }

      await addDoc(collection(db, "rapportini"), docData);
      alert('Report salvato con successo!');
      navigate('/');
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Errore sconosciuto';
      console.error("Detailed Save Error: ", e);
      setSubmitError(`Errore nel salvataggio: ${errorMessage}`);
      alert(`Errore nel salvataggio del report. Riprova. Dettagli: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return <Typography>Caricamento utente...</Typography>;

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Paper sx={{ p: { xs: 2, sm: 3 } }}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Stack spacing={3}>
              <Typography variant="h5" gutterBottom component="h2">Dettagli Principali</Typography>
              <TextField label="Tecnico Scrivente" fullWidth disabled value={user ? `${user.nome} ${user.cognome}` : 'Caricamento...'} InputLabelProps={{ shrink: true }}/>
              <Controller name="data" control={control} render={({ field }) => (<TextField {...field} type="date" label="Data" fullWidth error={!!errors.data} helperText={errors.data?.message} InputLabelProps={{ shrink: true }} value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : (field.value || '')} /> )}/>
              <Controller name="giornataId" control={control} render={({ field }) => ( <FormControl fullWidth error={!!errors.giornataId}> <InputLabel>Tipo Giornata</InputLabel> <Select {...field} label="Tipo Giornata"> {tipiGiornata.map((g) => ( <MenuItem key={g.id} value={g.id}>{g.nome}</MenuItem> ))} </Select> <FormHelperText>{errors.giornataId?.message}</FormHelperText> </FormControl> )}/>
              
              {isLavorativa && (
              <>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="h5" component="h2" gutterBottom>Dettagli Lavoro</Typography>
                  <Controller name="clienteId" control={control} render={({ field }) => ( <Autocomplete options={clienti} getOptionLabel={(option) => option.nome} isOptionEqualToValue={(option, value) => option.id === value.id} onChange={(_, data) => field.onChange(data ? data.id : null)} renderInput={(params) => <TextField {...params} label="Cliente" error={!!errors.clienteId} helperText={errors.clienteId?.message} />} /> )}/>
                  <Controller name="naveId" control={control} render={({ field }) => ( <FormControl fullWidth error={!!errors.naveId}> <InputLabel>Nave</InputLabel> <Select {...field} label="Nave" value={field.value || ''}> <MenuItem value=""><em>Nessuna</em></MenuItem> {navi.map((n) => ( <MenuItem key={n.id} value={n.id}>{n.nome}</MenuItem> ))} </Select> <FormHelperText>{errors.naveId?.message}</FormHelperText> </FormControl> )}/>
                  <Controller name="luogoId" control={control} render={({ field }) => ( <FormControl fullWidth error={!!errors.luogoId}> <InputLabel>Luogo</InputLabel> <Select {...field} label="Luogo" value={field.value || ''}> <MenuItem value=""><em>Nessuno</em></MenuItem> {luoghi.map((l) => ( <MenuItem key={l.id} value={l.id}>{l.nome}</MenuItem> ))} </Select> <FormHelperText>{errors.luogoId?.message}</FormHelperText> </FormControl> )}/>
                  <Controller name="breveDescrizione" control={control} render={({ field }) => ( <TextField {...field} label="Breve Descrizione Attività" fullWidth multiline rows={2} error={!!errors.breveDescrizione} helperText={errors.breveDescrizione?.message} /> )}/>
              </>
              )}

              {isLavorativa && (
                  <>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="h5" component="h2" gutterBottom>Dettagli Orari</Typography>
                    <Controller name="inserimentoManualeOre" control={control} render={({ field }) => ( <FormControlLabel control={<Switch {...field} checked={!!field.value} />} label="Inserisci ore manualmente" /> )}/>

                    {inserimentoManuale ? (
                        <Controller name="oreLavorate" control={control} render={({ field }) => ( <TextField {...field} type="number" label="Ore Lavorate" fullWidth error={!!errors.oreLavorate} helperText={errors.oreLavorate?.message} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} value={field.value || ''}/> )}/>
                    ) : (
                        <Stack spacing={3}>
                          <Controller name="oraInizio" control={control} render={({ field }) => <TimePicker label="Ora Inizio" {...field} renderInput={(params) => <TextField {...params} fullWidth error={!!errors.oraInizio} helperText={errors.oraInizio?.message} />} />} />
                          <Controller name="oraFine" control={control} render={({ field }) => <TimePicker label="Ora Fine" {...field} renderInput={(params) => <TextField {...params} fullWidth error={!!errors.oraFine} helperText={errors.oraFine?.message} />} />} />
                          <Controller name="pausa" control={control} render={({ field }) => ( <FormControl fullWidth error={!!errors.pausa}> <InputLabel>Pausa (minuti)</InputLabel> <Select {...field} label="Pausa (minuti)"> <MenuItem value={0}>0</MenuItem> <MenuItem value={30}>30</MenuItem> <MenuItem value={60}>60</MenuItem> </Select> <FormHelperText>{errors.pausa?.message}</FormHelperText> </FormControl> )}/>
                        </Stack>
                    )}
                </>
              )}
              
              {isLavorativa && (
              <>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="h5" component="h2" gutterBottom>Descrizione Dettagliata Attività</Typography>
                  <Controller name="lavoroEseguito" control={control} render={({ field }) => ( <TextField {...field} label="Lavoro Eseguito (resoconto dettagliato)" fullWidth multiline rows={4} error={!!errors.lavoroEseguito} helperText={errors.lavoroEseguito?.message} /> )}/>
                  <Controller name="materialiImpiegati" control={control} render={({ field }) => ( <TextField {...field} label="Materiali Impiegati (opzionale)" fullWidth multiline rows={2} error={!!errors.materialiImpiegati} helperText={errors.materialiImpiegati?.message} /> )}/>
              </>
              )}

              <Divider sx={{ my: 1 }} />
              <Typography variant="h5" component="h2" gutterBottom>Personale e Mezzi</Typography>
              <Controller name="tecniciAggiuntiIds" control={control} render={({ field }) => ( <FormControl fullWidth error={!!errors.tecniciAggiuntiIds}> <InputLabel>Altri Tecnici</InputLabel> <Select {...field} multiple label="Altri Tecnici" renderValue={(selected) => (selected as string[]).map((id) => { const tecnico = tecnici.find((t) => t.id === id); return tecnico ? tecnico.nome : id; }).join(', ') }> {tecnici.filter((t) => t.id !== user?.uid).map((t) => ( <MenuItem key={t.id} value={t.id}>{t.nome} {t.cognome}</MenuItem>))} </Select> <FormHelperText>{errors.tecniciAggiuntiIds?.message}</FormHelperText> </FormControl> )}/>
              <Controller name="veicoloId" control={control} render={({ field }) => ( <FormControl fullWidth error={!!errors.veicoloId}> <InputLabel>Veicolo</InputLabel> <Select {...field} label="Veicolo" value={field.value || ''}> <MenuItem value=""><em>Nessuno</em></MenuItem> {veicoli.map((v) => ( <MenuItem key={v.id} value={v.id}>{v.nome} ({v.targa})</MenuItem> ))} </Select> <FormHelperText>{errors.veicoloId?.message}</FormHelperText> </FormControl> )}/>

              <Box sx={{ mt: 4 }}>
                <Button type="submit" variant="contained" fullWidth disabled={isSubmitting} sx={{ p: 1.5, fontWeight: 'bold', fontSize: '1.1rem'}}>
                  {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Salva Report'}
                </Button>
              </Box>
              {submitError && (
                <Typography color="error" textAlign="center" sx={{ mt: 2 }}>
                  {submitError}
                </Typography>
              )}
          </Stack>
        </form>
      </Paper>
    </LocalizationProvider>
  );
};

const NewReportPage = () => {
  const { tipiGiornata, tecnici, navi, luoghi, veicoli, clienti, loading, error } = useNewReportData();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <MenuBar title="Nuovo Report" />
      <Box component="main" sx={{ flexGrow: 1, overflowY: 'auto', p: 3 }}>
        {loading && <CircularProgress />}
        {error && <Typography color="error">Errore: {error.message}</Typography>}
        {!loading && !error && (
          <ReportForm 
            tipiGiornata={tipiGiornata}
            tecnici={tecnici}
            navi={navi}
            luoghi={luoghi}
            veicoli={veicoli}
            clienti={clienti}
          />
        )}
      </Box>
      <Typography variant="body2" color="text.secondary" align="center" sx={{ p: 1, mt: 'auto' }}>
        by &quot;AS&quot;
      </Typography>
    </Box>
  );
};

export default NewReportPage;
