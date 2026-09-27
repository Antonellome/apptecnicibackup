
import { useState, useMemo, useContext, useRef, useEffect } from 'react';
import { Box, Typography, Button, Paper, Grid, TextField, Select, MenuItem, FormControl, InputLabel, CircularProgress, Alert, ListSubheader } from '@mui/material';
import { useLiveQuery } from 'dexie-react-hooks';
import { db as dexieDb } from '@/db/local-db';
import { AuthContext } from '@/contexts/AuthContextDefinition';
import { useMasterData } from '@/hooks/useMasterData';
import { aggiungiAllaCoda } from '@/services/offlineSync';
import { useSyncManager } from '@/hooks/useSyncManager';

const FullScreenLoader = () => (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
    </Box>
);

type MachineState = 'GIORNATA_NON_INIZIATA' | 'DENTRO_LUOGO' | 'FUORI_LUOGO';
type ActionType = 'INIZIO_GIORNATA' | 'FINE_GIORNATA' | 'ENTRATA' | 'USCITA';
type CheckinEvent = { id?: string; tecnicoId: string; tipo: string; timestampImpostato: string; timestampReale: string; naveId?: string; luogoId?: string; };

const calculateCurrentState = (events: CheckinEvent[] | undefined): { state: MachineState, place: string | null } => {
    if (!events || events.length === 0) {
        return { state: 'GIORNATA_NON_INIZIATA', place: null };
    }

    const lastEvent = [...events].reverse().find(e => 
        e.tipo === 'fine_giornata' || 
        e.tipo === 'check_in_luogo' || 
        e.tipo === 'check_out_luogo' ||
        e.tipo === 'inizio_giornata' 
    );

    if (!lastEvent || lastEvent.tipo === 'fine_giornata') {
        return { state: 'GIORNATA_NON_INIZIATA', place: null };
    }
    
    if (lastEvent.tipo === 'check_in_luogo') {
        const place = lastEvent.naveId ? `navi_${lastEvent.naveId}` : `luoghi_${lastEvent.luogoId}`;
        return { state: 'DENTRO_LUOGO', place };
    }
    
    if (lastEvent.tipo === 'check_out_luogo' || lastEvent.tipo === 'inizio_giornata') {
        return { state: 'FUORI_LUOGO', place: null };
    }

    return { state: 'GIORNATA_NON_INIZIATA', place: null };
};

const getLocalDateTime = () => {
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    const localDate = new Date(now.getTime() - tzOffset);
    return localDate.toISOString().slice(0, 19);
};


const CheckinPage = () => {
    const authContext = useContext(AuthContext);
    const { masterData, loading: loadingAnagrafiche } = useMasterData();
    const { triggerQueueSync } = useSyncManager();
    const scrollBoxRef = useRef<HTMLDivElement>(null);

    const [selectedLuogo, setSelectedLuogo] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [timeValues, setTimeValues] = useState({
        INIZIO_GIORNATA: getLocalDateTime(),
        FINE_GIORNATA: getLocalDateTime(),
        ENTRATA: getLocalDateTime(),
        USCITA: getLocalDateTime(),
    });
      
    const user = authContext?.user;

    const allUserEvents = useLiveQuery(() => {
        if (!user?.uid) return [];
        return dexieDb.checkin_giornalieri.where('tecnicoId').equals(user.uid).sortBy('timestampImpostato');
    }, [user?.uid]);

    const { state: uiState, place: currentPlace } = useMemo(() => calculateCurrentState(allUserEvents), [allUserEvents]);

    useEffect(() => {
        if (scrollBoxRef.current) {
            scrollBoxRef.current.scrollTop = scrollBoxRef.current.scrollHeight;
        }
    }, [allUserEvents?.length]);

    const handleTimeChange = (type: ActionType, value: string) => {
        setError(null);
        setTimeValues(prev => ({ ...prev, [type]: value }));
    };

    const handleAction = async (action: ActionType) => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        setError(null);

        if (!user?.uid || !authContext?.userProfile) {
            setError("Utente non trovato.");
            setIsSubmitting(false);
            return;
        }

        try {
            await dexieDb.transaction('rw', dexieDb.checkin_giornalieri, dexieDb.syncQueue, async () => {
                
                const freshEvents = await dexieDb.checkin_giornalieri.where('tecnicoId').equals(user.uid).sortBy('timestampImpostato');
                const { state: realTimeState, place: realTimePlace } = calculateCurrentState(freshEvents);
                
                const lastEventTimestamp = freshEvents.length > 0 ? new Date(freshEvents[freshEvents.length - 1].timestampImpostato) : null;
                const impostatoTimestamp = new Date(timeValues[action]);

                if (lastEventTimestamp && impostatoTimestamp <= lastEventTimestamp) {
                    throw new Error("L'orario impostato deve essere successivo all'ultimo evento registrato.");
                }

                const addEventToDbAndQueue = async (eventPayload: Omit<CheckinEvent, 'id' | 'timestampReale'> & { tecnicoName: string }) => {
                    const localId = `local_${Date.now()}_${Math.random()}`;
                    const finalPayload = { ...eventPayload, id: localId, timestampReale: new Date().toISOString() };
                    await dexieDb.checkin_giornalieri.add(finalPayload as any);
                    await aggiungiAllaCoda({ type: 'checkin', action: 'create', entityId: localId, payload: finalPayload });
                };

                const tecnicoName = authContext.userProfile.displayName || user.email || 'N/D';
                const impostatoISO = impostatoTimestamp.toISOString();

                switch (action) {
                    case 'INIZIO_GIORNATA':
                        if (realTimeState !== 'GIORNATA_NON_INIZIATA') throw new Error("La giornata è già iniziata.");
                        if (!selectedLuogo) throw new Error("Seleziona un luogo o una nave per iniziare.");
                        
                        await addEventToDbAndQueue({ tecnicoId: user.uid, tecnicoName, tipo: 'inizio_giornata', timestampImpostato: impostatoISO });
                        
                        const [source, id] = selectedLuogo.split('_');
                        const timestampCheckin = new Date(impostatoTimestamp.getTime() + 1000).toISOString();
                        await addEventToDbAndQueue({ tecnicoId: user.uid, tecnicoName, tipo: 'check_in_luogo', timestampImpostato: timestampCheckin, ...(source === 'navi' ? { naveId: id } : { luogoId: id }) });
                        break;

                    case 'FINE_GIORNATA':
                        if (realTimeState === 'GIORNATA_NON_INIZIATA') throw new Error("Nessuna giornata da terminare.");
                        
                        if (realTimeState === 'DENTRO_LUOGO') {
                            if (!realTimePlace) throw new Error("Stato inconsistente: sei dentro un luogo non identificato.");
                            const [sourceCheckout, idCheckout] = realTimePlace.split('_');
                            const timestampUscita = new Date(impostatoTimestamp.getTime() - 1000).toISOString();
                            await addEventToDbAndQueue({ tecnicoId: user.uid, tecnicoName, tipo: 'check_out_luogo', timestampImpostato: timestampUscita, ...(sourceCheckout === 'navi' ? { naveId: idCheckout } : { luogoId: idCheckout }) });
                        }
                        
                        await addEventToDbAndQueue({ tecnicoId: user.uid, tecnicoName, tipo: 'fine_giornata', timestampImpostato: impostatoISO });
                        break;

                    case 'ENTRATA':
                        if (realTimeState !== 'FUORI_LUOGO') throw new Error("Azione non permessa. Devi essere fuori da un luogo per poter entrare.");
                        if (!selectedLuogo) throw new Error("Seleziona un luogo o nave in cui entrare.");
                        
                        const [entrataSource, entrataId] = selectedLuogo.split('_');
                        await addEventToDbAndQueue({ tecnicoId: user.uid, tecnicoName, tipo: 'check_in_luogo', timestampImpostato: impostatoISO, ...(entrataSource === 'navi' ? { naveId: entrataId } : { luogoId: entrataId }) });
                        break;

                    case 'USCITA':
                        if (realTimeState !== 'DENTRO_LUOGO') throw new Error("Azione non permessa. Non risulti essere dentro un luogo.");
                        if (!realTimePlace) throw new Error("Stato inconsistente: non è possibile determinare da dove uscire.");
                        
                        const [uscitaSource, uscitaId] = realTimePlace.split('_');
                        await addEventToDbAndQueue({ tecnicoId: user.uid, tecnicoName, tipo: 'check_out_luogo', timestampImpostato: impostatoISO, ...(uscitaSource === 'navi' ? { naveId: uscitaId } : { luogoId: uscitaId }) });
                        break;
                }
            });
            triggerQueueSync();
        } catch (e: any) {
            console.error(`Errore durante l'azione '${action}':`, e);
            setError(`ERRORE: ${e.message || 'Operazione fallita.'}`);
        } finally {
            setIsSubmitting(false);
            setSelectedLuogo('');
            
            const nextTime = getLocalDateTime();
            setTimeValues({
                INIZIO_GIORNATA: nextTime,
                FINE_GIORNATA: nextTime,
                ENTRATA: nextTime,
                USCITA: nextTime,
            });
        }
    };

    if (!authContext || !user || authContext.loading) return <FullScreenLoader />;

    const allLocations = useMemo(() => 
      [
          ...(masterData?.navi || []).map(n => ({ id: `navi_${n.id}`, nome: n.nome })).filter(n => n.id && n.nome),
          ...(masterData?.luoghi || []).map(l => ({ id: `luoghi_${l.id}`, nome: l.nome })).filter(l => l.id && l.nome)
      ].sort((a, b) => a.nome.localeCompare(b.nome))
    , [masterData]);
    
    const canStartDay = uiState === 'GIORNATA_NON_INIZIATA';
    const canEndDay = uiState === 'DENTRO_LUOGO' || uiState === 'FUORI_LUOGO';
    const canEnter = uiState === 'FUORI_LUOGO';
    const canExit = uiState === 'DENTRO_LUOGO';

    const getSectionStyle = (isActive: boolean) => ({
        p: 2,
        border: '2px solid',
        borderColor: isActive ? 'primary.main' : 'transparent',
        opacity: isActive ? 1 : 0.5,
        pointerEvents: isActive ? 'auto' : 'none',
        transition: 'all 0.3s ease-in-out',
    });

    return (
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
            <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 }, maxWidth: 800, margin: 'auto' }}>
              <Typography variant='h5' component='h2' gutterBottom>Presenze</Typography>
              
              {error && <Alert severity='error' sx={{ my: 2 }} onClose={() => setError(null)}>{error}</Alert>}
              
              {allUserEvents && allUserEvents.length > 0 && (
                  <Alert severity='info' sx={{ my: 2 }}>
                      <Typography variant='body2'>Ultimi 3 eventi:</Typography>
                      <Box 
                        ref={scrollBoxRef} 
                        component='ul' 
                        sx={{ 
                            m: 0, pl: '20px', maxHeight: '6.5em', overflowY: 'auto',
                            scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' }
                        }}
                      >
                          {allUserEvents.slice(-3).map((e) => {
                              const nome = e.naveId ? masterData?.navi?.find(n => n.id === e.naveId)?.nome : masterData?.luoghi?.find(l => l.id === e.luogoId)?.nome;
                              const orario = new Date(e.timestampImpostato).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
                              const tipoEvento = e.tipo.replace(/_/g, ' ');
                              return (<li key={e.id}><b>{tipoEvento.charAt(0).toUpperCase() + tipoEvento.slice(1)}</b> alle {orario} {nome ? `- ${nome}` : ''}</li>);
                          })}
                      </Box>
                  </Alert>
              )}

              {isSubmitting && <Box sx={{display: 'flex', justifyContent: 'center', my: 2}}><CircularProgress /></Box>}

              <Grid container spacing={3}>
                {/* SEZIONE 1: INIZIO GIORNATA */}
                <Grid size={12}>
                    <Paper sx={getSectionStyle(canStartDay)} elevation={2}>
                        <Typography variant="h6" gutterBottom>1. Inizio Giornata</Typography>
                        <Grid container spacing={2} alignItems="center">
                            <Grid
                                size={{
                                    xs: 12,
                                    sm: 6
                                }}><TextField fullWidth label='Orario Inizio' type='datetime-local' value={timeValues.INIZIO_GIORNATA} onChange={(e) => handleTimeChange('INIZIO_GIORNATA', e.target.value)} disabled={isSubmitting} InputLabelProps={{ shrink: true }} /></Grid>
                            <Grid
                                size={{
                                    xs: 12,
                                    sm: 6
                                }}><FormControl fullWidth focused={!isSubmitting}><InputLabel>Luogo Iniziale</InputLabel><Select value={selectedLuogo} onChange={(e) => setSelectedLuogo(e.target.value)} label='Luogo Iniziale'>{allLocations.map(o => <MenuItem key={o.id} value={o.id}>{o.nome}</MenuItem>)}</Select></FormControl></Grid>
                            <Grid size={12}><Button fullWidth variant='contained' color='primary' onClick={() => handleAction('INIZIO_GIORNATA')} disabled={!selectedLuogo || isSubmitting}>Inizia Giornata</Button></Grid>
                        </Grid>
                    </Paper>
                </Grid>

                {/* SEZIONE 2: ENTRATA */}
                <Grid size={12}>
                     <Paper sx={getSectionStyle(canEnter)} elevation={2}>
                        <Typography variant="h6" gutterBottom>2. Entrata</Typography>
                        <Grid container spacing={2} alignItems="center">
                            <Grid
                                size={{
                                    xs: 12,
                                    sm: 6
                                }}><TextField fullWidth label='Orario Entrata' type='datetime-local' value={timeValues.ENTRATA} onChange={(e) => handleTimeChange('ENTRATA', e.target.value)} disabled={isSubmitting} InputLabelProps={{ shrink: true }} /></Grid>
                            <Grid
                                size={{
                                    xs: 12,
                                    sm: 6
                                }}><FormControl fullWidth focused={!isSubmitting}><InputLabel>Seleziona Luogo o Nave</InputLabel><Select value={selectedLuogo} onChange={(e) => setSelectedLuogo(e.target.value)} label='Seleziona Luogo o Nave'>{allLocations.map(o => <MenuItem key={o.id} value={o.id}>{o.nome}</MenuItem>)}</Select></FormControl></Grid>
                            <Grid size={12}><Button fullWidth variant='contained' onClick={() => handleAction('ENTRATA')} disabled={!selectedLuogo || isSubmitting}>Entrata</Button></Grid>
                        </Grid>
                    </Paper>
                </Grid>

                {/* SEZIONE 3: USCITA */}
                <Grid size={12}>
                    <Paper sx={getSectionStyle(canExit)} elevation={2}>
                        <Typography variant="h6" gutterBottom>3. Uscita</Typography>
                         <Grid container spacing={2} alignItems="center">
                            <Grid
                                size={{
                                    xs: 12,
                                    sm: 6
                                }}><TextField fullWidth label='Orario Uscita' type='datetime-local' value={timeValues.USCITA} onChange={(e) => handleTimeChange('USCITA', e.target.value)} disabled={isSubmitting} InputLabelProps={{ shrink: true }} /></Grid>
                            <Grid
                                size={{
                                    xs: 12,
                                    sm: 6
                                }}><Button fullWidth variant='contained' onClick={() => handleAction('USCITA')} disabled={isSubmitting}>Uscita</Button></Grid>
                        </Grid>
                    </Paper>
                </Grid>

                {/* SEZIONE 4: FINE GIORNATA */}
                 <Grid size={12}>
                    <Paper sx={getSectionStyle(canEndDay)} elevation={2}>
                        <Typography variant="h6" gutterBottom>4. Fine Giornata</Typography>
                        <Grid container spacing={2} alignItems="center">
                            <Grid
                                size={{
                                    xs: 12,
                                    sm: 6
                                }}><TextField fullWidth label='Orario Fine' type='datetime-local' value={timeValues.FINE_GIORNATA} onChange={(e) => handleTimeChange('FINE_GIORNATA', e.target.value)} disabled={isSubmitting} InputLabelProps={{ shrink: true }} /></Grid>
                            <Grid
                                size={{
                                    xs: 12,
                                    sm: 6
                                }}><Button fullWidth variant='contained' color='secondary' onClick={() => handleAction('FINE_GIORNATA')} disabled={isSubmitting}>Termina Giornata</Button></Grid>
                        </Grid>
                    </Paper>
                </Grid>
              </Grid>
            </Paper>
        </Box>
    );
};

export default CheckinPage;
