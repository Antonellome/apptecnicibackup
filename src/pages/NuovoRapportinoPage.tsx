
// CIAO. Ricostruzione definitiva basata sulle specifiche corrette.
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Box, Paper, Typography, TextField, FormControl, InputLabel, Select, MenuItem,
    Switch, FormControlLabel, Autocomplete, Button, CircularProgress, Alert, Grid, Icon
} from '@mui/material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { it } from 'date-fns/locale';
import { useAuth } from '../hooks/useAuth'; // CIAO. Corretto il path del context
import { useGlobalData } from '../contexts/GlobalDataProvider'; // CIAO. Corretto il path del context
import { db } from '../utils/firebase';
import { collection, doc, getDoc, addDoc, updateDoc, Timestamp, DocumentData } from 'firebase/firestore';

// CIAO. TIPI E FUNZIONI HELPER, ORA CORRETTI SECONDO GLI ORDINI.
// CIAO. Interfaccia allineata alle specifiche del database: { nome, lavorativo }
interface TipoGiornata { id: string; nome: string; lavorativo: boolean; }
interface Tecnico { id: string; nome: string; cognome: string; }
interface GenericItem { id: string; nome: string; }
interface Veicolo { id: string; targa: string; }

const timeOptions = Array.from({ length: 48 }, (_, i) => { const h = Math.floor(i / 2).toString().padStart(2, '0'); const m = (i % 2 === 0 ? '00' : '30'); return `${h}:${m}`; });

const generateTotalHoursOptions = () => {
    const options = [];
    for (let i = 0; i <= 8; i++) { options.push({ value: i, label: i.toString() }); }
    for (let i = 1; i <= 16; i++) { options.push({ value: 8 + i, label: `8+${i}` }); }
    return options;
};
const totalHoursOptions = generateTotalHoursOptions();

const parseTime = (timeStr: string | null) => !timeStr ? 0 : timeStr.split(':').map(Number).reduce((h, m) => h * 60 + m);

// --- COMPONENTE ---
const NuovoRapportinoPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const loggedInTecnicoId = user?.uid;
    const { reportId } = useParams<{ reportId: string }>();
    const isEditMode = Boolean(reportId);

    const collections = useGlobalData();
    // CIAO. Assicuriamoci che i dati siano array vuoti se non disponibili
    const { tipiGiornata = [], tecnici = [], veicoli = [], navi = [], luoghi = [] } = collections || {};

    const [reportDataToLoad, setReportDataToLoad] = useState<DocumentData | null>(null);
    
    // CIAO. STATI DEL FORM
    const [data, setData] = useState<Date | null>(new Date());
    const [tipoGiornataId, setTipoGiornataId] = useState('');
    // CIAO. Stato rinominato da isFatturabile a isLavorativo per coerenza
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

    // CIAO. LOGICA DI CARICAMENTO E POPOLAMENTO
    useEffect(() => {
        if (!collections) return;
        if (!isEditMode) {
            // CIAO. La logica del default non è nelle specifiche, la rimuovo per ora.
            setIsLoading(false);
            return;
        }
        const loadReportData = async () => {
            if (reportId) {
                try {
                    const reportSnap = await getDoc(doc(db, 'rapportini', reportId));
                    if (reportSnap.exists()) {
                        setReportDataToLoad(reportSnap.data());
                    } else { 
                        alert("Rapportino non trovato."); 
                        navigate('/reports'); 
                    }
                } catch (e) { 
                    console.error("CIAO: Errore caricamento report: ", e); 
                    alert("Errore caricamento report."); 
                }
            }
        };
        loadReportData();
    }, [isEditMode, reportId, navigate, collections]);
    
    useEffect(() => {
        if (!isEditMode || !reportDataToLoad || !collections) return;
        
        const d = reportDataToLoad;
        const tipoId = d.tipoGiornataId;
        const tipo = (collections.tipiGiornata as TipoGiornata[]).find(t => t.id === tipoId);
        
        setTipoGiornataId(tipoId);
        // CIAO. Logica aggiornata a 'lavorativo'
        setIsLavorativo(tipo ? tipo.lavorativo === true : false);
        setData(d.data.toDate());
        setIsManuale(d.isManuale || false);
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
        setIsReadOnly(d.tecnicoId !== loggedInTecnicoId);
        setIsLoading(false);
        
    }, [reportDataToLoad, isEditMode, collections, loggedInTecnicoId]);

    // CIAO. LOGICA DI CALCOLO E GESTIONE
    useEffect(() => {
        if (!isManuale && isLavorativo) {
            const ore = (parseTime(oraFine) - parseTime(oraInizio) - (pausa || 0)) / 60;
            setOreLavoro(Math.max(0, ore));
        }
    }, [oraInizio, oraFine, pausa, isManuale, isLavorativo]);

    const handleTipoGiornataChange = (id: string) => {
        setTipoGiornataId(id);
        const tipo = (tipiGiornata as TipoGiornata[]).find(t => t.id === id);
        // CIAO. Logica aggiornata a 'lavorativo'
        setIsLavorativo(tipo ? tipo.lavorativo === true : false);
    };
    
    const handleSubmit = async () => {
        if (!tipoGiornataId || !data || !loggedInTecnicoId) { alert('Data, Tecnico e Tipo Giornata sono obbligatori.'); return; }
        setIsSaving(true);
        
        // CIAO. Creazione del campo 'partecipanti' come richiesto
        const partecipanti = Array.from(new Set([loggedInTecnicoId, ...altriTecniciIds]));

        // CIAO. Oggetto del report allineato allo schema finale
        const reportData = {
            data: Timestamp.fromDate(data),
            tecnicoId: isEditMode ? reportDataToLoad?.tecnicoId : loggedInTecnicoId,
            tipoGiornataId,
            oreLavoro: Number(oreLavoro) || 0,
            isManuale: isLavorativo ? isManuale : false,
            oraInizio: isLavorativo && !isManuale ? oraInizio : null,
            oraFine: isLavorativo && !isManuale ? oraFine : null,
            pausa: isLavorativo && !isManuale ? pausa : null,
            veicoloId: isLavorativo ? veicoloId : null,
            naveId: isLavorativo ? naveId : null,
            luogoId: isLavorativo ? luogoId : null,
            descrizioneBreve: isLavorativo ? descrizioneBreve : null,
            lavoroEseguito: isLavorativo ? lavoroEseguito : null,
            materialiImpiegati: isLavorativo ? materialiImpiegati : null,
            altriTecniciIds: isLavorativo ? altriTecniciIds : [],
            partecipanti: isLavorativo ? partecipanti : [loggedInTecnicoId] // CIAO. Aggiunto campo partecipanti
        };
        
        try {
            if (isEditMode && reportId) {
                await updateDoc(doc(db, 'rapportini', reportId), {
                    ...reportData,
                    lastUpdatedAt: Timestamp.now(),
                    lastUpdatedBy: loggedInTecnicoId
                });
                alert('Rapportino aggiornato!');
            } else {
                await addDoc(collection(db, 'rapportini'), { 
                    ...reportData, 
                    createdAt: Timestamp.now(), 
                    createdBy: loggedInTecnicoId 
                });
                alert('Rapportino salvato!');
            }
            navigate('/reports');
        } catch (e) { console.error("CIAO: Errore salvataggio: ", e); alert('Errore salvataggio.'); } finally { setIsSaving(false); }
    };

    if (isLoading || !collections) return <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress />;</Box>;

    const oreLavoroAsNumber = Number(oreLavoro) || 0;
    const otherTecnicos = (tecnici as Tecnico[]).filter(t => t.id !== loggedInTecnicoId);
    const selectedTecnicos = useMemo(() => otherTecnicos.filter(t => altriTecniciIds.includes(t.id)), [altriTecniciIds, otherTecnicos]);

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={it}>
            <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 800, mx: 'auto' }}>
                <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 }, maxHeight: '90vh', overflowY: 'auto' }}>
                    <Typography variant="h4" component="h1" gutterBottom>{isEditMode ? (isReadOnly ? 'Dettaglio' : 'Modifica') : 'Nuovo'} Rapportino</Typography>
                    
                    <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 2 }}>
                        <DatePicker label="Data" value={data} onChange={setData} disabled={isReadOnly} slotProps={{ textField: { fullWidth: true, required: true } }} />
                        <TextField label="Tecnico Responsabile" value={user?.email || '...'} fullWidth disabled />
                        <FormControl fullWidth required>
                            <InputLabel>Tipo Giornata</InputLabel>
                            {/* CIAO. Dropdown corretto per usare 't.nome' come display value */}
                            <Select value={tipoGiornataId} label="Tipo Giornata" onChange={e => handleTipoGiornataChange(e.target.value)} disabled={isReadOnly}>
                                {(tipiGiornata as TipoGiornata[]).map(t => <MenuItem key={t.id} value={t.id}>{t.nome}</MenuItem>)}
                            </Select>
                        </FormControl>
                        
                        {isLavorativo && (
                            <>
                                <FormControlLabel control={<Switch checked={isManuale} onChange={e => setIsManuale(e.target.checked)} disabled={isReadOnly} />} label="Inserimento Manuale Ore" />
                                {!isManuale ? (
                                    <Grid container spacing={2}>
                                        <Grid item xs={4}><FormControl fullWidth><InputLabel>Inizio</InputLabel><Select value={oraInizio || ''} label="Inizio" onChange={e => setOraInizio(e.target.value)} disabled={isReadOnly}>{timeOptions.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}</Select></FormControl></Grid>
                                        <Grid item xs={4}><FormControl fullWidth><InputLabel>Fine</InputLabel><Select value={oraFine || ''} label="Fine" onChange={e => setOraFine(e.target.value)} disabled={isReadOnly}>{timeOptions.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}</Select></FormControl></Grid>
                                        <Grid item xs={4}><FormControl fullWidth><InputLabel>Pausa</InputLabel><Select value={pausa ?? ''} label="Pausa" onChange={e => setPausa(Number(e.target.value))} disabled={isReadOnly}><MenuItem value={0}>0</MenuItem><MenuItem value={30}>30</MenuItem><MenuItem value={60}>60</MenuItem></Select></FormControl></Grid>
                                        <Grid item xs={12}><TextField label="Totale Ore Calcolato" value={oreLavoroAsNumber.toFixed(2)} fullWidth disabled /></Grid>
                                    </Grid>
                                ) : (
                                    <FormControl fullWidth required>
                                        <InputLabel>Totale Ore Lavorate</InputLabel>
                                        <Select value={oreLavoro ?? ''} label="Totale Ore Lavorate" onChange={e => setOreLavoro(Number(e.target.value))} disabled={isReadOnly}>
                                            {totalHoursOptions.map(opt => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
                                        </Select>
                                    </FormControl>
                                )}
                                <FormControl fullWidth><InputLabel>Veicolo</InputLabel><Select value={veicoloId || ''} label="Veicolo" onChange={e => setVeicoloId(e.target.value)} disabled={isReadOnly}><MenuItem value=""><em>Nessuno</em></MenuItem>{(veicoli as Veicolo[]).map(v => <MenuItem key={v.id} value={v.id}>{v.targa}</MenuItem>)}</Select></FormControl>
                                <FormControl fullWidth><InputLabel>Nave</InputLabel><Select value={naveId || ''} label="Nave" onChange={e => setNaveId(e.target.value)} disabled={isReadOnly}><MenuItem value=""><em>Nessuna</em></MenuItem>{(navi as GenericItem[]).map(n => <MenuItem key={n.id} value={n.id}>{n.nome}</MenuItem>)}</Select></FormControl>
                                <FormControl fullWidth><InputLabel>Luogo</InputLabel><Select value={luogoId || ''} label="Luogo" onChange={e => setLuogoId(e.target.value)} disabled={isReadOnly}><MenuItem value=""><em>Nessuno</em></MenuItem>{(luoghi as GenericItem[]).map(l => <MenuItem key={l.id} value={l.id}>{l.nome}</MenuItem>)}</Select></FormControl>
                                <TextField label="Breve Descrizione" value={descrizioneBreve} onChange={e => setDescrizioneBreve(e.target.value)} fullWidth disabled={isReadOnly} />
                                <TextField label="Lavoro Eseguito" value={lavoroEseguito} onChange={e => setLavoroEseguito(e.target.value)} fullWidth multiline rows={4} disabled={isReadOnly} />
                                <TextField label="Materiali Impiegati" value={materialiImpiegati} onChange={e => setMaterialiImpiegati(e.target.value)} fullWidth multiline rows={2} disabled={isReadOnly} />
                                <Autocomplete multiple options={otherTecnicos} getOptionLabel={o => `${o.cognome} ${o.nome}`} value={selectedTecnicos} onChange={(_, nv) => setAltriTecniciIds(nv.map(v => v.id))} renderInput={params => <TextField {...params} label="Altri Tecnici" />} disabled={isReadOnly} />
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

export default NuovoRapportinoPage;
