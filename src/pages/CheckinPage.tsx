import { useState, useMemo, useCallback, useContext, useRef, useEffect } from 'react';
import { Box, Typography, Button, Paper, Grid, TextField, Select, MenuItem, FormControl, InputLabel, CircularProgress, Alert, ListSubheader } from '@mui/material';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/local-db';
import { AuthContext } from '@/contexts/AuthContextDefinition';
import { useMasterData } from '@/hooks/useMasterData';
import FullScreenLoader from '@/components/FullScreenLoader';
import { db as dexieDb } from '@/db/local-db';
import { aggiungiAllaCoda } from '@/services/syncService';
import { useSyncManager } from '@/hooks/useSyncManager';

const getLocalDateTime = () => {
    const date = new Date();
    const timezoneOffset = date.getTimezoneOffset() * 60000;
    const localDate = new Date(date.getTime() - timezoneOffset);
    return localDate.toISOString().slice(0, 16);
};

const CheckinPage = () => {
  const authContext = useContext(AuthContext);
  const { masterData, loading: loadingAnagrafiche } = useMasterData();
  const { requestManualSync } = useSyncManager();
  const navi = masterData?.navi;
  const luoghi = masterData?.luoghi;
  const scrollBoxRef = useRef<HTMLDivElement>(null);

  const [selectedLuogo, setSelectedLuogo] = useState('');
  const [startLocation, setStartLocation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const [timeValues, setTimeValues] = useState({
    inizio_giornata: getLocalDateTime(),
    fine_giornata: getLocalDateTime(),
    check_in_luogo: getLocalDateTime(),
    check_out_luogo: getLocalDateTime(),
  });
  
  const user = authContext?.user;

  const allUserEvents = useLiveQuery(() => {
      if (!user?.uid) return [];
      return db.checkins
          .where('tecnicoId')
          .equals(user.uid)
          .sortBy('timestampImpostato');
  }, [user?.uid], []);

  useEffect(() => {
    if (scrollBoxRef.current) {
        scrollBoxRef.current.scrollTop = scrollBoxRef.current.scrollHeight;
    }
  }, [allUserEvents?.length]);

  const { giornataIniziata, inLuogo, eventiDelGiorno } = useMemo(() => {
    if (!allUserEvents || allUserEvents.length === 0) {
        return { giornataIniziata: false, inLuogo: null, eventiDelGiorno: [] };
    }

    const ultimoEventoTimestamp = allUserEvents[allUserEvents.length - 1].timestampImpostato;
    const oggi = new Date(ultimoEventoTimestamp);
    oggi.setHours(0, 0, 0, 0); 

    let lastInizioGiornataIndex = -1;
    for (let i = allUserEvents.length - 1; i >= 0; i--) {
        const eventoDate = new Date(allUserEvents[i].timestampImpostato);
        if (allUserEvents[i].tipo === 'inizio_giornata' && eventoDate >= oggi) {
            lastInizioGiornataIndex = i;
            break;
        }
        if (eventoDate < oggi) break; 
    }

    if (lastInizioGiornataIndex === -1) {
        return { giornataIniziata: false, inLuogo: null, eventiDelGiorno: [] };
    }

    const eventiPotenziali = allUserEvents.slice(lastInizioGiornataIndex);
    const fineGiornataEsiste = eventiPotenziali.some(e => e.tipo === 'fine_giornata');

    const isGiornataIniziata = !fineGiornataEsiste;
    
    const eventiDaMostrare = eventiPotenziali;

    const ultimoEventoLuogo = isGiornataIniziata ? [...eventiDaMostrare].reverse().find(e => e.tipo === 'check_in_luogo' || e.tipo === 'check_out_luogo') : undefined;
    const isInLuogo = ultimoEventoLuogo?.tipo === 'check_in_luogo' 
        ? (ultimoEventoLuogo.naveId ? `navi_${ultimoEventoLuogo.naveId}` : `luoghi_${ultimoEventoLuogo.luogoId}`) 
        : null;

    return { 
        giornataIniziata: isGiornataIniziata, 
        inLuogo: isInLuogo, 
        eventiDelGiorno: eventiDaMostrare 
    };
  }, [allUserEvents]);


  const handleTimeChange = (type: string, value: string) => {
    setError(null);
    setTimeValues(prev => ({ ...prev, [type]: value }));
  };

  const handleGenericSubmit = useCallback(async (type: 'inizio_giornata' | 'fine_giornata' | 'check_in_luogo' | 'check_out_luogo') => {
    setError(null);
    const currentUser = authContext?.user;
    const currentUserProfile = authContext?.userProfile;

    if (!currentUser || !currentUserProfile) {
      setError("Utente non autenticato. Impossibile procedere.");
      return;
    }

    if (type === 'inizio_giornata' && !startLocation) {
        setError("Per iniziare la giornata, è obbligatorio selezionare un luogo iniziale.");
        return;
    }

    if (type === 'check_in_luogo' && !selectedLuogo) {
        setError("Per entrare, devi prima selezionare una Nave o un Luogo dal menu.");
        return;
    }

    setLoading(type);

    try {
        await dexieDb.transaction('rw', dexieDb.checkins, dexieDb.syncQueue, async () => {
            const tecnicoName = currentUserProfile.displayName || currentUser.email || 'N/D';

            const addEventToDbAndQueue = async (eventPayload: any, idSuffix: string) => {
                const localId = `local_${Date.now()}_${idSuffix}`.replace(/\./g, '');
                const optimisticEvent = { ...eventPayload, id: localId, timestampReale: new Date() };
                await dexieDb.checkins.add(optimisticEvent);
                await aggiungiAllaCoda({ type: 'checkin', action: 'create', entityId: localId, payload: eventPayload });
            };

            if (type === 'fine_giornata' && inLuogo) {
                const timestampUscita = new Date(new Date(timeValues.fine_giornata).getTime() - 1000).toISOString();
                const [source, id] = inLuogo.split('_');
                const checkoutEvent = {
                    tecnicoId: currentUser.uid, tecnicoName, tipo: 'check_out_luogo' as const, timestampImpostato: timestampUscita,
                    ...(source === 'navi' && { naveId: id }),
                    ...(source === 'luoghi' && { luogoId: id }),
                };
                await addEventToDbAndQueue(checkoutEvent, 'autocheckout');
            }
            
            const timestampImpostato = new Date(timeValues[type]).toISOString();
            const eventPayload: any = { tecnicoId: currentUser.uid, tecnicoName, tipo: type, timestampImpostato };

            if (type === 'check_in_luogo' || (type === 'check_out_luogo' && !inLuogo)) {
                 if (!selectedLuogo) {
                     throw new Error("Luogo non selezionato per l'operazione.");
                 }
                 const [source, id] = selectedLuogo.split('_');
                 if (source === 'navi') eventPayload.naveId = id; else eventPayload.luogoId = id;
            } else if (type === 'check_out_luogo' && inLuogo) {
                 const [source, id] = inLuogo.split('_');
                 if (source === 'navi') eventPayload.naveId = id; else eventPayload.luogoId = id;
            }
            await addEventToDbAndQueue(eventPayload, type);

            if (type === 'inizio_giornata' && startLocation) {
                const timestampCheckin = new Date(new Date(timeValues.inizio_giornata).getTime() + 1000).toISOString();
                const [source, id] = startLocation.split('_');
                const checkinEvent = {
                    tecnicoId: currentUser.uid, tecnicoName, tipo: 'check_in_luogo' as const, timestampImpostato: timestampCheckin,
                    ...(source === 'navi' && { naveId: id }),
                    ...(source === 'luoghi' && { luogoId: id }),
                };
                await addEventToDbAndQueue(checkinEvent, 'contextual_checkin');
            }
        });

        requestManualSync();

    } catch (e: any) {
        console.error("Errore durante l'operazione di check-in:", e);
        setError(`Errore durante l'operazione: ${e.message}`);
    } finally {
        setLoading(null);
    }
  }, [authContext, timeValues, selectedLuogo, inLuogo, startLocation, requestManualSync]);

  if (!authContext || !user || authContext.loading) return <FullScreenLoader />;

  const naviOptions = useMemo(() => (navi || []).map(n => ({ id: `navi_${n.id}`, nome: n.nome })).sort((a, b) => a.nome.localeCompare(b.nome)), [navi]);
  const luoghiOptions = useMemo(() => (luoghi || []).map(l => ({ id: `luoghi_${l.id}`, nome: l.nome })).sort((a, b) => a.nome.localeCompare(b.nome)), [luoghi]);

  return (
      <Box sx={{ p: { xs: 2, sm: 3 }, height: 'calc(100vh - 64px)', overflowY: 'auto', '&::-webkit-scrollbar': { display: 'none' } }}>
          <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 }, maxWidth: 800, margin: 'auto' }}>
            <Typography variant='h5' component='h2' gutterBottom>Presenze giornaliere</Typography>
            
            {error && <Alert severity='error' sx={{ mt: 2 }} onClose={() => setError(null)}>{error}</Alert>}
            
            {eventiDelGiorno && eventiDelGiorno.length > 0 && (
                <Alert severity='info' sx={{ my: 2 }}>
                    <Typography variant='body2'>Eventi della Giornata Corrente:</Typography>
                    <Box ref={scrollBoxRef} component='ul' sx={{ m: 0, pl: '20px', maxHeight: '110px', overflowY: 'auto', '&::-webkit-scrollbar': { width: '8px' }, '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '4px' } }}>
                        {eventiDelGiorno.map((e: any) => {
                            const nome = e.naveId ? navi?.find(n=>n.id === e.naveId)?.nome : luoghi?.find(l=>l.id === e.luogoId)?.nome;
                            return (<li key={e.id}><b>{e.tipo.replace(/_/g, ' ')}</b>alle {new Date(e.timestampImpostato).toLocaleString()} {nome ? `- ${nome}` : ''}</li>);
                        })}
                    </Box>
                </Alert>
            )}

            <Box mb={4}>
              <Typography variant='h6' component='h2' sx={{ mb: 2 }}>Orario di Lavoro</Typography>
              <Grid container spacing={2} alignItems='flex-end'>
                <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label='Inizio Giornata' type='datetime-local' value={timeValues.inizio_giornata} onChange={(e) => handleTimeChange('inizio_giornata', e.target.value)} disabled={giornataIniziata} InputLabelProps={{ shrink: true }} /></Grid>
                <Grid size={{ xs: 12, sm: 6 }}><FormControl fullWidth disabled={giornataIniziata}><InputLabel>Luogo Iniziale</InputLabel><Select value={startLocation} onChange={(e) => setStartLocation(e.target.value)} label='Luogo Iniziale'>{[...naviOptions, ...luoghiOptions].sort((a,b)=>a.nome.localeCompare(b.nome)).map(o => <MenuItem key={o.id} value={o.id}>{o.nome}</MenuItem>)}</Select></FormControl></Grid>
                <Grid size={12}><Button fullWidth variant='contained' color='primary' onClick={() => handleGenericSubmit('inizio_giornata')} disabled={giornataIniziata || !startLocation || !!loading}>{loading === 'inizio_giornata' ? <CircularProgress size={24} /> : 'Inizia Giornata'}</Button></Grid>
                <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label='Fine Giornata' type='datetime-local' value={timeValues.fine_giornata} onChange={(e) => handleTimeChange('fine_giornata', e.target.value)} disabled={!giornataIniziata} InputLabelProps={{ shrink: true }} /></Grid>
                <Grid size={{ xs: 12, sm: 6 }}><Button fullWidth variant='contained' color='secondary' onClick={() => handleGenericSubmit('fine_giornata')} disabled={!giornataIniziata || !!loading}>{loading === 'fine_giornata' ? <CircularProgress size={24} /> : 'Termina Giornata'}</Button></Grid>
              </Grid>
            </Box>

            <Box sx={{ opacity: giornataIniziata ? 1 : 0.5, pointerEvents: giornataIniziata ? 'auto' : 'none' }}>
                <Typography variant='h6'>Interventi sul Luogo</Typography>
                <FormControl fullWidth sx={{ my: 2 }} disabled={!giornataIniziata || !!inLuogo || loadingAnagrafiche}>
                    <InputLabel>Seleziona Luogo o Nave</InputLabel>
                    <Select value={loadingAnagrafiche ? '' : (inLuogo || selectedLuogo)} onChange={(e) => { setError(null); setSelectedLuogo(e.target.value); }} label='Seleziona Luogo o Nave'>
                        {loadingAnagrafiche ? <MenuItem disabled>Caricamento...</MenuItem> : [
                            (naviOptions.length > 0 && <ListSubheader key='navi-header'>Navi</ListSubheader>),
                            ...naviOptions.map(n => <MenuItem key={n.id} value={n.id}>{n.nome}</MenuItem>),
                            (luoghiOptions.length > 0 && <ListSubheader key='luoghi-header'>Luoghi</ListSubheader>),
                            ...luoghiOptions.map(l => <MenuItem key={l.id} value={l.id}>{l.nome}</MenuItem>)
                        ]}
                    </Select>
                </FormControl>
                <Grid container spacing={2} alignItems='flex-end'>
                    <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label='Entrata' type='datetime-local' value={timeValues.check_in_luogo} onChange={(e) => handleTimeChange('check_in_luogo', e.target.value)} disabled={!giornataIniziata || !!inLuogo} InputLabelProps={{ shrink: true }} /></Grid>
                    <Grid size={{ xs: 12, sm: 6 }}><Button fullWidth variant='contained' onClick={() => handleGenericSubmit('check_in_luogo')} disabled={!giornataIniziata || !!inLuogo || !!loading || !selectedLuogo}>{loading === 'check_in_luogo' ? <CircularProgress size={24} /> : 'Entrata'}</Button></Grid>
                    <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label='Uscita' type='datetime-local' value={timeValues.check_out_luogo} onChange={(e) => handleTimeChange('check_out_luogo', e.target.value)} disabled={!giornataIniziata || !inLuogo} InputLabelProps={{ shrink: true }} /></Grid>
                    <Grid size={{ xs: 12, sm: 6 }}><Button fullWidth variant='contained' onClick={() => handleGenericSubmit('check_out_luogo')} disabled={!giornataIniziata || !inLuogo || !!loading}>{loading === 'check_out_luogo' ? <CircularProgress size={24} /> : 'Uscita'}</Button></Grid>
                </Grid>
            </Box>

          </Paper>
      </Box>
  );
};

export default CheckinPage;
