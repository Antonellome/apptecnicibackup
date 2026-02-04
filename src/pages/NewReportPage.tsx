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
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { collection, addDoc } from "firebase/firestore"; 

import { db } from '../firebase';
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
} from '../models/definitions';
import { useNewReportData } from '../hooks/useNewReportData';

// --- Props and Logic outside component for clarity ---
interface ReportFormProps {
  tipiGiornata: TipoGiornata[];
  tecnici: Tecnico[];
  navi: Nave[];
  luoghi: Luogo[];
  veicoli: Veicolo[];
}

const TIPI_GIORNATA_LAVORATIVA = ['Ordinaria', 'Straordinario', 'Lavoro'];

const formControlStyles = { fieldset: { borderColor: 'rgba(255,255,255,0.3)' }, '.MuiSvgIcon-root': { color: '#fff' }, color: '#fff' };
const inputLabelStyles = { color: '#fff' };
const inputStyles = { color: '#fff' };

// --- Form Component ---
const ReportForm = ({ tipiGiornata, tecnici, navi, luoghi, veicoli }: ReportFormProps) => {
  const navigate = useNavigate();
  const rapportinoSchema = useMemo(() => createRapportinoSchema(tipiGiornata), [tipiGiornata]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const firstLavorativaId = useMemo(() => 
    tipiGiornata.find(t => TIPI_GIORNATA_LAVORATIVA.includes(t.nome))?.id || 
    (tipiGiornata.length > 0 ? tipiGiornata[0].id : ''), 
    [tipiGiornata]
  );

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, defaultValues },
    reset
  } = useForm<RapportinoSchema>();

  useEffect(() => {
    if (firstLavorativaId) {
        reset({
            tecnicoScriventeId: 't1', // TODO: Sostituire con l'ID del tecnico loggato
            tecniciAggiuntiIds: [],
            data: new Date().toISOString().split('T')[0] as unknown as Date,
            inserimentoManualeOre: false,
            pausa: 0,
            giornataId: firstLavorativaId,
            naveId: null,
            luogoId: null,
            veicoloId: null,
        });
    }
  }, [firstLavorativaId, reset]);

  const tecnicoScrivente = tecnici.find(t => t.id === defaultValues?.tecnicoScriventeId);
  const inserimentoManuale = watch('inserimentoManualeOre');
  const giornataId = watch('giornataId');
  const giornataSelezionata = useMemo(() => tipiGiornata.find(g => g.id === giornataId), [giornataId, tipiGiornata]);
  const isLavorativa = useMemo(() => giornataSelezionata ? TIPI_GIORNATA_LAVORATIVA.includes(giornataSelezionata.nome) : false, [giornataSelezionata]);

  const onSubmit = async (data: RapportinoSchema) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const docData = { ...data };
      // Pulisce i campi opzionali che potrebbero essere null e non sono gestiti bene da Firestore
      if (!docData.naveId) delete docData.naveId;
      if (!docData.luogoId) delete docData.luogoId;
      if (!docData.veicoloId) delete docData.veicoloId;

      await addDoc(collection(db, "rapportini"), docData);
      console.log("Document written successfully!");
      alert('Report salvato con successo!');
      navigate('/');
    } catch (e) {
      console.error("Error adding document: ", e);
      const errorMessage = e instanceof Error ? e.message : 'Errore sconosciuto';
      setSubmitError(`Errore nel salvataggio: ${errorMessage}`);
      alert(`Errore nel salvataggio del report. Riprova. Dettagli: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!defaultValues?.giornataId) return null; // Avoid rendering flash

  return (
    <Paper sx={{ p: { xs: 2, sm: 3 }, backgroundColor: 'rgba(40, 40, 40, 0.9)', backdropFilter: 'blur(5px)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px' }}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack spacing={3}>
            <Typography variant="h5" gutterBottom component="h2">Dettagli Principali</Typography>
            <TextField label="Tecnico Scrivente" fullWidth disabled value={tecnicoScrivente ? `${tecnicoScrivente.nome} ${tecnicoScrivente.cognome}` : 'Caricamento...'} InputLabelProps={{ shrink: true, sx: inputLabelStyles }} sx={{ '.Mui-disabled': { color: '#bbb', WebkitTextFillColor: '#bbb' }, fieldset: { borderColor: 'rgba(255,255,255,0.2)' } }}/>
            <Controller name="data" control={control} render={({ field }) => (<TextField {...field} type="date" label="Data" fullWidth error={!!errors.data} helperText={errors.data?.message} InputLabelProps={{ shrink: true, sx: inputLabelStyles }} sx={{ input: inputStyles, fieldset: formControlStyles.fieldset }} value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : (field.value || '')} /> )}/>
            <Controller name="giornataId" control={control} render={({ field }) => ( <FormControl fullWidth error={!!errors.giornataId}> <InputLabel sx={inputLabelStyles}>Tipo Giornata</InputLabel> <Select {...field} label="Tipo Giornata" sx={formControlStyles}> {tipiGiornata.map((g) => ( <MenuItem key={g.id} value={g.id}>{g.nome}</MenuItem> ))} </Select> <FormHelperText>{errors.giornataId?.message}</FormHelperText> </FormControl> )}/>
            
            {isLavorativa && (
            <>
                <Divider sx={{ my: 1, borderColor: 'rgba(255, 255, 255, 0.2)' }} />
                <Typography variant="h5" component="h2" gutterBottom>Dettagli Lavoro</Typography>
                <Controller name="naveId" control={control} render={({ field }) => ( <FormControl fullWidth error={!!errors.naveId}> <InputLabel sx={inputLabelStyles}>Nave</InputLabel> <Select {...field} label="Nave" sx={formControlStyles} value={field.value || ''}> <MenuItem value=""><em>Nessuna</em></MenuItem> {navi.map((n) => ( <MenuItem key={n.id} value={n.id}>{n.nome}</MenuItem> ))} </Select> <FormHelperText>{errors.naveId?.message}</FormHelperText> </FormControl> )}/>
                <Controller name="luogoId" control={control} render={({ field }) => ( <FormControl fullWidth error={!!errors.luogoId}> <InputLabel sx={inputLabelStyles}>Luogo</InputLabel> <Select {...field} label="Luogo" sx={formControlStyles} value={field.value || ''}> <MenuItem value=""><em>Nessuno</em></MenuItem> {luoghi.map((l) => ( <MenuItem key={l.id} value={l.id}>{l.nome}</MenuItem> ))} </Select> <FormHelperText>{errors.luogoId?.message}</FormHelperText> </FormControl> )}/>
                <Controller name="breveDescrizione" control={control} render={({ field }) => ( <TextField {...field} label="Breve Descrizione Attività" fullWidth multiline rows={2} error={!!errors.breveDescrizione} helperText={errors.breveDescrizione?.message} InputLabelProps={{ sx: inputLabelStyles }} sx={{ textarea: inputStyles, fieldset: formControlStyles.fieldset }} /> )}/>
            </>
            )}

            {isLavorativa && (
                <>
                  <Divider sx={{ my: 1, borderColor: 'rgba(255, 255, 255, 0.2)' }} />
                  <Typography variant="h5" component="h2" gutterBottom>Dettagli Orari</Typography>
                  <Controller name="inserimentoManualeOre" control={control} render={({ field }) => ( <FormControlLabel control={<Switch {...field} checked={!!field.value} />} label="Inserisci ore manualmente" /> )}/>

                  {inserimentoManuale ? (
                      <Controller name="oreLavorate" control={control} render={({ field }) => ( <TextField {...field} type="number" label="Ore Lavorate" fullWidth error={!!errors.oreLavorate} helperText={errors.oreLavorate?.message} InputLabelProps={{ sx: inputLabelStyles }} sx={{ input: inputStyles, fieldset: formControlStyles.fieldset }} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} value={field.value || ''}/> )}/>
                  ) : (
                      <Stack spacing={3}>
                        <Controller name="oraInizio" control={control} render={({ field }) => ( <TextField {...field} type="time" label="Ora Inizio" fullWidth error={!!errors.oraInizio} helperText={errors.oraInizio?.message} InputLabelProps={{ shrink: true, sx: inputLabelStyles }} sx={{ input: inputStyles, fieldset: formControlStyles.fieldset }} value={field.value ? new Date(field.value).toTimeString().slice(0,5) : ''} onChange={(e) => { const [h, m] = e.target.value.split(':'); const d = field.value ? new Date(field.value) : new Date(); d.setHours(parseInt(h), parseInt(m)); field.onChange(d); }} /> )}/>
                        <Controller name="oraFine" control={control} render={({ field }) => ( <TextField {...field} type="time" label="Ora Fine" fullWidth error={!!errors.oraFine} helperText={errors.oraFine?.message} InputLabelProps={{ shrink: true, sx: inputLabelStyles }} sx={{ input: inputStyles, fieldset: formControlStyles.fieldset }} value={field.value ? new Date(field.value).toTimeString().slice(0,5) : ''} onChange={(e) => { const [h, m] = e.target.value.split(':'); const d = field.value ? new Date(field.value) : new Date(); d.setHours(parseInt(h), parseInt(m)); field.onChange(d); }} /> )}/>
                        <Controller name="pausa" control={control} render={({ field }) => ( <TextField {...field} type="number" label="Pausa (minuti)" fullWidth error={!!errors.pausa} helperText={errors.pausa?.message} InputLabelProps={{ sx: inputLabelStyles }} sx={{ input: inputStyles, fieldset: formControlStyles.fieldset }} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} value={field.value || 0}/> )}/>
                      </Stack>
                  )}
              </>
            )}
            
            {isLavorativa && (
            <>
                <Divider sx={{ my: 1, borderColor: 'rgba(255, 255, 255, 0.2)' }} />
                <Typography variant="h5" component="h2" gutterBottom>Descrizione Dettagliata Attività</Typography>
                <Controller name="lavoroEseguito" control={control} render={({ field }) => ( <TextField {...field} label="Lavoro Eseguito (resoconto dettagliato)" fullWidth multiline rows={4} error={!!errors.lavoroEseguito} helperText={errors.lavoroEseguito?.message} InputLabelProps={{ sx: inputLabelStyles }} sx={{ textarea: inputStyles, fieldset: formControlStyles.fieldset }} /> )}/>
                <Controller name="materialiImpiegati" control={control} render={({ field }) => ( <TextField {...field} label="Materiali Impiegati (opzionale)" fullWidth multiline rows={2} error={!!errors.materialiImpiegati} helperText={errors.materialiImpiegati?.message} InputLabelProps={{ sx: inputLabelStyles }} sx={{ textarea: inputStyles, fieldset: formControlStyles.fieldset }} /> )}/>
            </>
            )}

            <Divider sx={{ my: 1, borderColor: 'rgba(255, 255, 255, 0.2)' }} />
            <Typography variant="h5" component="h2" gutterBottom>Personale e Mezzi</Typography>
            <Controller name="tecniciAggiuntiIds" control={control} render={({ field }) => ( <FormControl fullWidth error={!!errors.tecniciAggiuntiIds}> <InputLabel sx={inputLabelStyles}>Altri Tecnici</InputLabel> <Select {...field} multiple label="Altri Tecnici" sx={formControlStyles} renderValue={(selected) => (selected as string[]).map((id) => { const tecnico = tecnici.find((t) => t.id === id); return tecnico ? tecnico.nome : id; }).join(', ') }> {tecnici.filter((t) => t.id !== defaultValues?.tecnicoScriventeId).map((t) => ( <MenuItem key={t.id} value={t.id}>{t.nome} {t.cognome}</MenuItem> ))} </Select> <FormHelperText>{errors.tecniciAggiuntiIds?.message}</FormHelperText> </FormControl> )}/>
            <Controller name="veicoloId" control={control} render={({ field }) => ( <FormControl fullWidth error={!!errors.veicoloId}> <InputLabel sx={inputLabelStyles}>Veicolo</InputLabel> <Select {...field} label="Veicolo" sx={formControlStyles} value={field.value || ''}> <MenuItem value=""><em>Nessuno</em></MenuItem> {veicoli.map((v) => ( <MenuItem key={v.id} value={v.id}>{v.nome} ({v.targa})</MenuItem> ))} </Select> <FormHelperText>{errors.veicoloId?.message}</FormHelperText> </FormControl> )}/>

            <Box sx={{ mt: 4 }}>
              <Button type="submit" variant="contained" fullWidth disabled={isSubmitting} sx={{ backgroundColor: '#2563eb', p: 1.5, fontWeight: 'bold', fontSize: '1.1rem', letterSpacing: '1px', '&:hover': { backgroundColor: '#1d4ed8' } }}>
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
  );
};

// --- Page Container --- 
const NewReportPage = () => {
  const { tipiGiornata, tecnici, navi, luoghi, veicoli, loading, error } = useNewReportData();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#1a1a1a' }}>
      <MenuBar title="Nuovo Report" />
      <Box component="main" sx={{ flexGrow: 1, overflowY: 'auto', p: { xs: 2, sm: 3 } }}>
        {loading && ( <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><CircularProgress /></Box> )}
        {error && ( <Typography color="error" textAlign="center" sx={{ pt: 4 }}>Si è verificato un errore: {error.message}</Typography> )}
        {!loading && !error && tipiGiornata.length > 0 && (
          <ReportForm 
            tipiGiornata={tipiGiornata}
            tecnici={tecnici}
            navi={navi}
            luoghi={luoghi}
            veicoli={veicoli}
          />
        )}
        {!loading && !error && tipiGiornata.length === 0 && (
            <Typography textAlign="center" sx={{ pt: 4 }}>Nessun dato trovato. Impossibile creare un report.</Typography>
        )}
      </Box>
      <Typography variant="body2" sx={{ color: '#2563eb', fontStyle: 'italic', textAlign: 'center', py: 1, flexShrink: 0 }}>
        by &quot;AS&quot;
      </Typography>
    </Box>
  );
};

export default NewReportPage;
