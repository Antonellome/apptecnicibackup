
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Paper, Typography, TextField, FormControl, InputLabel, Select, MenuItem,
    Switch, FormControlLabel, Autocomplete, Button, CircularProgress, Grid, Alert, Divider, Box
} from '@mui/material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { it } from 'date-fns/locale';
import { eachDayOfInterval, isBefore, startOfDay, parseISO } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useGlobalData } from '@/contexts/GlobalDataProvider';
import { db as firestoreDb } from '@/firebase';
import { doc, getDoc, addDoc, updateDoc, collection, Timestamp, writeBatch } from 'firebase/firestore';
import { Rapportino, TipoGiornata, Tecnico } from '@/models/definitions';
import { aggiungiAllaCoda, RapportinoInSospeso } from '@/services/offlineSync';
import { useSnackbar } from '@/contexts/SnackbarContext';
import OreLavoroSingoloTecnico from '@/components/Rapportini/OreLavoroSingoloTecnico';

interface DettaglioOreData {
    tecnicoId: string;
    nome: string;
    isManual: boolean;
    oraInizio: string | null;
    oraFine: string | null;
    pausa: number | null;
    ore: number | null;
}

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
    const { showSnackbar } = useSnackbar();
    const isEditMode = Boolean(reportId);
    const loggedInTecnicoId = user?.uid;

    const sortedTipiGiornata = useMemo(() => [...tipiGiornata].sort((a, b) => (a?.nome || '').localeCompare(b?.nome || '')), [tipiGiornata]);
    const sortedNavi = useMemo(() => [...navi].sort((a, b) => (a?.nome || '').localeCompare(b?.nome || '')), [navi]);
    const sortedLuoghi = useMemo(() => [...luoghi].sort((a, b) => (a?.nome || '').localeCompare(b?.nome || '')), [luoghi]);
    const sortedVeicoli = useMemo(() => [...veicoli].sort((a, b) => (a?.targa || '').localeCompare(b?.targa || '')), [veicoli]);
    const sortedTecnici = useMemo(() => [...tecnici].sort((a, b) => (`${a?.cognome || ''} ${a?.nome || ''}`.trim()).localeCompare((`${b?.cognome || ''} ${b?.nome || ''}`.trim()))), [tecnici]);

    const [data, setData] = useState<Date | null>(new Date());
    const [tipoGiornataId, setTipoGiornataId] = useState('');
    const [isLavorativo, setIsLavorativo] = useState(true);
    const [veicoloId, setVeicoloId] = useState<string | null>(null);
    const [naveId, setNaveId] = useState<string | null>(null);
    const [luogoId, setLuogoId] = useState<string | null>(null);
    const [descrizioneBreve, setDescrizioneBreve] = useState('');
    const [lavoroEseguito, setLavoroEseguito] = useState('');
    const [materialiImpiegati, setMaterialiImpiegati] = useState('');
    const [isReadOnly, setIsReadOnly] = useState(false);
    const [lockReason, setLockReason] = useState<string | null>(null);
    const [pageLoading, setPageLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isPeriodo, setIsPeriodo] = useState(false);
    const [dataInizio, setDataInizio] = useState<Date | null>(new Date());
    const [dataFine, setDataFine] = useState<Date | null>(new Date());
    const [dettaglioOre, setDettaglioOre] = useState<DettaglioOreData[]>([]);

    const tecnicoScrivente = useMemo(() => tecnici.find(t => t.id === loggedInTecnicoId), [tecnici, loggedInTecnicoId]);
    const memoizedShowSnackbar = useCallback(showSnackbar, []);

    useEffect(() => {
        if (collectionsLoading || !tecnici.length) return;

        const loadReport = async () => {
            if (!isEditMode || !reportId) {
                 if (tecnicoScrivente) {
                    setDettaglioOre([
                        {
                            tecnicoId: tecnicoScrivente.id,
                            nome: `${tecnicoScrivente.cognome} ${tecnicoScrivente.nome}`.trim(),
                            isManual: false,
                            oraInizio: '07:30',
                            oraFine: '16:30',
                            pausa: 60,
                            ore: 8,
                        },
                    ]);
                }
                setPageLoading(false);
                return;
            }
            
            setPageLoading(true);
            try {
                const reportSnap = await getDoc(doc(firestoreDb, 'rapportini', reportId));
                if (reportSnap.exists()) {
                    const reportData = reportSnap.data() as Rapportino;
                    const reportDate = reportData.data instanceof Timestamp ? reportData.data.toDate() : parseISO(reportData.data as any);
                    
                    setData(reportDate);
                    setTipoGiornataId(reportData.tipoGiornataId || '');
                    const tipo = tipiGiornata.find(t => t.id === reportData.tipoGiornataId);
                    setIsLavorativo(isGiornataLavorativa(tipo));
                    setVeicoloId(reportData.veicoloId || null);
                    setNaveId(reportData.naveId || null);
                    setLuogoId(reportData.luogoId || null);
                    setDescrizioneBreve(reportData.descrizioneBreve || '');
                    setLavoroEseguito(reportData.lavoroEseguito || '');
                    setMaterialiImpiegati(reportData.materialiImpiegati || '');

                    const allTecnicoIds = Array.from(new Set([reportData.tecnicoId, ...(reportData.altriTecniciIds || [])].filter(Boolean) as string[]));
                    const dettagliCaricati: DettaglioOreData[] = allTecnicoIds.map(id => {
                        const tecnico = tecnici.find(t => t.id === id);
                        const dettaglioSalvato = reportData.dettaglioOreTecnici?.find(d => d.tecnicoId === id);

                        return {
                            tecnicoId: id,
                            nome: tecnico ? `${tecnico.cognome} ${tecnico.nome}`.trim() : 'Tecnico non trovato',
                            isManual: reportData.isTrasferta || false,
                            oraInizio: reportData.oraInizio || '07:30',
                            oraFine: reportData.oraFine || '16:30',
                            pausa: reportData.pausa === undefined ? 60 : reportData.pausa,
                            ore: dettaglioSalvato?.ore ?? reportData.oreLavoro ?? 0,
                        };
                    });
                    setDettaglioOre(dettagliCaricati);

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
                    memoizedShowSnackbar("Rapportino non trovato.", "error");
                    navigate('/lista-report');
                }
            } catch (e) {
                console.error("Errore caricamento report: ", e);
                memoizedShowSnackbar("Errore durante il caricamento del report.", "error");
            } finally {
                setPageLoading(false);
            }
        };

        loadReport();
    }, [isEditMode, reportId, navigate, collectionsLoading, tecnici, tipiGiornata, loggedInTecnicoId, memoizedShowSnackbar, tecnicoScrivente]);


    const altriTecniciIds = useMemo(() => dettaglioOre.filter(d => d.tecnicoId !== loggedInTecnicoId).map(d => d.tecnicoId), [dettaglioOre, loggedInTecnicoId]);
    const otherTecnicos = useMemo(() => sortedTecnici.filter(t => t.id !== loggedInTecnicoId), [sortedTecnici, loggedInTecnicoId]);
    const selectedTecnicos = useMemo(() => otherTecnicos.filter(t => altriTecniciIds.includes(t.id)), [altriTecniciIds, otherTecnicos]);

    const handleTipoGiornataChange = (id: string) => { setTipoGiornataId(id); const tipo = tipiGiornata.find(t => t.id === id); setIsLavorativo(isGiornataLavorativa(tipo)); };
    const handleCancel = () => navigate(isEditMode ? '/lista-report' : '/');

    const handleOreUpdate = useCallback((updatedData: DettaglioOreData) => {
        setDettaglioOre(prevDettagli => {
            const newDettagli = prevDettagli.map(d => d.tecnicoId === updatedData.tecnicoId ? updatedData : d);
            if (updatedData.tecnicoId === loggedInTecnicoId) {
                return newDettagli.map(d => d.tecnicoId === loggedInTecnicoId ? d : { ...d, ...updatedData, tecnicoId: d.tecnicoId, nome: d.nome });
            }
            return newDettagli;
        });
    }, [loggedInTecnicoId]);

    const handleAltriTecniciChange = (_: any, nuoviTecniciSelezionati: Tecnico[]) => {
        const scrivente = dettaglioOre.find(d => d.tecnicoId === loggedInTecnicoId);
        if (!scrivente) return;

        const nuoviDettagli = nuoviTecniciSelezionati.map(t => ({
            tecnicoId: t.id,
            nome: `${t.cognome} ${t.nome}`.trim(),
            isManual: scrivente.isManual,
            oraInizio: scrivente.oraInizio,
            oraFine: scrivente.oraFine,
            pausa: scrivente.pausa,
            ore: scrivente.ore
        }));
        setDettaglioOre([scrivente, ...nuoviDettagli]);
    };

    const handleSubmit = async () => {
        if ((!data && !isPeriodo) || !tipoGiornataId || !loggedInTecnicoId) { memoizedShowSnackbar("Compila i campi obbligatori (Data e Tipo Giornata).", "warning"); return; }
        setIsSaving(true);

        const isOnline = navigator.onLine;
        const scriventeDettaglio = dettaglioOre.find(d => d.tecnicoId === loggedInTecnicoId);

        try {
            if (isPeriodo && !isEditMode) {
                 if (!dataInizio || !dataFine || isBefore(startOfDay(dataFine), startOfDay(dataInizio))) { memoizedShowSnackbar('La data di fine non può precedere quella di inizio.', "error"); setIsSaving(false); return; }
                const batch = writeBatch(firestoreDb);
                const days = eachDayOfInterval({ start: dataInizio, end: dataFine });
                days.forEach(day => {
                    const newReportRef = doc(collection(firestoreDb, 'rapportini'));
                    const rapportinoData: Partial<Rapportino> = { nome: 'Rapportino di periodo', tipoGiornataId, data: Timestamp.fromDate(day), tecnicoId: loggedInTecnicoId, presenze: [loggedInTecnicoId], createdAt: Timestamp.now(), oreLavoro: 0 };
                    batch.set(newReportRef, rapportinoData);
                });
                await batch.commit();
                memoizedShowSnackbar(`Salvataggio completato. Creati ${days.length} rapportini di assenza.`, "success");

            } else { 
                const presenze = dettaglioOre.map(d => d.tecnicoId);
                const dettaglioOreTecniciToSave = dettaglioOre.map(d => ({ tecnicoId: d.tecnicoId, ore: d.ore || 0 }));
                const oreLavoroTotali = dettaglioOreTecniciToSave.reduce((sum, item) => sum + item.ore, 0);

                let rapportinoData: Partial<Rapportino> = {
                    nome: 'Rapportino giornaliero',
                    data: Timestamp.fromDate(data!),
                    tipoGiornataId,
                    tecnicoId: loggedInTecnicoId,
                    presenze,
                };

                if (isLavorativo) {
                    rapportinoData = {
                        ...rapportinoData,
                        isTrasferta: scriventeDettaglio?.isManual || false, 
                        oraInizio: scriventeDettaglio?.isManual ? null : scriventeDettaglio?.oraInizio,
                        oraFine: scriventeDettaglio?.isManual ? null : scriventeDettaglio?.oraFine,
                        pausa: scriventeDettaglio?.isManual ? null : scriventeDettaglio?.pausa,
                        oreLavoro: oreLavoroTotali,
                        dettaglioOreTecnici: dettaglioOreTecniciToSave,
                        altriTecniciIds: dettaglioOre.filter(d => d.tecnicoId !== loggedInTecnicoId).map(d => d.tecnicoId),
                        veicoloId,
                        naveId,
                        luogoId,
                        descrizioneBreve,
                        lavoroEseguito,
                        materialiImpiegati,
                    };
                } else {
                    rapportinoData = { ...rapportinoData, oreLavoro: 0, isTrasferta: false, oraInizio: null, oraFine: null, pausa: null, veicoloId: null, naveId: null, luogoId: null, descrizioneBreve: '', lavoroEseguito: '', materialiImpiegati: '', altriTecniciIds: [], dettaglioOreTecnici: [] };
                }

                if (isOnline) {
                    if (isEditMode) {
                        await updateDoc(doc(firestoreDb, 'rapportini', reportId!), { ...rapportinoData, updatedAt: Timestamp.now() });
                        memoizedShowSnackbar("Rapportino aggiornato con successo!", "success");
                    } else {
                        await addDoc(collection(firestoreDb, 'rapportini'), { ...rapportinoData, createdAt: Timestamp.now() });
                        memoizedShowSnackbar("Rapportino creato con successo!", "success");
                    }
                } else {
                    if (isEditMode) {
                        memoizedShowSnackbar("La modifica dei report non è disponibile offline.", "warning");
                        setIsSaving(false);
                        return;
                    }
                    await aggiungiAllaCoda({ ...rapportinoData, data: data! } as Omit<RapportinoInSospeso, 'localId'>);
                    memoizedShowSnackbar("Sei offline. Il rapportino è stato salvato localmente e sarà inviato più tardi.", "info");
                }
                navigate('/lista-report');
            }
        } catch (error) {
            console.error("Errore salvataggio: ", error);
            memoizedShowSnackbar("Errore durante il salvataggio.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    if (pageLoading || collectionsLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress /></Box>;

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
                                <Grid size={{ xs: 12, sm: 6 }}><DatePicker label="Data Inizio" value={dataInizio} onChange={setDataInizio} slotProps={{ textField: { fullWidth: true, required: true } }} /></Grid>
                                <Grid size={{ xs: 12, sm: 6 }}><DatePicker label="Data Fine" value={dataFine} onChange={setDataFine} slotProps={{ textField: { fullWidth: true, required: true } }} /></Grid>
                            </Grid>
                        ) : ( <DatePicker label="Data" value={data} onChange={setData} disabled={isReadOnly || isSaving} slotProps={{ textField: { fullWidth: true, required: true } }} /> )}
                        <TextField label="Tecnico Responsabile" value={user?.email || '...'} fullWidth disabled />
                        <FormControl fullWidth required>
                            <InputLabel>Tipo Giornata</InputLabel>
                            <Select value={tipoGiornataId} label="Tipo Giornata" onChange={e => handleTipoGiornataChange(e.target.value)} disabled={isReadOnly || isSaving}>
                                {sortedTipiGiornata.map(t => (<MenuItem key={t.id} value={t.id}><span>{t.nome}</span></MenuItem>))}
                            </Select>
                        </FormControl>
                        {isLavorativo && !isPeriodo && (
                            <>
                                <Divider sx={{ my: 1 }}><Typography variant="overline">Dettaglio Ore Lavoro</Typography></Divider>
                                {dettaglioOre.map((dett) => (
                                    <OreLavoroSingoloTecnico
                                        key={dett.tecnicoId}
                                        datiOre={dett}
                                        onUpdate={handleOreUpdate}
                                        isReadOnly={isReadOnly}
                                        isScrivente={dett.tecnicoId === loggedInTecnicoId}
                                    />
                                ))}
                                <Autocomplete
                                    multiple
                                    options={otherTecnicos}
                                    getOptionLabel={o => `${o.cognome} ${o.nome}`}
                                    value={selectedTecnicos}
                                    onChange={handleAltriTecniciChange}
                                    renderInput={params => <TextField {...params} label="Altri Tecnici Presenti" />}
                                    disabled={isReadOnly}
                                />
                                <Divider sx={{ my: 1 }}><Typography variant="overline">Dettagli Intervento</Typography></Divider>
                                <FormControl fullWidth><InputLabel>Nave</InputLabel><Select value={naveId || ''} label="Nave" onChange={e => setNaveId(e.target.value)} disabled={isReadOnly}><MenuItem value=""><em>Nessuna</em></MenuItem>{sortedNavi.map(n => <MenuItem key={n.id} value={n.id}>{n.nome}</MenuItem>)}</Select></FormControl>
                                <FormControl fullWidth><InputLabel>Luogo</InputLabel><Select value={luogoId || ''} label="Luogo" onChange={e => setLuogoId(e.target.value)} disabled={isReadOnly}><MenuItem value=""><em>Nessuno</em></MenuItem>{sortedLuoghi.map(l => <MenuItem key={l.id} value={l.id}>{l.nome}</MenuItem>)}</Select></FormControl>
                                <FormControl fullWidth><InputLabel>Veicolo</InputLabel><Select value={veicoloId || ''} label="Veicolo" onChange={e => setVeicoloId(e.target.value)} disabled={isReadOnly}><MenuItem value=""><em>Nessuno</em></MenuItem>{sortedVeicoli.map(v => <MenuItem key={v.id} value={v.id}>{`${v.targa || 'N/A'} - ${v.nome}`}</MenuItem>)}</Select></FormControl>
                                <TextField label="Breve Descrizione" value={descrizioneBreve} onChange={e => setDescrizioneBreve(e.target.value)} fullWidth disabled={isReadOnly} />
                                <TextField label="Materiali Impiegati" value={materialiImpiegati} onChange={e => setMaterialiImpiegati(e.target.value)} fullWidth multiline rows={2} disabled={isReadOnly} />
                                <TextField label="Lavoro Eseguito" value={lavoroEseguito} onChange={e => setLavoroEseguito(e.target.value)} fullWidth multiline rows={4} disabled={isReadOnly} />
                            </>
                        )}
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
