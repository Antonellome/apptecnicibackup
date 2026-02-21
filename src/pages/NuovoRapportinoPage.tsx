
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Box, Paper, Typography, TextField, FormControl, InputLabel, Select, MenuItem,
    Switch, FormControlLabel, Autocomplete, Button, CircularProgress, Grid, Alert
} from '@mui/material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { it } from 'date-fns/locale';
import { eachDayOfInterval, isBefore, startOfDay } from 'date-fns';
import { useAuth } from '../hooks/useAuth';
import { useGlobalData } from '../contexts/GlobalDataProvider';
import { db } from '../utils/firebase';
import { collection, doc, getDoc, addDoc, updateDoc, Timestamp, DocumentData, writeBatch } from 'firebase/firestore';
import { TipoGiornata, Tecnico, Veicolo, Nave, Luogo } from '../models/definitions';

const timeOptions = Array.from({ length: 48 }, (_, i) => { const h = Math.floor(i / 2).toString().padStart(2, '0'); const m = (i % 2 === 0 ? '00' : '30'); return `${h}:${m}`; });
const generateTotalHoursOptions = () => Array.from({ length: 25 }, (_, i) => ({ value: i, label: i.toString() }));
const totalHoursOptions = generateTotalHoursOptions();
const parseTime = (timeStr: string | null): number => !timeStr ? 0 : timeStr.split(':').map(Number).reduce((h, m) => h * 60 + m, 0);

const NuovoRapportinoPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const loggedInTecnicoId = user?.uid;
    const { reportId } = useParams<{ reportId: string }>();
    const isEditMode = Boolean(reportId);

    const { tipiGiornata = [], tecnici = [], veicoli = [], navi = [], luoghi = [] } = useGlobalData() || {};

    // --- STATI DEL FORM ---
    const [data, setData] = useState<Date | null>(new Date());
    const [dataInizio, setDataInizio] = useState<Date | null>(new Date());
    const [dataFine, setDataFine] = useState<Date | null>(new Date());
    const [isPeriodo, setIsPeriodo] = useState(false); // Stato per il controllo manuale
    const [tipoGiornataId, setTipoGiornataId] = useState('');
    const [isLavorativo, setIsLavorativo] = useState(false);
    const [isManuale, setIsManuale] = useState(false);
    const [oraInizio, setOraInizio] = useState<string | null>('07:30');
    const [oraFine, setOraFine] = useState<string | null>('16:30');
    const [pausa, setPausa] = useState<number | null>(60);
    const [oreLavoro, setOreLavoro] = useState<number | null>(8);
    const [veicoloId, setVeicoloId] = useState<string | null>(null);
    const [naveId, setNaveId] = useState<string | null>(null);
    const [luogoId, setLuogoId] = useState<string | null>(null);
    const [descrizioneBreve, setDescrizioneBreve] = useState('');
    const [lavoroEseguito, setLavoroEseguito] = useState('');
    const [materialiImpiegati, setMaterialiImpiegati] = useState('');
    const [altriTecniciIds, setAltriTecniciIds] = useState<string[]>([]);
    const [isReadOnly, setIsReadOnly] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [reportDataToLoad, setReportDataToLoad] = useState<DocumentData | null>(null);

    // --- LOGICA DI CARICAMENTO IN MODALITÀ MODIFICA ---
    useEffect(() => {
        if (!isEditMode || !reportId || tipiGiornata.length === 0) {
            setIsLoading(false);
            return;
        }
        const loadReportData = async () => {
            try {
                const reportSnap = await getDoc(doc(db, 'rapportini', reportId));
                if (reportSnap.exists()) {
                    const d = reportSnap.data();
                    setReportDataToLoad(d);
                    setData(d.data.toDate());
                    setTipoGiornataId(d.tipoGiornataId);
                    const tipo = tipiGiornata.find(t => t.id === d.tipoGiornataId);
                    setIsLavorativo(tipo?.lavorativo === true);
                    setIsPeriodo(false); // In modifica, non si gestiscono periodi
                    setIsManuale(d.isManuale || false);
                    setOraInizio(d.oraInizio || '07:30');
                    setOraFine(d.oraFine || '16:30');
                    setPausa(d.pausa ?? 60);
                    setOreLavoro(d.oreLavoro || 8);
                    setVeicoloId(d.veicoloId || null);
                    setNaveId(d.naveId || null);
                    setLuogoId(d.luogoId || null);
                    setDescrizioneBreve(d.descrizioneBreve || '');
                    setLavoroEseguito(d.lavoroEseguito || '');
                    setMaterialiImpiegati(d.materialiImpiegati || '');
                    setAltriTecniciIds(d.altriTecniciIds || []);
                    setIsReadOnly(d.tecnicoId !== loggedInTecnicoId);
                } else {
                    alert("Rapportino non trovato.");
                    navigate('/reports');
                }
            } catch (e) { console.error("Errore caricamento report: ", e); } finally { setIsLoading(false); }
        };
        if (tipiGiornata.length > 0) loadReportData();
    }, [isEditMode, reportId, navigate, tipiGiornata, loggedInTecnicoId]);

    // --- LOGICA DERIVATA ---
    useEffect(() => {
        if (!isManuale && isLavorativo) {
            const ore = (parseTime(oraFine) - parseTime(oraInizio) - (pausa || 0)) / 60;
            setOreLavoro(Math.max(0, ore));
        }
    }, [oraInizio, oraFine, pausa, isManuale, isLavorativo]);

    const handleTipoGiornataChange = (id: string) => {
        setTipoGiornataId(id);
        const tipoSelezionato = tipiGiornata.find(t => t.id === id);
        setIsLavorativo(tipoSelezionato ? tipoSelezionato.lavorativo === true : false);
    };
    
    // --- LOGICA DI SALVATAGGIO (CONFORME AL BLUEPRINT) ---
    const handleSubmit = async () => {
        if (!tipoGiornataId || !loggedInTecnicoId) { alert('Tecnico e Tipo Giornata sono obbligatori.'); return; }
        const tipoSelezionato = tipiGiornata.find(t => t.id === tipoGiornataId);
        if (!tipoSelezionato) { alert('Tipo giornata non valido'); return; }

        setIsSaving(true);
        try {
            // LOGICA PER PERIODO (CREAZIONE DI RAPPORTINI MULTIPLI)
            if (isPeriodo && !isEditMode && dataInizio && dataFine) {
                if (isBefore(startOfDay(dataFine), startOfDay(dataInizio))) { alert('La data di fine non può precedere quella di inizio.'); setIsSaving(false); return; }
                
                const batch = writeBatch(db);
                const days = eachDayOfInterval({ start: dataInizio, end: dataFine });

                days.forEach(day => {
                    const newReportRef = doc(collection(db, 'rapportini'));
                    const rapportinoData = {
                        data: Timestamp.fromDate(day),
                        tecnicoId: loggedInTecnicoId,
                        tipoGiornataId: tipoGiornataId,
                        isLavorativo: tipoSelezionato.lavorativo,
                        oreLavoro: 0,
                        isManuale: false,
                        partecipanti: [loggedInTecnicoId],
                        createdAt: Timestamp.now(),
                        createdBy: loggedInTecnicoId,
                    };
                    batch.set(newReportRef, rapportinoData);
                });

                await batch.commit();
                alert(`Salvataggio completato. Creati ${days.length} rapportini di assenza.`);
            } else { // LOGICA PER GIORNO SINGOLO (COME PRIMA)
                if (!data) { alert('La data è obbligatoria.'); setIsSaving(false); return; }
                const partecipanti = Array.from(new Set([loggedInTecnicoId, ...altriTecniciIds]));
                const reportData = { data: Timestamp.fromDate(data), tecnicoId: isEditMode && reportDataToLoad ? reportDataToLoad.tecnicoId : loggedInTecnicoId, tipoGiornataId, isLavorativo: tipoSelezionato.lavorativo, oreLavoro: isLavorativo ? (Number(oreLavoro) || 0) : 0, isManuale: isLavorativo ? isManuale : false, oraInizio: isLavorativo && !isManuale ? oraInizio : null, oraFine: isLavorativo && !isManuale ? oraFine : null, pausa: isLavorativo && !isManuale ? pausa : null, veicoloId: isLavorativo ? veicoloId : null, naveId: isLavorativo ? naveId : null, luogoId: isLavorativo ? luogoId : null, descrizioneBreve: isLavorativo ? descrizioneBreve : '', lavoroEseguito: isLavorativo ? lavoroEseguito : '', materialiImpiegati: isLavorativo ? materialiImpiegati : '', altriTecniciIds: isLavorativo ? altriTecniciIds : [], partecipanti: isLavorativo ? partecipanti : [loggedInTecnicoId] };
                
                if (isEditMode && reportId) {
                    await updateDoc(doc(db, 'rapportini', reportId), { ...reportData, lastUpdatedAt: Timestamp.now(), lastUpdatedBy: loggedInTecnicoId });
                    alert('Rapportino aggiornato!');
                } else {
                    await addDoc(collection(db, 'rapportini'), { ...reportData, createdAt: Timestamp.now(), createdBy: loggedInTecnicoId });
                    alert('Rapportino salvato!');
                }
            }
            navigate('/reports');
        } catch (e) { console.error("Errore salvataggio: ", e); alert('Si è verificato un errore durante il salvataggio.'); } finally { setIsSaving(false); }
    };

    if (isLoading && isEditMode) return <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress />;</Box>;

    // --- RENDER DEL COMPONENTE ---
    return (
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={it}>
            <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 800, mx: 'auto' }}>
                <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 }, maxHeight: '90vh', overflowY: 'auto' }}>
                    <Typography variant="h4" component="h1" gutterBottom>{isEditMode ? (isReadOnly ? 'Dettaglio' : 'Modifica') : 'Nuovo'} Rapportino</Typography>
                    <Box component="form" noValidate sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 2 }}>
                        
                        {/* SELETTORI DATA / PERIODO */}
                        {!isEditMode && (
                            <Alert severity="info" sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
                                <FormControlLabel 
                                    control={<Switch checked={isPeriodo} onChange={e => setIsPeriodo(e.target.checked)} disabled={isEditMode || isSaving} />}
                                    label="Inserisci per un periodo di più giorni"
                                />
                            </Alert>
                        )}

                        {isPeriodo && !isEditMode ? (
                            <Grid container spacing={2}>
                                <Grid
                                    size={{
                                        xs: 12,
                                        sm: 6
                                    }}><DatePicker label="Data Inizio" value={dataInizio} onChange={setDataInizio} slotProps={{ textField: { fullWidth: true, required: true } }} /></Grid>
                                <Grid
                                    size={{
                                        xs: 12,
                                        sm: 6
                                    }}><DatePicker label="Data Fine" value={dataFine} onChange={setDataFine} slotProps={{ textField: { fullWidth: true, required: true } }} /></Grid>
                            </Grid>
                        ) : (
                            <DatePicker label="Data" value={data} onChange={setData} disabled={isReadOnly || isSaving || isPeriodo} slotProps={{ textField: { fullWidth: true, required: true } }} />
                        )}

                        {/* CAMPI COMUNI */}
                        <TextField label="Tecnico Responsabile" value={user?.email || '...'} fullWidth disabled />
                        <FormControl fullWidth required>
                            <InputLabel>Tipo Giornata</InputLabel>
                            <Select value={tipoGiornataId} label="Tipo Giornata" onChange={e => handleTipoGiornataChange(e.target.value)} disabled={isReadOnly || isSaving}>
                                {tipiGiornata.map(t => <MenuItem key={t.id} value={t.id}>{t.nome}</MenuItem>)}
                            </Select>
                        </FormControl>

                        {/* CAMPI VISIBILI SOLO PER GIORNATE LAVORATIVE E NON DI PERIODO */}
                        {isLavorativo && !isPeriodo && (
                            <>
                                <FormControlLabel control={<Switch checked={isManuale} onChange={e => setIsManuale(e.target.checked)} disabled={isReadOnly || isSaving} />} label="Inserimento Manuale Ore" />
                                {!isManuale ? (
                                    <Grid container spacing={2}>
                                        <Grid
                                            size={{
                                                xs: 12,
                                                sm: 4
                                            }}><FormControl fullWidth><InputLabel>Inizio</InputLabel><Select value={oraInizio || ''} label="Inizio" onChange={e => setOraInizio(e.target.value)} disabled={isReadOnly || isSaving}>{timeOptions.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}</Select></FormControl></Grid>
                                        <Grid
                                            size={{
                                                xs: 12,
                                                sm: 4
                                            }}><FormControl fullWidth><InputLabel>Fine</InputLabel><Select value={oraFine || ''} label="Fine" onChange={e => setOraFine(e.target.value)} disabled={isReadOnly || isSaving}>{timeOptions.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}</Select></FormControl></Grid>
                                        <Grid
                                            size={{
                                                xs: 12,
                                                sm: 4
                                            }}><FormControl fullWidth><InputLabel>Pausa (min)</InputLabel><Select value={pausa ?? ''} label="Pausa (min)" onChange={e => setPausa(Number(e.target.value))} disabled={isReadOnly || isSaving}><MenuItem value={0}>0</MenuItem><MenuItem value={30}>30</MenuItem><MenuItem value={60}>60</MenuItem><MenuItem value={90}>90</MenuItem><MenuItem value={120}>120</MenuItem></Select></FormControl></Grid>
                                        <Grid size={12}><TextField label="Totale Ore Calcolato" value={(Number(oreLavoro) || 0).toFixed(2)} fullWidth disabled /></Grid>
                                    </Grid>
                                ) : (
                                    <FormControl fullWidth required><InputLabel>Totale Ore Lavorate</InputLabel><Select value={oreLavoro ?? ''} label="Totale Ore Lavorate" onChange={e => setOreLavoro(Number(e.target.value))} disabled={isReadOnly || isSaving}>{totalHoursOptions.map(opt => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}</Select></FormControl>
                                )}
                                <Autocomplete multiple options={tecnici.filter(t => t.id !== loggedInTecnicoId)} getOptionLabel={o => `${o.cognome} ${o.nome}`} value={tecnici.filter(t => altriTecniciIds.includes(t.id))} onChange={(_, nv) => setAltriTecniciIds(nv.map(v => v.id))} renderInput={params => <TextField {...params} label="Altri Tecnici" />} disabled={isReadOnly || isSaving} />
                                <FormControl fullWidth><InputLabel>Veicolo</InputLabel><Select value={veicoloId || ''} label="Veicolo" onChange={e => setVeicoloId(e.target.value)} disabled={isReadOnly || isSaving}><MenuItem value=""><em>Nessuno</em></MenuItem>{(veicoli as Veicolo[]).map(v => <MenuItem key={v.id} value={v.id}>{v.targa}</MenuItem>)}</Select></FormControl>
                                <FormControl fullWidth><InputLabel>Nave</InputLabel><Select value={naveId || ''} label="Nave" onChange={e => setNaveId(e.target.value)} disabled={isReadOnly || isSaving}><MenuItem value=""><em>Nessuna</em></MenuItem>{(navi as Nave[]).map(n => <MenuItem key={n.id} value={n.id}>{n.nome}</MenuItem>)}</Select></FormControl>
                                <FormControl fullWidth><InputLabel>Luogo</InputLabel><Select value={luogoId || ''} label="Luogo" onChange={e => setLuogoId(e.target.value)} disabled={isReadOnly || isSaving}><MenuItem value=""><em>Nessuno</em></MenuItem>{(luoghi as Luogo[]).map(l => <MenuItem key={l.id} value={l.id}>{l.nome}</MenuItem>)}</Select></FormControl>
                                <TextField label="Breve Descrizione" value={descrizioneBreve} onChange={e => setDescrizioneBreve(e.target.value)} fullWidth multiline rows={2} disabled={isReadOnly || isSaving} />
                                <TextField label="Lavoro Eseguito" value={lavoroEseguito} onChange={e => setLavoroEseguito(e.target.value)} fullWidth multiline rows={4} disabled={isReadOnly || isSaving} />
                                <TextField label="Materiali Impiegati" value={materialiImpiegati} onChange={e => setMaterialiImpiegati(e.target.value)} fullWidth multiline rows={2} disabled={isReadOnly || isSaving} />
                            </>
                        )}

                        {/* BOTTONI AZIONE */}
                        <Grid container spacing={2} justifyContent="flex-end" sx={{ mt: 2 }}>
                            <Grid><Button variant="outlined" size="large" onClick={() => navigate('/reports')} disabled={isSaving}>{isReadOnly ? 'Indietro' : 'Annulla'}</Button></Grid>
                            {!isReadOnly && <Grid><Button variant="contained" color="primary" size="large" onClick={handleSubmit} disabled={isSaving || (isPeriodo && (!dataInizio || !dataFine))}>{isSaving ? <CircularProgress size={24} /> : 'Salva'}</Button></Grid>}
                        </Grid>
                    </Box>
                </Paper>
            </Box>
        </LocalizationProvider>
    );
};

export default NuovoRapportinoPage;
