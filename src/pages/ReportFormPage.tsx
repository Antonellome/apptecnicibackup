import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Paper, Typography, TextField, FormControl, InputLabel, Select, MenuItem,
    Autocomplete, Button, CircularProgress, Alert, Box, Chip, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Switch, FormControlLabel
} from '@mui/material';
import Grid from '@mui/material/Grid'; // Using Grid V1 for now
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ShareIcon from '@mui/icons-material/Share';
import BorderColorIcon from '@mui/icons-material/BorderColor';
import SignatureCanvas from 'react-signature-canvas';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { it } from 'date-fns/locale';
import { isSameMonth, format, eachDayOfInterval, isBefore, startOfDay } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useLocalData } from '@/hooks/useLocalData';
import { db as firestoreDb } from '@/firebase';
import { doc, getDoc, addDoc, updateDoc, collection, Timestamp, writeBatch } from 'firebase/firestore';
import { Rapportino, TipoGiornata, Tecnico, Veicolo, DettaglioOreData } from '@/models/definitions';
import { useSnackbar } from '@/contexts/SnackbarContext';
import OreLavoroSingoloTecnico from '@/components/Rapportini/OreLavoroSingoloTecnico';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import dayjs from 'dayjs';

const NON_LAVORATIVO_KEYWORDS = ['ferie', 'malattia', 'permesso', 'legge 104'];
const MULTI_DAY_ALLOWED_KEYWORDS = ['ferie', 'malattia'];

const isGiornataLavorativa = (tipo: TipoGiornata | undefined): boolean => {
    if (!tipo || !tipo.nome) return true;
    return !NON_LAVORATIVO_KEYWORDS.some(keyword => tipo.nome.toLowerCase().includes(keyword));
};

const calculateOre = (dettaglio: Partial<DettaglioOreData>): number => {
    if (dettaglio.isManual) {
        return dettaglio.ore || 0;
    }
    const inizio = dayjs(`1970-01-01T${dettaglio.oraInizio || '00:00'}`);
    const fine = dayjs(`1970-01-01T${dettaglio.oraFine || '00:00'}`);
    if (fine.isAfter(inizio)) {
        const diff = fine.diff(inizio, 'minute');
        const oreCalcolate = (diff - (dettaglio.pausa || 0)) / 60;
        return Math.max(0, parseFloat(oreCalcolate.toFixed(2)));
    }
    return 0;
};

const createInitialDettaglio = (
    tecnicoId: string, 
    nome: string, 
    baseDetail?: DettaglioOreData
): DettaglioOreData => {
    if (baseDetail) {
        return {
            ...baseDetail,
            tecnicoId,
            nome,
        };
    }
    const defaultDetail = {
        tecnicoId,
        nome,
        isManual: false,
        oraInizio: '07:30',
        oraFine: '16:30',
        pausa: 60,
        ore: 8,
    };
    defaultDetail.ore = calculateOre(defaultDetail);
    return defaultDetail;
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <Paper variant="outlined" sx={{ p: 2, mt: 3, borderLeft: '4px solid', borderColor: 'primary.main' }}>
        <Typography variant="h6" gutterBottom component="div" sx={{ fontWeight: 'bold', color: 'primary.dark' }}>
            {title}
        </Typography>
        <Grid container spacing={3}>
            {children}
        </Grid>
    </Paper>
);

const ReportFormPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { reportId } = useParams<{ reportId: string }>();
    const { data: masterData, loading: collectionsLoading } = useLocalData();
    const { tipiGiornata = [], tecnici = [], veicoli = [], navi = [], luoghi = [] } = masterData || {};
    const { showSnackbar } = useSnackbar();
    const isEditMode = Boolean(reportId);
    const loggedInTecnicoId = user?.uid;

    const tecnicoScrivente = useMemo(() => tecnici.find(t => t.id === loggedInTecnicoId), [tecnici, loggedInTecnicoId]);

    const [dataInizio, setDataInizio] = useState<Date | null>(new Date());
    const [dataFine, setDataFine] = useState<Date | null>(new Date());
    const [isMultiDay, setIsMultiDay] = useState(false);

    const [dettaglioOre, setDettaglioOre] = useState<DettaglioOreData[]>(() => {
        if (!isEditMode && loggedInTecnicoId) {
            return [createInitialDettaglio(loggedInTecnicoId, 'Caricamento...')];
        }
        return [];
    });

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
    const [isSharing, setIsSharing] = useState(false);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTecnico, setEditingTecnico] = useState<DettaglioOreData | null>(null);
    const [tempDettaglioOre, setTempDettaglioOre] = useState<DettaglioOreData | null>(null);

    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
    const [firmaFirmatarioNome, setFirmaFirmatarioNome] = useState('');
    const [firmaFirmatarioSocieta, setFirmaFirmatarioSocieta] = useState('');
    const [firmaVettoriale, setFirmaVettoriale] = useState<string | null>(null);
    const sigCanvas = useRef<SignatureCanvas>(null);

    const getVeicoloLabel = useCallback((veicolo: Veicolo | undefined) => {
        if (!veicolo) return '';
        return `${veicolo.marca || ''} ${veicolo.modello || ''} - ${veicolo.targa || 'N/A'}`.trim();
    }, []);

    const sortedVeicoli = useMemo(() =>
        [...veicoli].sort((a, b) => getVeicoloLabel(a).localeCompare(getVeicoloLabel(b))),
      [veicoli, getVeicoloLabel]
    );

    const sortedNavi = useMemo(() =>
        [...navi].sort((a, b) => (a?.nome || '').localeCompare(b?.nome || '')),
      [navi]
    );

    const sortedLuoghi = useMemo(() =>
        [...luoghi].sort((a, b) => (a?.nome || '').localeCompare(b?.nome || '')),
      [luoghi]
    );

    const sortedTecnici = useMemo(() =>
        [...tecnici].sort((a, b) => {
            const cognomeA = a?.cognome || '';
            const cognomeB = b?.cognome || '';
            const nomeA = a?.nome || '';
            const nomeB = b?.nome || '';
            const cognomeCompare = cognomeA.localeCompare(cognomeB);
            if (cognomeCompare !== 0) return cognomeCompare;
            return nomeA.localeCompare(nomeB);
        }),
      [tecnici]
    );
    
    const sortedTipiGiornata = useMemo(() =>
        [...tipiGiornata].sort((a, b) => (a?.nome || '').localeCompare(b?.nome || '')),
      [tipiGiornata]
    );

    const formRef = useRef<HTMLDivElement>(null);
    const memoizedShowSnackbar = useCallback(showSnackbar, []);

    const otherTecnicos = useMemo(() => sortedTecnici.filter(t => t.id !== loggedInTecnicoId), [sortedTecnici, loggedInTecnicoId]);
    const altriTecniciIds = useMemo(() => dettaglioOre.filter(d => d.tecnicoId !== loggedInTecnicoId).map(d => d.tecnicoId), [dettaglioOre, loggedInTecnicoId]);
    const selectedTecnicos = useMemo(() => otherTecnicos.filter(t => altriTecniciIds.includes(t.id)), [altriTecniciIds, otherTecnicos]);

    const tipiGiornataFiltrati = useMemo(() => {
        const sourceList = sortedTipiGiornata;
        if (isMultiDay) {
            return sourceList.filter(t => MULTI_DAY_ALLOWED_KEYWORDS.some(keyword => (t?.nome || '').toLowerCase().includes(keyword)));
        }
        return sourceList;
    }, [isMultiDay, sortedTipiGiornata]);

    useEffect(() => {
        const loadData = async () => {
             if (isEditMode && reportId) {
                setPageLoading(true);
                try {
                    const reportRef = doc(firestoreDb, 'rapportini', reportId);
                    const reportSnap = await getDoc(reportRef);
                    if (reportSnap.exists()) {
                        const report = { id: reportSnap.id, ...reportSnap.data() } as Rapportino;
                        setDataInizio(report.data.toDate());
                        setTipoGiornataId(report.tipoGiornataId);
                        setVeicoloId(report.veicoloId || null);
                        setNaveId(report.naveId || null);
                        setLuogoId(report.luogoId || null);
                        setDescrizioneBreve(report.descrizioneBreve || '');
                        setLavoroEseguito(report.lavoroEseguito || '');
                        setMaterialiImpiegati(report.materialiImpiegati || '');
                        setFirmaFirmatarioNome(report.firmaFirmatarioNome || '');
                        setFirmaFirmatarioSocieta(report.firmaFirmatarioSocieta || '');
                        setFirmaVettoriale(report.firmaVettoriale || null);

                        const tipo = tipiGiornata.find(t => t.id === report.tipoGiornataId);
                        setIsLavorativo(isGiornataLavorativa(tipo));

                        const allTecnicoDetails = (report.dettaglioOreTecnici || []).map(savedDetail => {
                            const tecnicoInfo = tecnici.find(t => t.id === savedDetail.tecnicoId);
                            const detailWithDefaults = {
                                isManual: (savedDetail.isManual ?? report.isTrasferta) || false,
                                oraInizio: savedDetail.oraInizio || report.oraInizio || '07:30',
                                oraFine: savedDetail.oraFine || report.oraFine || '16:30',
                                pausa: savedDetail.pausa ?? report.pausa ?? 60,
                                ore: savedDetail.ore,
                                tecnicoId: savedDetail.tecnicoId,
                                nome: tecnicoInfo ? `${tecnicoInfo.cognome} ${tecnicoInfo.nome}`.trim() : 'Sconosciuto',
                            }
                            detailWithDefaults.ore = calculateOre(detailWithDefaults);
                            return detailWithDefaults;
                        });
                        setDettaglioOre(allTecnicoDetails);

                        const reportDate = report.data.toDate();
                        if (!isSameMonth(reportDate, new Date()) && !user?.isAdmin) {
                            setIsReadOnly(true);
                            setLockReason("Questo rapportino è bloccato perché appartiene a un mese precedente e non può più essere modificato.");
                        }
                    } else {
                        memoizedShowSnackbar("Rapportino non trovato.", "error");
                        navigate('/lista-report');
                    }
                } catch (error) {
                    console.error("Errore caricamento dati rapportino: ", error);
                    memoizedShowSnackbar("Errore nel caricamento del rapportino.", "error");
                }
            } else if (tecnicoScrivente) {
                setDettaglioOre(prev => prev.map(d => 
                    d.tecnicoId === loggedInTecnicoId 
                    ? { ...d, nome: `${tecnicoScrivente.cognome} ${tecnicoScrivente.nome}`.trim() } 
                    : d
                ));
            }
            setPageLoading(false);
        };

        if (!collectionsLoading) {
            loadData();
        }
    }, [reportId, isEditMode, collectionsLoading, user?.isAdmin, memoizedShowSnackbar, navigate, tecnici, tipiGiornata, loggedInTecnicoId, tecnicoScrivente]);

    const handleMultiDayToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
        const checked = event.target.checked;
        setIsMultiDay(checked);
        if (checked) {
            const currentTipo = tipiGiornata.find(t => t.id === tipoGiornataId);
            if (currentTipo && !MULTI_DAY_ALLOWED_KEYWORDS.some(k => (currentTipo?.nome || '').toLowerCase().includes(k))) {
                setTipoGiornataId('');
            }
            setIsLavorativo(false);
        } else {
             const currentTipo = tipiGiornata.find(t => t.id === tipoGiornataId);
             setIsLavorativo(isGiornataLavorativa(currentTipo));
        }
    };

    const handleOpenModal = (tecnico: DettaglioOreData) => {
        setEditingTecnico(tecnico);
        setTempDettaglioOre(tecnico);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => setIsModalOpen(false);

    const handleSaveFromModal = () => {
        if (tempDettaglioOre) {
            handleOreUpdate(tempDettaglioOre);
        }
        handleCloseModal();
    };

    const handleTipoGiornataChange = (id: string) => {
        setTipoGiornataId(id);
        const tipo = tipiGiornata.find(t => t.id === id);
        if (!isMultiDay) {
            setIsLavorativo(isGiornataLavorativa(tipo));
        }
    };
    const handleCancel = () => navigate(isEditMode ? '/lista-report' : '/');

    const handleOreUpdate = useCallback((updatedData: DettaglioOreData) => {
        const newData = { ...updatedData, ore: calculateOre(updatedData) };
        setDettaglioOre(prevDettagli =>
            prevDettagli.map(d =>
                d.tecnicoId === newData.tecnicoId ? newData : d
            )
        );
    }, []);

    const handleScriventeOreUpdate = (updatedData: DettaglioOreData) => {
        const oldScriventeData = dettaglioOre.find(d => d.tecnicoId === updatedData.tecnicoId);
        const newScriventeData = { ...updatedData, ore: calculateOre(updatedData) };
        
        const modeChanged = oldScriventeData?.isManual !== newScriventeData.isManual;

        setDettaglioOre(prevDettagli => {
            return prevDettagli.map(d => {
                if (d.tecnicoId === newScriventeData.tecnicoId) {
                    return newScriventeData;
                }
                if (modeChanged) {
                    return {
                        ...d,
                        isManual: newScriventeData.isManual,
                        oraInizio: newScriventeData.oraInizio,
                        oraFine: newScriventeData.oraFine,
                        pausa: newScriventeData.pausa,
                        ore: newScriventeData.ore,
                    };
                }
                return d;
            });
        });
    };

    const handleAltriTecniciChange = (_: React.SyntheticEvent, nuoviTecniciSelezionati: Tecnico[]) => {
        const scrivente = dettaglioOre.find(d => d.tecnicoId === loggedInTecnicoId);
        if (!scrivente) return; 

        const nuoviDettagli = nuoviTecniciSelezionati.map(t => {
            const existingDetail = dettaglioOre.find(d => d.tecnicoId === t.id);
            return existingDetail || createInitialDettaglio(t.id, `${t.cognome} ${t.nome}`.trim(), scrivente);
        });
        setDettaglioOre([scrivente, ...nuoviDettagli]);
    };

    const removeTecnico = (tecnicoIdToRemove: string) => {
        setDettaglioOre(prev => prev.filter(d => d.tecnicoId !== tecnicoIdToRemove));
    };

    const handleSave = async () => {
        if (isMultiDay) {
            await handleMultiDaySave();
        } else {
            const savedId = await performSingleSave();
            if (savedId) navigate('/lista-report');
        }
    };

    const handleMultiDaySave = async () => {
        if (!dataInizio || !dataFine || !tipoGiornataId || !loggedInTecnicoId) {
            showSnackbar("Compila tutti i campi: Dal, Al e Tipo Giornata.", "warning");
            return;
        }
        if (isBefore(startOfDay(dataFine), startOfDay(dataInizio))) {
            showSnackbar("La data 'Al' non può essere precedente alla data 'Dal'.", "error");
            return;
        }

        setIsSaving(true);
        try {
            const days = eachDayOfInterval({ start: dataInizio, end: dataFine });
            const batch = writeBatch(firestoreDb);

            const dettaglioOrePerSalvataggio = dettaglioOre.map(({ nome, ...rest }) => ({
                ...rest,
                ore: 8,
                isManual: true,
                oraInizio: '', oraFine: '', pausa: 0
            }));

            if (dettaglioOrePerSalvataggio.length === 0) {
                 showSnackbar("Nessun tecnico selezionato. Impossibile salvare.", "error");
                 setIsSaving(false);
                 return;
            }

            for (const day of days) {
                const newReportRef = doc(collection(firestoreDb, 'rapportini'));
                const reportData: Omit<Rapportino, 'id'> = {
                    data: Timestamp.fromDate(day),
                    tecnicoId: loggedInTecnicoId,
                    tipoGiornataId,
                    isTrasferta: false,
                    oraInizio: '', oraFine: '', pausa: 0,
                    presenze: dettaglioOre.map(d => d.tecnicoId),
                    dettaglioOreTecnici: dettaglioOrePerSalvataggio,
                    veicoloId: null, naveId: null, luogoId: null, 
                    descrizioneBreve: '', lavoroEseguito: '', materialiImpiegati: '',
                    firmaFirmatarioNome: '', firmaFirmatarioSocieta: '', firmaVettoriale: null,
                    createdAt: Timestamp.now(),
                    updatedAt: Timestamp.now(),
                };
                batch.set(newReportRef, reportData);
            }

            await batch.commit();
            showSnackbar(`${days.length} rapportini per '${tipiGiornata.find(t=>t.id === tipoGiornataId)?.nome}' creati con successo!`, "success");
            navigate('/');

        } catch (error) {
            console.error("Errore durante il salvataggio massivo: ", error);
            showSnackbar("Si è verificato un errore durante la creazione dei rapportini.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const performSingleSave = async (): Promise<string | null> => {
        if (!loggedInTecnicoId || !dataInizio) {
            memoizedShowSnackbar("Errore: Utente non autenticato o data mancante.", "error");
            return null;
        }
        if (!tipoGiornataId) {
            memoizedShowSnackbar("Il campo 'Tipo Giornata' è obbligatorio.", "warning");
            return null;
        }

        const mainTecnicoDetail = dettaglioOre.find(d => d.tecnicoId === loggedInTecnicoId);
        if (!mainTecnicoDetail) {
            memoizedShowSnackbar("Dettaglio ore del tecnico responsabile non trovato.", "error");
            return null;
        }

        const reportDataToSave: Omit<Rapportino, 'id'> & { [key: string]: any } = {
            data: Timestamp.fromDate(dataInizio),
            tecnicoId: loggedInTecnicoId,
            tipoGiornataId,
            isTrasferta: mainTecnicoDetail.isManual,
            oraInizio: mainTecnicoDetail.oraInizio,
            oraFine: mainTecnicoDetail.oraFine,
            pausa: mainTecnicoDetail.pausa,
            dettaglioOreTecnici: dettaglioOre.map(({ nome, ...rest }) => rest),
            presenze: dettaglioOre.map(d => d.tecnicoId),
            veicoloId: veicoloId || null,
            naveId: naveId || null,
            luogoId: luogoId || null,
            descrizioneBreve: descrizioneBreve || '',
            lavoroEseguito: lavoroEseguito || '',
            materialiImpiegati: materialiImpiegati || '',
            firmaFirmatarioNome: firmaFirmatarioNome || '',
            firmaFirmatarioSocieta: firmaFirmatarioSocieta || '',
            firmaVettoriale: firmaVettoriale || null,
            updatedAt: Timestamp.now(),
        };
        
        if (!isEditMode) {
            reportDataToSave.createdAt = Timestamp.now();
        }

        setIsSaving(true);
        try {
            let finalId = reportId;
            if (isEditMode && reportId) {
                await updateDoc(doc(firestoreDb, 'rapportini', reportId), reportDataToSave);
                memoizedShowSnackbar("Rapportino aggiornato con successo!", "success");
            } else {
                const docRef = await addDoc(collection(firestoreDb, 'rapportini'), reportDataToSave);
                finalId = docRef.id;
                memoizedShowSnackbar("Rapportino creato con successo!", "success");
            }
            return finalId || null;
        } catch (error) {
            console.error("Errore durante il salvataggio: ", error);
            memoizedShowSnackbar("Si è verificato un errore durante il salvataggio.", "error");
            return null;
        } finally {
            setIsSaving(false);
        }
    };    

    const handleShare = async () => {
        // ... 
    };
    
    const handleOpenSignatureModal = () => setIsSignatureModalOpen(true);

    if (pageLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress /></Box>;
    
    const scriventeDettaglio = dettaglioOre.find(d => d.tecnicoId === loggedInTecnicoId);
    const disableActions = isSaving || isSharing || isReadOnly;

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={it}>
            <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 900, mx: 'auto' }}>
                <Paper ref={formRef} elevation={3} sx={{ p: { xs: 2, sm: 3 } }}>
                     <Box sx={{ textAlign: 'center', mb: 3, borderBottom: '2px solid', borderColor: 'primary.main', pb: 2 }}>
                        <Typography variant="h4" component="h1" fontWeight="bold">Tecnologie Industriali Navali</Typography>
                        <Typography variant="h6" component="h2">Report Intervento</Typography>
                    </Box>
                    
                    {isReadOnly && lockReason && <Alert severity="warning" sx={{ mb: 2 }}>{lockReason}</Alert>}
                    
                    <Section title="Dati Principali">
                        {!isEditMode && (
                             <Grid size={12}>
                                <FormControlLabel control={<Switch checked={isMultiDay} onChange={handleMultiDayToggle} />} label="Crea per più giorni (solo Ferie/Malattia)" disabled={isEditMode} />
                            </Grid>
                        )}
                        <Grid
                            size={{
                                xs: 12,
                                md: isMultiDay ? 6 : 12
                            }}>
                             <DatePicker label={isMultiDay ? "Dal" : "Data"} value={dataInizio} onChange={setDataInizio} disabled={disableActions} slotProps={{ textField: { fullWidth: true, required: true } }} />
                        </Grid>
                        {isMultiDay && (
                            <Grid
                                size={{
                                    xs: 12,
                                    md: 6
                                }}>
                                <DatePicker label="Al" value={dataFine} onChange={setDataFine} disabled={disableActions} slotProps={{ textField: { fullWidth: true, required: true } }} minDate={dataInizio || undefined} />
                            </Grid>
                        )}
                        <Grid
                            size={{
                                xs: 12,
                                md: 6
                            }}>
                            <TextField label="Tecnico Responsabile" value={scriventeDettaglio?.nome || 'Caricamento...'} fullWidth disabled />
                        </Grid>
                        <Grid
                            size={{
                                xs: 12,
                                md: 6
                            }}>
                           <FormControl fullWidth required disabled={disableActions}>
                                <InputLabel id="tipo-giornata-label">Tipo Giornata</InputLabel>
                                <Select
                                    labelId="tipo-giornata-label"
                                    id="tipo-giornata-select"
                                    value={tipoGiornataId}
                                    label="Tipo Giornata"
                                    onChange={e => handleTipoGiornataChange(e.target.value as string)}
                                >
                                    {tipiGiornataFiltrati.map(t => <MenuItem key={t.id} value={t.id}>{t.nome}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                    </Section>

                    <Section title="Tecnici Coinvolti">
                         {scriventeDettaglio && !isLavorativo && (
                             <Grid size={12}><Typography variant="body2" color="text.secondary">Per giornate non lavorative (Ferie, Malattia, etc.), le ore sono impostate a 8 di default per tutti i tecnici.</Typography></Grid>
                         )}
                         {scriventeDettaglio && isLavorativo && (
                            <Grid size={12}>
                                <OreLavoroSingoloTecnico key={scriventeDettaglio.tecnicoId} datiOre={scriventeDettaglio} onUpdate={handleScriventeOreUpdate} isReadOnly={disableActions} isScrivente={true} />
                            </Grid>
                        )}
                        <Grid size={12}>
                                <Autocomplete
                                multiple
                                options={otherTecnicos}
                                getOptionLabel={(o) => `${o.cognome} ${o.nome}`}
                                value={selectedTecnicos}
                                onChange={handleAltriTecniciChange}
                                renderInput={params => <TextField {...params} label={isLavorativo ? "Aggiungi altri tecnici presenti" : "Aggiungi tecnici per il periodo"} />}
                                disabled={disableActions}
                            />
                        </Grid>

                        {dettaglioOre.filter(d => d.tecnicoId !== loggedInTecnicoId).map(dett => (
                                <Grid key={dett.tecnicoId} size={12}>
                                <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                                    <Box><Typography variant="body1" fontWeight="500">{dett.nome}</Typography>
                                        {isLavorativo ? <Chip label={dett.isManual ? `Manuale: ${dett.ore || 0} ore` : `Orario: ${dett.oraInizio || 'N/A'}-${dett.oraFine || 'N/A'} (${(dett.ore || 0).toFixed(2)}h)`} size="small" /> : <Chip label={`8 ore di default`} size="small" />}
                                    </Box>
                                    <Box>
                                        {isLavorativo && <IconButton size="small" onClick={() => handleOpenModal(dett)} disabled={disableActions}><EditIcon /></IconButton>}
                                        <IconButton size="small" onClick={() => removeTecnico(dett.tecnicoId)} disabled={disableActions}><DeleteIcon /></IconButton>
                                    </Box>
                                </Paper>
                            </Grid>
                        ))}
                    </Section>

                    {isLavorativo && (
                        <>
                            <Section title="Dettagli Intervento">
                                <Grid
                                    size={{
                                        xs: 12,
                                        md: 6
                                    }}>
                                    <FormControl fullWidth disabled={disableActions}>
                                        <InputLabel id="nave-label">Nave</InputLabel>
                                        <Select
                                            labelId="nave-label"
                                            id="nave-select"
                                            value={naveId || ''}
                                            label="Nave"
                                            onChange={e => setNaveId(e.target.value as string)}
                                        >
                                            <MenuItem value=""><em>Nessuna</em></MenuItem>
                                            {sortedNavi.map(n => <MenuItem key={n.id} value={n.id}>{n.nome}</MenuItem>)}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid
                                    size={{
                                        xs: 12,
                                        md: 6
                                    }}>
                                    <FormControl fullWidth disabled={disableActions}>
                                        <InputLabel id="luogo-label">Luogo</InputLabel>
                                        <Select
                                            labelId="luogo-label"
                                            id="luogo-select"
                                            value={luogoId || ''}
                                            label="Luogo"
                                            onChange={e => setLuogoId(e.target.value as string)}
                                        >
                                            <MenuItem value=""><em>Nessuno</em></MenuItem>
                                            {sortedLuoghi.map(l => <MenuItem key={l.id} value={l.id}>{l.nome}</MenuItem>)}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid size={12}>
                                    <FormControl fullWidth disabled={disableActions}>
                                        <InputLabel id="veicolo-label">Veicolo</InputLabel>
                                        <Select
                                            labelId="veicolo-label"
                                            id="veicolo-select"
                                            value={veicoloId || ''}
                                            label="Veicolo"
                                            onChange={e => setVeicoloId(e.target.value as string)}
                                            renderValue={(selectedId) => getVeicoloLabel(sortedVeicoli.find(v => v.id === selectedId))}
                                        >
                                            <MenuItem value=""><em>Nessuno</em></MenuItem>
                                            {sortedVeicoli.map(v => <MenuItem key={v.id} value={v.id}>{getVeicoloLabel(v)}</MenuItem>)}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid size={12}><TextField label="Breve Descrizione Lavoro" value={descrizioneBreve} onChange={e => setDescrizioneBreve(e.target.value)} fullWidth disabled={disableActions} /></Grid>
                                <Grid size={12}><TextField label="Lavoro Eseguito" value={lavoroEseguito} onChange={e => setLavoroEseguito(e.target.value)} fullWidth multiline rows={4} disabled={disableActions} /></Grid>
                                <Grid size={12}><TextField label="Materiali Impiegati" value={materialiImpiegati} onChange={e => setMaterialiImpiegati(e.target.value)} fullWidth multiline rows={2} disabled={disableActions} /></Grid>
                            </Section>

                            <Section title="Firma Cliente">
                                <Grid size={12}>
                                    {firmaVettoriale ? (
                                        <Box sx={{border: '1px dashed grey', borderRadius: 1, p: 2, textAlign: 'center'}}>
                                            <Typography variant="body2" gutterBottom>Firmato da: <strong>{firmaFirmatarioNome || 'N/D'}</strong> ({firmaFirmatarioSocieta || 'N/D'})</Typography>
                                            <img src={firmaVettoriale} alt="Firma" style={{maxWidth: '200px', height: 'auto', border: '1px solid #eee', margin: 'auto'}}/>
                                            <br />
                                            <Button onClick={handleOpenSignatureModal} startIcon={<EditIcon/>} sx={{mt: 1}} disabled={disableActions}>Modifica Firma</Button>
                                        </Box>
                                    ) : (
                                        <Button variant="outlined" startIcon={<BorderColorIcon />} onClick={handleOpenSignatureModal} disabled={disableActions} fullWidth>Aggiungi Firma Cliente</Button>
                                    )}
                                </Grid>
                            </Section>
                        </>
                    )}

                    <Box id="action-buttons" sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4 }}>
                        <Button variant="outlined" onClick={handleCancel} disabled={isSaving || isSharing}>Annulla</Button>
                        <Button variant="contained" onClick={handleSave} disabled={disableActions}>{isSaving ? <CircularProgress size={24} /> : (isEditMode ? 'Aggiorna' : 'Salva')}</Button>
                        {isEditMode && (
                            <Button variant="contained" color="secondary" onClick={handleShare} disabled={disableActions} startIcon={isSharing ? <CircularProgress size={24} /> : <ShareIcon />}>Aggiorna e Condividi</Button>
                        )}
                    </Box>
                </Paper>
            </Box>
            <Dialog open={isModalOpen} onClose={handleCloseModal} maxWidth="sm" fullWidth>
                <DialogTitle>Modifica orario di {editingTecnico?.nome}</DialogTitle>
                <DialogContent>{tempDettaglioOre && <Box sx={{pt: 2}}><OreLavoroSingoloTecnico datiOre={tempDettaglioOre} onUpdate={setTempDettaglioOre} isReadOnly={false} /></Box>}</DialogContent>
                <DialogActions><Button onClick={handleCloseModal}>Annulla</Button><Button onClick={handleSaveFromModal} variant="contained">Salva Orario</Button></DialogActions>
            </Dialog>
            <Dialog open={isSignatureModalOpen} onClose={() => setIsSignatureModalOpen(false)} maxWidth="sm" fullWidth>
               <DialogTitle>Firma del Cliente</DialogTitle>
               <DialogContent>
                   <TextField label="Nome e Cognome Firmatario" value={firmaFirmatarioNome} onChange={(e) => setFirmaFirmatarioNome(e.target.value)} fullWidth margin="normal" />
                   <TextField label="Società" value={firmaFirmatarioSocieta} onChange={(e) => setFirmaFirmatarioSocieta(e.target.value)} fullWidth margin="normal" />
                   <Box sx={{ border: '1px solid black', mt: 2, width: '100%', height: 200 }}><SignatureCanvas ref={sigCanvas} penColor='black' canvasProps={{style: {width: '100%', height: '100%'}, className: 'sigCanvas'}} /></Box>
               </DialogContent>
               <DialogActions><Button onClick={() => sigCanvas.current?.clear()}>Pulisci</Button><Button onClick={() => setIsSignatureModalOpen(false)}>Annulla</Button><Button onClick={() => { if (sigCanvas.current) { setFirmaVettoriale(sigCanvas.current.getTrimmedCanvas().toDataURL('image/png')); } setIsSignatureModalOpen(false); }}>Salva Firma</Button></DialogActions>
           </Dialog>
        </LocalizationProvider>
    );
};
export default ReportFormPage;
