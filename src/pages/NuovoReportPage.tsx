import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Box, Paper, Typography, TextField, FormControl, InputLabel, Select, MenuItem,
    Switch, FormControlLabel, Autocomplete, Button, CircularProgress, Grid, Alert
} from '@mui/material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { it } from 'date-fns/locale';
import { eachDayOfInterval, isBefore, startOfDay, parseISO } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useData } from '@/hooks/useData';
import { db } from '@/utils/firebase';
import { doc, getDoc, addDoc, updateDoc, collection, Timestamp, writeBatch } from 'firebase/firestore';
import { Report, TipoGiornata } from '@/models/definitions';

const timeOptions = Array.from({ length: 48 }, (_, i) => { const h = Math.floor(i / 2).toString().padStart(2, '0'); const m = (i % 2 === 0 ? '00' : '30'); return `${h}:${m}`; });
const generateManualHoursOptions = () => {
    const options = [];
    for (let i = 0.5; i <= 8; i += 0.5) { const hours = Math.floor(i); const minutes = (i % 1 !== 0) ? ':30' : '00'; options.push({ value: i, label: `${hours}:${minutes}` }); }
    for (let i = 8.5; i <= 24; i += 0.5) { const extra = i - 8; const extraHours = Math.floor(extra); const extraMinutes = (extra % 1 !== 0) ? ':30' : ''; options.push({ value: i, label: `8+${extraHours}${extraMinutes}` }); }
    return options;
};
const manualTotalHoursOptions = generateManualHoursOptions();
const formatOreLavorate = (ore: number | null): string => {
    if (ore === null || ore <= 0) return '0';
    const oreFormattate = parseFloat(ore.toFixed(2));
    if (oreFormattate <= 8) { return oreFormattate.toString().replace('.5', ':30'); }
    const straordinario = oreFormattate - 8;
    const straordinarioArrotondato = parseFloat(straordinario.toFixed(2));
    return `8+${straordinarioArrotondato.toString().replace('.5', ':30')}`;
};
const parseTime = (timeStr: string | null) => !timeStr ? 0 : timeStr.split(':').map(Number).reduce((h, m) => h * 60 + m);
const NON_LAVORATIVO_KEYWORDS = ['ferie', 'malattia', 'permesso', 'legge 104'];
const isGiornataLavorativa = (tipo: TipoGiornata | undefined): boolean => {
    if (!tipo || !tipo.nome) return true;
    return !NON_LAVORATIVO_KEYWORDS.some(keyword => tipo.nome.toLowerCase().includes(keyword));
};

const NuovoReportPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { reportId } = useParams<{ reportId: string }>();
    const { tipiGiornata, tecnici, veicoli, navi, luoghi, loading: collectionsLoading } = useData();
    const isEditMode = Boolean(reportId);
    const loggedInTecnicoId = user?.uid;

    const [data, setData] = useState<Date | null>(new Date());
    const [tipoGiornataId, setTipoGiornataId] = useState('');
    const [isLavorativo, setIsLavorativo] = useState(true);
    const [isManualEntry, setIsManualEntry] = useState(false);
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
    const [lockReason, setLockReason] = useState<string | null>(null);
    const [pageLoading, setPageLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isPeriodo, setIsPeriodo] = useState(false);
    const [dataInizio, setDataInizio] = useState<Date | null>(new Date());
    const [dataFine, setDataFine] = useState<Date | null>(new Date());

    const otherTecnicos = useMemo(() => tecnici.filter(t => t.id !== loggedInTecnicoId), [tecnici, loggedInTecnicoId]);
    const selectedTecnicos = useMemo(() => otherTecnicos.filter(t => altriTecniciIds.includes(t.id)), [altriTecniciIds, otherTecnicos]);

    useEffect(() => {
        if (collectionsLoading) return;
        if (isEditMode && reportId) {
            setPageLoading(true);
            const loadReport = async () => {
                try {
                    const reportSnap = await getDoc(doc(db, 'rapportini', reportId));
                    if (reportSnap.exists()) {
                        const reportData = reportSnap.data() as Report;
                        const reportDate = reportData.data instanceof Timestamp ? reportData.data.toDate() : parseISO(reportData.data as any);
                        setData(reportDate);
                        setTipoGiornataId(reportData.tipoGiornataId);
                        const tipo = tipiGiornata.find(t => t.id === reportData.tipoGiornataId);
                        setIsLavorativo(isGiornataLavorativa(tipo));
                        setIsManualEntry(reportData.inserimentoManualeOre || false);
                        setOraInizio(reportData.oraInizio || '07:30');
                        setOraFine(reportData.oraFine || '16:30');
                        setPausa(reportData.pausa === undefined ? 60 : reportData.pausa);
                        setOreLavoro(reportData.oreLavoro || 8);
                        setVeicoloId(reportData.veicoloId || null);
                        setNaveId(reportData.naveId || null);
                        setLuogoId(reportData.luogoId || null);
                        setDescrizioneBreve(reportData.descrizioneBreve || '');
                        setLavoroEseguito(reportData.lavoroEseguito || '');
                        setMaterialiImpiegati(reportData.materialiImpiegati || '');
                        setAltriTecniciIds(reportData.altriTecniciIds || []);

                        const today = new Date();
                        let isLocked = false;
                        let reason = '';
                        if (reportData.tecnicoId !== loggedInTecnicoId) {
                            isLocked = true;
                            reason = "Rapportino bloccato: non sei l'autore originale.";
                        } else if (reportDate.getMonth() !== today.getMonth() || reportDate.getFullYear() !== today.getFullYear()) {
                            isLocked = true;
                            reason = "Rapportino bloccato: puoi modificare solo i report del mese corrente.";
                        }
                        setIsReadOnly(isLocked);
                        setLockReason(reason);

                    } else {
                        alert("Rapportino non trovato.");
                        navigate('/lista-report');
                    }
                } catch (e) {
                    console.error("Errore caricamento report: ", e);
                    alert("Errore caricamento report.");
                } finally {
                    setPageLoading(false);
                }
            };
            loadReport();
        } else {
            setPageLoading(false);
        }
    }, [isEditMode, reportId, navigate, collectionsLoading, tipiGiornata, loggedInTecnicoId]);

    useEffect(() => {
        if (!isManualEntry && isLavorativo) {
            const start = parseTime(oraInizio);
            const end = parseTime(oraFine);
            const breakTime = pausa || 0;
            const duration = end > start ? end - start - breakTime : 0;
            setOreLavoro(Math.max(0, duration / 60));
        }
    }, [oraInizio, oraFine, pausa, isManualEntry, isLavorativo]);

    const handleTipoGiornataChange = (id: string) => { setTipoGiornataId(id); const tipo = tipiGiornata.find(t => t.id === id); setIsLavorativo(isGiornataLavorativa(tipo)); };
    const handleCancel = () => navigate(isEditMode ? '/lista-report' : '/');

    const handleSubmit = async () => {
        if ((!data && !isPeriodo) || !tipoGiornataId || !loggedInTecnicoId) { alert("Compila i campi obbligatori (Data e Tipo Giornata)."); return; }
        setIsSaving(true);
        try {
            if (isPeriodo && !isEditMode && dataInizio && dataFine) {
                if (isBefore(startOfDay(dataFine), startOfDay(dataInizio))) { alert('La data di fine non può precedere quella di inizio.'); setIsSaving(false); return; }
                const batch = writeBatch(db);
                const days = eachDayOfInterval({ start: dataInizio, end: dataFine });
                days.forEach(day => {
                    const newReportRef = doc(collection(db, 'rapportini'));
                    const rapportinoData: Partial<Report> = { tipoGiornataId, data: Timestamp.fromDate(day), tecnicoId: loggedInTecnicoId, partecipantiIds: [loggedInTecnicoId], createdAt: Timestamp.now(), lastModified: Timestamp.now(), oreLavoro: 0, isLavorativo: false };
                    batch.set(newReportRef, rapportinoData);
                });
                await batch.commit();
                alert(`Salvataggio completato. Creati ${days.length} rapportini di assenza.`);
                navigate('/lista-report');
            } else {
                const partecipantiIds = Array.from(new Set([loggedInTecnicoId, ...altriTecniciIds]));
                const rapportinoData: Partial<Report> = { data: Timestamp.fromDate(data!), tipoGiornataId, tecnicoId: loggedInTecnicoId, partecipantiIds, lastModified: Timestamp.now() };
                
                if (isLavorativo) {
                    Object.assign(rapportinoData, { inserimentoManualeOre: isManualEntry, oraInizio: isManualEntry ? null : oraInizio, oraFine: isManualEntry ? null : oraFine, pausa: isManualEntry ? null : pausa, oreLavoro, veicoloId, naveId, luogoId, descrizioneBreve, lavoroEseguito, materialiImpiegati, altriTecniciIds });
                } else {
                    Object.assign(rapportinoData, { oreLavoro: 0, inserimentoManualeOre: false, oraInizio: null, oraFine: null, pausa: null, veicoloId: null, naveId: null, luogoId: null, descrizioneBreve: '', lavoroEseguito: '', materialiImpiegati: '', altriTecniciIds: [] });
                }

                if (isEditMode) {
                    await updateDoc(doc(db, 'rapportini', reportId!), rapportinoData);
                } else {
                    rapportinoData.createdAt = Timestamp.now();
                    await addDoc(collection(db, 'rapportini'), rapportinoData);
                }
                alert(`Rapportino ${isEditMode ? 'aggiornato' : 'creato'} con successo!`);
                navigate('/lista-report');
            }
        } catch (error) {
            console.error("Errore salvataggio: ", error);
            alert("Errore durante il salvataggio.");
        } finally {
            setIsSaving(false);
        }
    };

    if (pageLoading || collectionsLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress />;</Box>;

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={it}>
            <Box sx={{ p: { xs: 2, sm: 3 }, mx: 'auto' }}>
                <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 }, maxHeight: '90vh', overflowY: 'auto' }}>
                    <Typography variant="h4" component="h1" gutterBottom>{isEditMode ? 'Dettaglio' : 'Nuovo'} Rapportino</Typography>
                    {isReadOnly && lockReason && <Alert severity="warning" sx={{ mb: 2 }}>{lockReason}</Alert>}
                    <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 2 }}>
                        {!isEditMode && ( <Alert severity="info" sx={{ display: 'flex', alignItems: 'center', mt: 1 }}> <FormControlLabel control={<Switch checked={isPeriodo} onChange={e => setIsPeriodo(e.target.checked)} disabled={isSaving} />} label="Inserisci per un periodo di più giorni" /> </Alert> )}
                        {isPeriodo && !isEditMode ? (
                            <Grid container spacing={2}>
                                <Grid xs={12} sm={6}><DatePicker label="Data Inizio" value={dataInizio} onChange={setDataInizio} slotProps={{ textField: { fullWidth: true, required: true } }} /></Grid>
                                <Grid xs={12} sm={6}><DatePicker label="Data Fine" value={dataFine} onChange={setDataFine} slotProps={{ textField: { fullWidth: true, required: true } }} /></Grid>
                            </Grid>
                        ) : ( <DatePicker label="Data" value={data} onChange={setData} disabled={isReadOnly || isSaving} slotProps={{ textField: { fullWidth: true, required: true } }} /> )}
                        <TextField label="Tecnico Responsabile" value={user?.email || '...'} fullWidth disabled />
                        <FormControl fullWidth required>
                            <InputLabel>Tipo Giornata</InputLabel>
                            <Select value={tipoGiornataId} label="Tipo Giornata" onChange={e => handleTipoGiornataChange(e.target.value)} disabled={isReadOnly || isSaving}>
                                {tipiGiornata.map(t => (<MenuItem key={t.id} value={t.id}><span>{t.nome}</span></MenuItem>))}
                            </Select>
                        </FormControl>
                        {isLavorativo && !isPeriodo && ( <>
                                <FormControlLabel control={<Switch checked={isManualEntry} onChange={e => setIsManualEntry(e.target.checked)} disabled={isReadOnly} />} label="Inserimento Manuale Ore" />
                                <Grid container spacing={2}>{!isManualEntry ? ( <>
                                            <Grid xs={12} sm={4}><FormControl fullWidth><InputLabel>Inizio</InputLabel><Select value={oraInizio || ''} label="Inizio" onChange={e => setOraInizio(e.target.value)} disabled={isReadOnly}>{timeOptions.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}</Select></FormControl></Grid>
                                            <Grid xs={12} sm={4}><FormControl fullWidth><InputLabel>Fine</InputLabel><Select value={oraFine || ''} label="Fine" onChange={e => setOraFine(e.target.value)} disabled={isReadOnly}>{timeOptions.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}</Select></FormControl></Grid>
                                            <Grid xs={12} sm={4}><FormControl fullWidth><InputLabel>Pausa</InputLabel><Select value={pausa ?? ''} label="Pausa" onChange={e => setPausa(Number(e.target.value))} disabled={isReadOnly}><MenuItem value={0}>0 min</MenuItem><MenuItem value={30}>30 min</MenuItem><MenuItem value={60}>60 min</MenuItem></Select></FormControl></Grid>
                                            <Grid xs={12}><TextField label="Totale Ore Calcolato" value={formatOreLavorate(oreLavoro)} fullWidth disabled /></Grid>
                                        </> ) : ( <Grid xs={12}><FormControl fullWidth required sx={{ minWidth: 160 }}><InputLabel>Totale Ore Lavorate</InputLabel><Select value={oreLavoro ?? ''} label="Totale Ore Lavorate" onChange={e => setOreLavoro(Number(e.target.value))} disabled={isReadOnly} MenuProps={{ PaperProps: { sx: { maxHeight: 300, '& .MuiList-root': { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0px 8px', }, }, }, }}>{manualTotalHoursOptions.map(opt => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}</Select></FormControl></Grid> )}
                                </Grid>
                                <Autocomplete multiple options={otherTecnicos} getOptionLabel={o => `${o.cognome} ${o.nome}`} value={selectedTecnicos} onChange={(_, nv) => setAltriTecniciIds(nv.map(v => v.id))} renderInput={params => <TextField {...params} label="Altri Tecnici" />} disabled={isReadOnly} />
                                <FormControl fullWidth><InputLabel>Nave</InputLabel><Select value={naveId || ''} label="Nave" onChange={e => setNaveId(e.target.value)} disabled={isReadOnly}><MenuItem value=""><em>Nessuna</em></MenuItem>{navi.map(n => <MenuItem key={n.id} value={n.id}>{n.nome}</MenuItem>)}</Select></FormControl>
                                <FormControl fullWidth><InputLabel>Luogo</InputLabel><Select value={luogoId || ''} label="Luogo" onChange={e => setLuogoId(e.target.value)} disabled={isReadOnly}><MenuItem value=""><em>Nessuno</em></MenuItem>{luoghi.map(l => <MenuItem key={l.id} value={l.id}>{l.nome}</MenuItem>)}</Select></FormControl>
                                <FormControl fullWidth><InputLabel>Veicolo</InputLabel><Select value={veicoloId || ''} label="Veicolo" onChange={e => setVeicoloId(e.target.value)} disabled={isReadOnly}><MenuItem value=""><em>Nessuno</em></MenuItem>{veicoli.map(v => <MenuItem key={v.id} value={v.id}>{v.targa}</MenuItem>)}</Select></FormControl>
                                <TextField label="Breve Descrizione" value={descrizioneBreve} onChange={e => setDescrizioneBreve(e.target.value)} fullWidth disabled={isReadOnly} />
                                <TextField label="Materiali Impiegati" value={materialiImpiegati} onChange={e => setMaterialiImpiegati(e.target.value)} fullWidth multiline rows={2} disabled={isReadOnly} />
                                <TextField label="Lavoro Eseguito" value={lavoroEseguito} onChange={e => setLavoroEseguito(e.target.value)} fullWidth multiline rows={4} disabled={isReadOnly} />
                            </> )}
                        <Grid container spacing={2} justifyContent="flex-end" sx={{ mt: 2 }}>
                            <Grid><Button variant="outlined" size="large" onClick={handleCancel}> {isReadOnly ? 'Indietro' : 'Annulla'}</Button></Grid>
                            {!isReadOnly && <Grid><Button variant="contained" color="primary" size="large" onClick={handleSubmit} disabled={isSaving}>{isSaving ? <CircularProgress size={24} /> : 'Salva'}</Button></Grid>}
                        </Grid>
                    </Box>
                </Paper>
            </Box>
        </LocalizationProvider>
    );
};
export default NuovoReportPage;
