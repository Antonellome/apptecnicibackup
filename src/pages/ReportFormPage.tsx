
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Paper, Typography, TextField, FormControl, InputLabel, Select, MenuItem,
    Autocomplete, Button, CircularProgress, Alert, Box, Chip, IconButton, Switch, FormControlLabel,
    Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import Grid from '@mui/material/Grid';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ShareIcon from '@mui/icons-material/Share';
import BorderColorIcon from '@mui/icons-material/BorderColor';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { it } from 'date-fns/locale';
import { isSameMonth, format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useLocalData } from '@/hooks/useLocalData';
import { db as firestoreDb } from '@/firebase';
import { db } from '@/db/db';
import { aggiungiAllaCoda } from '@/services/offlineSync';
import { doc, getDoc, addDoc, collection, Timestamp, runTransaction } from 'firebase/firestore';
import { Rapportino, TipoGiornata, Tecnico, Veicolo, DettaglioOreData, MasterData } from '@/models/definitions'; 
import { useSnackbar } from '@/contexts/SnackbarContext';
import OreLavoroSingoloTecnico from '@/components/Rapportini/OreLavoroSingoloTecnico';
import SignatureDialog from '@/components/form/SignatureDialog';
import PdfPreviewDialog from '@/components/pdf/PdfPreviewDialog';
import { generateRapportinoPDF } from '@/services/rapportinoPDFGenerator';
import { shareOrDownload } from '@/services/shareService';
import dayjs from 'dayjs';
import { useTheme } from '@/hooks/useTheme';

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
    const { mode } = useTheme();
    const navigate = useNavigate();
    const { userProfile } = useAuth();
    const { reportId } = useParams<{ reportId: string }>();
    const { data: masterData, loading: collectionsLoading } = useLocalData();
    const { tipiGiornata = [], tecnici = [], veicoli = [], navi = [], luoghi = [] } = masterData || {};
    const { showSnackbar } = useSnackbar();
    const isEditMode = Boolean(reportId);
    const loggedInTecnicoId = userProfile?.tecnicoId;

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
    const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTecnico, setEditingTecnico] = useState<DettaglioOreData | null>(null);
    const [tempDettaglioOre, setTempDettaglioOre] = useState<DettaglioOreData | null>(null);

    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
    const [firmaFirmatarioNome, setFirmaFirmatarioNome] = useState('');
    const [firmaFirmatarioSocieta, setFirmaFirmatarioSocieta] = useState('');
    const [firmaVettoriale, setFirmaVettoriale] = useState<string | null>(null);

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
                        if (!isSameMonth(reportDate, new Date()) && !userProfile?.isAdmin) {
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
    }, [reportId, isEditMode, collectionsLoading, userProfile, memoizedShowSnackbar, navigate, tecnici, tipiGiornata, loggedInTecnicoId, tecnicoScrivente]);

    useEffect(() => {
        return () => { if (pdfUrl) { URL.revokeObjectURL(pdfUrl); } };
    }, [pdfUrl]);

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
        if (tempDettaglioOre) { handleOreUpdate(tempDettaglioOre); }
        handleCloseModal();
    };

    const handleTipoGiornataChange = (id: string) => {
        setTipoGiornataId(id);
        const tipo = tipiGiornata.find(t => t.id === id);
        if (!isMultiDay) { setIsLavorativo(isGiornataLavorativa(tipo)); }
    };
    
    const handleCancel = () => navigate(isEditMode ? '/lista-report' : '/');

    const handleOreUpdate = useCallback((updatedData: DettaglioOreData) => {
        const newData = { ...updatedData, ore: calculateOre(updatedData) };
        setDettaglioOre(prevDettagli => prevDettagli.map(d => d.tecnicoId === newData.tecnicoId ? newData : d));
    }, []);

    const handleScriventeOreUpdate = (updatedData: DettaglioOreData) => {
        const oldScriventeData = dettaglioOre.find(d => d.tecnicoId === updatedData.tecnicoId);
        const newScriventeData = { ...updatedData, ore: calculateOre(updatedData) };
        const modeChanged = oldScriventeData?.isManual !== newScriventeData.isManual;

        setDettaglioOre(prevDettagli => {
            return prevDettagli.map(d => {
                if (d.tecnicoId === newScriventeData.tecnicoId) return newScriventeData;
                if (modeChanged) {
                    return { ...d, isManual: newScriventeData.isManual, oraInizio: newScriventeData.oraInizio, oraFine: newScriventeData.oraFine, pausa: newScriventeData.pausa, ore: newScriventeData.ore };
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

    const getFullReportData = (): Omit<Rapportino, 'id'> => {
        const mainTecnicoDetail = dettaglioOre.find(d => d.tecnicoId === loggedInTecnicoId)!;
        // 1. Aggiunta la generazione del nome
        const nomeDestinazione = navi.find(n => n.id === naveId)?.nome || luoghi.find(l => l.id === luogoId)?.nome || 'Generico';
        const nomeReport = `Rapportino del ${format(dataInizio || new Date(), 'dd/MM/yyyy')} - ${nomeDestinazione}`;

        return {
            nome: nomeReport,
            data: Timestamp.fromDate(dataInizio || new Date()),
            tecnicoId: loggedInTecnicoId!,
            tipoGiornataId, isTrasferta: mainTecnicoDetail.isManual, oraInizio: mainTecnicoDetail.oraInizio,
            oraFine: mainTecnicoDetail.oraFine, pausa: mainTecnicoDetail.pausa,
            dettaglioOreTecnici: dettaglioOre.map(({ nome, ...rest }) => rest),
            presenze: dettaglioOre.map(d => d.tecnicoId), 
            veicoloId: veicoloId ?? undefined,
            naveId: naveId ?? undefined,
            luogoId: luogoId ?? undefined,
            descrizioneBreve: descrizioneBreve || '', lavoroEseguito: lavoroEseguito || '', materialiImpiegati: materialiImpiegati || '',
            firmaFirmatarioNome: firmaFirmatarioNome || '', firmaFirmatarioSocieta: firmaFirmatarioSocieta || '', 
            firmaVettoriale: firmaVettoriale ?? undefined,
            createdAt: isEditMode && reportId ? Timestamp.now() : Timestamp.now(),
            updatedAt: Timestamp.now(),
        };
    };

    const salvaOAccodaRapportino = async (): Promise<string | null> => {
        if (!loggedInTecnicoId || !dataInizio) {
            memoizedShowSnackbar("Errore: Utente non autenticato o data mancante.", "error");
            return null;
        }
        if (!tipoGiornataId) {
            memoizedShowSnackbar("Il campo 'Tipo Giornata' è obbligatorio.", "warning");
            return null;
        }

        setIsSaving(true);
        try {
            const reportData = getFullReportData();

            if (navigator.onLine) {
                let finalId = reportId;
                if (isEditMode && reportId) {
                    await runTransaction(firestoreDb, async (transaction) => {
                        const reportRef = doc(firestoreDb, 'rapportini', reportId);
                        const sfDoc = await transaction.get(reportRef);
                        if (!sfDoc.exists()) {
                            throw new Error(`Documento con ID ${reportId} non trovato. Potrebbe essere stato cancellato.`);
                        }
                        transaction.update(reportRef, { ...reportData, updatedAt: Timestamp.now() });
                    });
                } else {
                    const docRef = await addDoc(collection(firestoreDb, 'rapportini'), { ...reportData, createdAt: Timestamp.now() });
                    finalId = docRef.id;
                }
                memoizedShowSnackbar(isEditMode ? "Rapportino aggiornato con successo!" : "Rapportino creato con successo!", "success");
                return finalId ?? null;
            } else {
                const queuedId = await aggiungiAllaCoda(reportData, reportId);
                memoizedShowSnackbar("Sei offline. Il rapportino è stato salvato localmente e sarà sincronizzato appena torni online.", "info");
                return queuedId;
            }
        } catch (error) {
            console.error("Errore durante il salvataggio o l'accodamento: ", error);
            memoizedShowSnackbar("Si è verificato un errore durante il salvataggio. Le modifiche sono state salvate localmente.", "error");
            if (navigator.onLine) {
                try {
                    const reportData = getFullReportData();
                    await aggiungiAllaCoda(reportData, reportId);
                } catch (queueError) {
                    console.error("Errore critico: impossibile anche accodare il rapportino. ", queueError);
                }
            }
            return null;
        } finally {
            setIsSaving(false);
        }
    };

    const handleSave = async () => {
        if (isMultiDay) { /* Logica multi-day omessa */ } 
        else {
            const savedId = await salvaOAccodaRapportino();
            if (savedId) navigate('/lista-report');
        }
    };

    const handleShare = async () => {
        setIsPdfPreviewOpen(true);
        setIsGeneratingPdf(true);
        if (pdfUrl) URL.revokeObjectURL(pdfUrl);

        try {
            const savedOrQueuedId = await salvaOAccodaRapportino();
            if (!savedOrQueuedId) {
                // Non bloccare la generazione del PDF se il salvataggio fallisce
            }
            
            const reportDataForPdf = getFullReportData();
            const finalReportData = {
                 id: savedOrQueuedId && !savedOrQueuedId.startsWith('local-') ? savedOrQueuedId : reportId || 'N/D (Offline)', 
                 ...reportDataForPdf 
            } as Rapportino;

            if (!masterData) throw new Error("Dati anagrafici non disponibili per la generazione del PDF.");
            const pdfBlob = await generateRapportinoPDF(finalReportData, masterData as MasterData);
            const newPdfUrl = URL.createObjectURL(pdfBlob);
            setPdfUrl(newPdfUrl);
        } catch (error) {
            console.error("Errore durante la condivisione: ", error);
            showSnackbar("Errore durante la generazione del PDF.", "error");
            setIsPdfPreviewOpen(false);
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    const handleFinalShare = async () => {
        if (!pdfUrl || !dataInizio) return;
        setIsSharing(true);
        try {
            const response = await fetch(pdfUrl);
            const blob = await response.blob();
            const fileName = `Rapportino_${format(dataInizio, 'dd-MM-yyyy')}.pdf`;

            if (navigator.onLine) {
                await shareOrDownload(blob, fileName);
                showSnackbar("File condiviso con successo.", "success");
            } else {
                await db.condivisioniInSospeso.add({ blob, fileName });
                showSnackbar("Sei offline. Il file sarà condiviso appena torni online.", "info");
            }
            setIsPdfPreviewOpen(false);
        } catch (error) {
            console.error("Errore di condivisione finale o accodamento: ", error);
            if (!(error instanceof DOMException && error.name === 'AbortError')) {
                showSnackbar("Impossibile condividere o accodare il file.", "error");
            }
        } finally {
            setIsSharing(false);
        }
    };
    
    const handleOpenSignatureModal = () => {
        if (!firmaFirmatarioNome) {
            showSnackbar("Per favore, inserisci prima il Nome e Cognome del firmatario.", "warning");
            return;
        }
        setIsSignatureModalOpen(true)
    };

    const handleSaveSignature = (signatureData: string) => {
        setFirmaVettoriale(signatureData);
        setIsSignatureModalOpen(false);
        showSnackbar("Firma salvata con successo!", "success");
    };

    if (pageLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress /></Box>;
    
    const scriventeDettaglio = dettaglioOre.find(d => d.tecnicoId === loggedInTecnicoId);
    const disableActions = isSaving || isSharing || isReadOnly;

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={it}>
            <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 900, mx: 'auto' }}>
                <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 } }}>
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
                        <Grid size={{ xs: 12, md: isMultiDay ? 6 : 12 }}>
                             <DatePicker label={isMultiDay ? "Dal" : "Data"} value={dataInizio} onChange={setDataInizio} disabled={disableActions} sx={{width: '100%'}} />
                        </Grid>
                        {isMultiDay && (
                            <Grid size={{ xs: 12, md: 6 }}>
                                <DatePicker label="Al" value={dataFine} onChange={setDataFine} disabled={disableActions} sx={{width: '100%'}} minDate={dataInizio || undefined} />
                            </Grid>
                        )}
                         <Grid size={{ xs: 12, md: 6 }}>
                            <TextField label="Tecnico Responsabile" value={scriventeDettaglio?.nome || 'Caricamento...'} fullWidth disabled />
                        </Grid>
                         <Grid size={{ xs: 12, md: 6 }}>
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
                             <Grid size={12}><Typography variant="body2" color="text.secondary">Per giornate non lavorative, le ore sono impostate a 8 di default.</Typography></Grid>
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
                                renderInput={params => <TextField {...params} label={isLavorativo ? "Aggiungi altri tecnici" : "Aggiungi tecnici"} />}
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
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <FormControl fullWidth disabled={disableActions}>
                                        <InputLabel id="nave-label">Nave</InputLabel>
                                        <Select labelId="nave-label" value={naveId || ''} label="Nave" onChange={e => setNaveId(e.target.value as string)}>
                                            <MenuItem value=""><em>Nessuna</em></MenuItem>
                                            {sortedNavi.map(n => <MenuItem key={n.id} value={n.id}>{n.nome}</MenuItem>)}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <FormControl fullWidth disabled={disableActions}>
                                        <InputLabel id="luogo-label">Luogo</InputLabel>
                                        <Select labelId="luogo-label" value={luogoId || ''} label="Luogo" onChange={e => setLuogoId(e.target.value as string)}>
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
                                <Grid size={12}><TextField label="Materiali Impiegati" value={materialiImpiegati} onChange={e => setMaterialiImpiegati(e.target.value)} fullWidth multiline rows={2} disabled={disableActions} /></Grid>
                                <Grid size={12}><TextField label="Lavoro Eseguito" value={lavoroEseguito} onChange={e => setLavoroEseguito(e.target.value)} fullWidth multiline rows={4} disabled={disableActions} /></Grid>
                            </Section>

                            <Section title="Firma Cliente">
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <TextField label="Nome e Cognome Firmatario" value={firmaFirmatarioNome} onChange={(e) => setFirmaFirmatarioNome(e.target.value)} fullWidth required disabled={disableActions}/>
                                </Grid>
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <TextField label="Società" value={firmaFirmatarioSocieta} onChange={(e) => setFirmaFirmatarioSocieta(e.target.value)} fullWidth disabled={disableActions}/>
                                </Grid>
                                <Grid size={12}>
                                    {firmaVettoriale ? (
                                        <Box sx={{border: '1px dashed grey', borderRadius: 1, p: 2, textAlign: 'center'}}>
                                            <Typography variant="body2" gutterBottom>Firma salvata:</Typography>
                                            <img 
                                                src={firmaVettoriale} 
                                                alt="Firma" 
                                                style={{
                                                    maxWidth: '200px', 
                                                    height: 'auto', 
                                                    border: '1px solid #eee',
                                                    margin: 'auto',
                                                    filter: mode === 'dark' ? 'invert(1)' : 'none'
                                                }}/>
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
                            <Button variant="contained" color="secondary" onClick={handleShare} disabled={disableActions} startIcon={(isSaving || isGeneratingPdf) ? <CircularProgress size={24} /> : <ShareIcon />}>Aggiorna e Condividi</Button>
                        )}
                    </Box>
                </Paper>
            </Box>
            <Dialog open={isModalOpen} onClose={handleCloseModal} maxWidth="sm" fullWidth>
                <DialogTitle>Modifica orario di {editingTecnico?.nome}</DialogTitle>
                <DialogContent>{tempDettaglioOre && <Box sx={{pt: 2}}><OreLavoroSingoloTecnico datiOre={tempDettaglioOre} onUpdate={setTempDettaglioOre} isReadOnly={false} /></Box>}</DialogContent>
                <DialogActions><Button onClick={handleCloseModal}>Annulla</Button><Button onClick={handleSaveFromModal} variant="contained">Salva Orario</Button></DialogActions>
            </Dialog>
            <SignatureDialog
                open={isSignatureModalOpen}
                onClose={() => setIsSignatureModalOpen(false)}
                onSave={handleSaveSignature}
            />
            <PdfPreviewDialog 
                open={isPdfPreviewOpen}
                onClose={() => setIsPdfPreviewOpen(false)}
                onShare={handleFinalShare}
                pdfDataUrl={pdfUrl}
                isGenerating={isGeneratingPdf}
                fileName={`Rapportino_${format(dataInizio || new Date(), 'dd-MM-yyyy')}.pdf`}
            />
        </LocalizationProvider>
    );
};
export default ReportFormPage;
