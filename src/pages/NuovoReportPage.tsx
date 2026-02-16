
// CIAO. OBBEDISCO. RIORDINO I CAMPI COME RICHIESTO.
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Box, Paper, Typography, TextField, FormControl, InputLabel, Select, MenuItem,
    Switch, FormControlLabel, Autocomplete, Button, CircularProgress, Grid, Alert
} from '@mui/material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { it } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import { useGlobalData } from '@/contexts/GlobalDataProvider';
import { db } from '@/utils/firebase';
import { doc, getDoc, addDoc, updateDoc, collection, Timestamp } from 'firebase/firestore';

import { TipoGiornata, Tecnico, Veicolo, Nave, Luogo } from '@/models/definitions';

// --- COSTANTI E FUNZIONI HELPER ---

const timeOptions = Array.from({ length: 48 }, (_, i) => { const h = Math.floor(i / 2).toString().padStart(2, '0'); const m = (i % 2 === 0 ? '00' : '30'); return `${h}:${m}`; });

const generateManualHoursOptions = () => {
    const options = [];
    for (let i = 0.5; i <= 8; i += 0.5) {
        const hours = Math.floor(i);
        const minutes = (i % 1 !== 0) ? '30' : '00';
        options.push({ value: i, label: `${hours}:${minutes}` });
    }
    for (let i = 8.5; i <= 24; i += 0.5) {
        const extra = i - 8;
        const extraHours = Math.floor(extra);
        const extraMinutes = (extra % 1 !== 0) ? ':30' : '';
        options.push({ value: i, label: `8+${extraHours}${extraMinutes}` });
    }
    return options;
};
const manualTotalHoursOptions = generateManualHoursOptions();

const formatOreLavorate = (ore: number | null): string => {
    if (ore === null || ore <= 0) return '0';
    const oreFormattate = parseFloat(ore.toFixed(2));
    if (oreFormattate <= 8) {
        return oreFormattate.toString().replace('.5', ':30');
    }
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
    
    const { tipiGiornata, tecnici, veicoli, navi, luoghi, loading: collectionsLoading } = useGlobalData();
    
    const isEditMode = Boolean(reportId);
    const loggedInTecnicoId = user?.uid;

    // --- STATI ---
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
    const [reportDataToLoad, setReportDataToLoad] = useState<DocumentData | null>(null);

    const otherTecnicos = useMemo(() => tecnici.filter(t => t.id !== loggedInTecnicoId), [tecnici, loggedInTecnicoId]);
    const selectedTecnicos = useMemo(() => otherTecnicos.filter(t => altriTecniciIds.includes(t.id)), [altriTecniciIds, otherTecnicos]);

    // --- EFFETTI ---
    useEffect(() => {
        if (!isEditMode) {
            if (!collectionsLoading) setPageLoading(false);
            return;
        }
        const loadReportData = async () => {
            if (reportId) {
                try {
                    const reportSnap = await getDoc(doc(db, 'rapportini', reportId));
                    if (reportSnap.exists()) setReportDataToLoad(reportSnap.data());
                    else { alert("Rapportino non trovato."); navigate('/reports'); }
                } catch (e) { console.error("Errore caricamento report: ", e); alert("Errore caricamento report."); }
            }
        };
        loadReportData();
    }, [isEditMode, reportId, navigate, collectionsLoading]);

    useEffect(() => {
        if (!isEditMode || !reportDataToLoad || collectionsLoading) return;
        const d = reportDataToLoad;
        const tipo = tipiGiornata.find(t => t.id === d.tipoGiornataId);
        setTipoGiornataId(d.tipoGiornataId);
        setIsLavorativo(isGiornataLavorativa(tipo));
        const reportDate = d.data.toDate();
        setData(reportDate);
        
        const today = new Date();
        let isLocked = false;
        let reason = '';

        if (d.tecnicoId !== loggedInTecnicoId) {
            isLocked = true;
            reason = "Rapportino bloccato: non sei l'autore originale.";
        } else if (reportDate.getMonth() !== today.getMonth() || reportDate.getFullYear() !== today.getFullYear()) {
            isLocked = true;
            reason = "Rapportino bloccato: puoi modificare solo i report del mese corrente.";
        }
        setIsReadOnly(isLocked);
        setLockReason(reason);

        setIsManualEntry(d.inserimentoManualeOre || false);
        setOraInizio(d.oraInizio || '07:30');
        setOraFine(d.oraFine || '16:30');
        setPausa(d.pausa === undefined ? 60 : d.pausa);
        setOreLavoro(d.oreLavoro || 8);
        setVeicoloId(d.veicoloId || null);
        setNaveId(d.naveId || null);
        setLuogoId(d.luogoId || null);
        setDescrizioneBreve(d.descrizioneBreve || '');
        setLavoroEseguito(d.lavoroEseguito || '');
        setMaterialiImpiegati(d.materialiImpiegati || '');
        setAltriTecniciIds(d.altriTecniciIds || []);
        setPageLoading(false);
    }, [reportDataToLoad, isEditMode, collectionsLoading, tipiGiornata, loggedInTecnicoId]);

    useEffect(() => {
        if (!isManualEntry && isLavorativo) {
            const start = parseTime(oraInizio);
            const end = parseTime(oraFine);
            const breakTime = pausa || 0;
            const duration = end > start ? end - start - breakTime : 0;
            setOreLavoro(Math.max(0, duration / 60));
        }
    }, [oraInizio, oraFine, pausa, isManualEntry, isLavorativo]);

    // --- GESTORI ---
    const handleTipoGiornataChange = (id: string) => {
        setTipoGiornataId(id);
        const tipo = tipiGiornata.find(t => t.id === id);
        setIsLavorativo(isGiornataLavorativa(tipo));
    };
    
    const handleSubmit = async () => {
        if (!data || !tipoGiornataId) {
            alert("Compila i campi obbligatori (Data e Tipo Giornata).");
            return;
        }
        setIsSaving(true);
        try {
            const rapportinoData: any = {
                data: Timestamp.fromDate(data),
                tipoGiornataId,
                tecnicoId: loggedInTecnicoId,
                lastModified: Timestamp.now(),
            };

            if (isLavorativo) {
                rapportinoData.inserimentoManualeOre = isManualEntry;
                rapportinoData.oraInizio = isManualEntry ? null : oraInizio;
                rapportinoData.oraFine = isManualEntry ? null : oraFine;
                rapportinoData.pausa = isManualEntry ? null : pausa;
                rapportinoData.oreLavoro = oreLavoro;
                rapportinoData.veicoloId = veicoloId;
                rapportinoData.naveId = naveId;
                rapportinoData.luogoId = luogoId;
                rapportinoData.descrizioneBreve = descrizioneBreve;
                rapportinoData.lavoroEseguito = lavoroEseguito;
                rapportinoData.materialiImpiegati = materialiImpiegati;
                rapportinoData.altriTecniciIds = altriTecniciIds;
            } else {
                const fieldsToNullify = { oraInizio: null, oraFine: null, pausa: null, oreLavoro: 0, veicoloId: null, naveId: null, luogoId: null, descrizioneBreve: '', lavoroEseguito: '', materialiImpiegati: '', altriTecniciIds: [] };
                Object.assign(rapportinoData, fieldsToNullify);
            }

            if (isEditMode) {
                const reportRef = doc(db, 'rapportini', reportId!);
                await updateDoc(reportRef, rapportinoData);
            } else {
                rapportinoData.createdAt = Timestamp.now();
                await addDoc(collection(db, 'rapportini'), rapportinoData);
            }
            alert(`Rapportino ${isEditMode ? 'aggiornato' : 'creato'} con successo!`);
            navigate('/reports');
        } catch (error) {
            console.error("Errore salvataggio: ", error);
            alert("Errore durante il salvataggio.");
        } finally {
            setIsSaving(false);
        }
    };

    // --- RENDER ---
    if (pageLoading || collectionsLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress />;</Box>;

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={it}>
            <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1200, mx: 'auto' }}>
                <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 }, maxHeight: '90vh', overflowY: 'auto' }}>
                    <Typography variant="h4" component="h1" gutterBottom>{isEditMode ? 'Dettaglio' : 'Nuovo'} Rapportino</Typography>
                    {isReadOnly && lockReason && <Alert severity="warning" sx={{ mb: 2 }}>{lockReason}</Alert>}
                    <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 2 }}>
                        
                        <DatePicker label="Data" value={data} onChange={setData} disabled={isReadOnly} slotProps={{ textField: { fullWidth: true, required: true } }} />
                        <TextField label="Tecnico Responsabile" value={user?.email || '...'} fullWidth disabled />
                        
                        <FormControl fullWidth required>
                            <InputLabel>Tipo Giornata</InputLabel>
                            <Select value={tipoGiornataId} label="Tipo Giornata" onChange={e => handleTipoGiornataChange(e.target.value)} disabled={isReadOnly}>
                                {tipiGiornata.map(t => (<MenuItem key={t.id} value={t.id}><span>{t.nome}</span></MenuItem>))}
                            </Select>
                        </FormControl>

                        {isLavorativo && (
                            <>
                                <FormControlLabel control={<Switch checked={isManualEntry} onChange={e => setIsManualEntry(e.target.checked)} disabled={isReadOnly} />} label="Inserimento Manuale Ore" />
                                <Grid container spacing={2}>
                                    {!isManualEntry ? (
                                        <>
                                            <Grid item xs={12} sm={4}><FormControl fullWidth><InputLabel>Inizio</InputLabel><Select value={oraInizio || ''} label="Inizio" onChange={e => setOraInizio(e.target.value)} disabled={isReadOnly}>{timeOptions.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}</Select></FormControl></Grid>
                                            <Grid item xs={12} sm={4}><FormControl fullWidth><InputLabel>Fine</InputLabel><Select value={oraFine || ''} label="Fine" onChange={e => setOraFine(e.target.value)} disabled={isReadOnly}>{timeOptions.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}</Select></FormControl></Grid>
                                            <Grid item xs={12} sm={4}><FormControl fullWidth><InputLabel>Pausa</InputLabel><Select value={pausa ?? ''} label="Pausa" onChange={e => setPausa(Number(e.target.value))} disabled={isReadOnly}><MenuItem value={0}>0 min</MenuItem><MenuItem value={30}>30 min</MenuItem><MenuItem value={60}>60 min</MenuItem></Select></FormControl></Grid>
                                            <Grid item xs={12}><TextField label="Totale Ore Calcolato" value={formatOreLavorate(oreLavoro)} fullWidth disabled /></Grid>
                                        </>
                                    ) : (
                                        <Grid item xs={12}>
                                            <FormControl fullWidth required sx={{ minWidth: 160 }}>
                                                <InputLabel>Totale Ore Lavorate</InputLabel>
                                                <Select value={oreLavoro ?? ''} label="Totale Ore Lavorate" onChange={e => setOreLavoro(Number(e.target.value))} disabled={isReadOnly} MenuProps={{ PaperProps: { sx: { maxHeight: 300, '& .MuiList-root': { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0px 8px', }, }, }, }}>
                                                    {manualTotalHoursOptions.map(opt => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
                                                </Select>
                                            </FormControl>
                                        </Grid>
                                    )}
                                </Grid>
                                
                                {/* CIAO. QUESTO È L'ORDINE CORRETTO RICHIESTO. */}
                                <Autocomplete multiple options={otherTecnicos} getOptionLabel={o => `${o.cognome} ${o.nome}`} value={selectedTecnicos} onChange={(_, nv) => setAltriTecniciIds(nv.map(v => v.id))} renderInput={params => <TextField {...params} label="Altri Tecnici" />} disabled={isReadOnly} />
                                <FormControl fullWidth><InputLabel>Nave</InputLabel><Select value={naveId || ''} label="Nave" onChange={e => setNaveId(e.target.value)} disabled={isReadOnly}><MenuItem value=""><em>Nessuna</em></MenuItem>{(navi as Nave[]).map(n => <MenuItem key={n.id} value={n.id}>{n.nome}</MenuItem>)}</Select></FormControl>
                                <FormControl fullWidth><InputLabel>Luogo</InputLabel><Select value={luogoId || ''} label="Luogo" onChange={e => setLuogoId(e.target.value)} disabled={isReadOnly}><MenuItem value=""><em>Nessuno</em></MenuItem>{(luoghi as Luogo[]).map(l => <MenuItem key={l.id} value={l.id}>{l.nome}</MenuItem>)}</Select></FormControl>
                                <FormControl fullWidth><InputLabel>Veicolo</InputLabel><Select value={veicoloId || ''} label="Veicolo" onChange={e => setVeicoloId(e.target.value)} disabled={isReadOnly}><MenuItem value=""><em>Nessuno</em></MenuItem>{veicoli.map(v => <MenuItem key={v.id} value={v.id}>{v.targa}</MenuItem>)}</Select></FormControl>
                                <TextField label="Breve Descrizione" value={descrizioneBreve} onChange={e => setDescrizioneBreve(e.target.value)} fullWidth disabled={isReadOnly} />
                                <TextField label="Materiali Impiegati" value={materialiImpiegati} onChange={e => setMaterialiImpiegati(e.target.value)} fullWidth multiline rows={2} disabled={isReadOnly} />
                                <TextField label="Lavoro Eseguito" value={lavoroEseguito} onChange={e => setLavoroEseguito(e.target.value)} fullWidth multiline rows={4} disabled={isReadOnly} />
                            </>
                        )}
                        <Grid container spacing={2} justifyContent="flex-end" sx={{ mt: 2 }}>
                            <Grid item><Button variant="outlined" size="large" onClick={() => navigate('/reports')}> {isReadOnly ? 'Indietro' : 'Annulla'}</Button></Grid>
                            {!isReadOnly && <Grid item><Button variant="contained" color="primary" size="large" onClick={handleSubmit} disabled={isSaving}>{isSaving ? <CircularProgress size={24} /> : 'Salva'}</Button></Grid>}
                        </Grid>
                    </Box>
                </Paper>
            </Box>
        </LocalizationProvider>
    );
};
export default NuovoReportPage;
