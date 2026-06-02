
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
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
import { isSameMonth, subMonths, format, eachDayOfInterval, startOfDay } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useLocalData } from '@/hooks/useLocalData';
import { db as firestoreDb } from '@/firebase';
import { db } from '@/db/local-db';
import { aggiungiAllaCoda } from '@/services/offlineSync';
import { doc, getDoc, addDoc, collection, runTransaction, writeBatch, Timestamp } from 'firebase/firestore';
import { rapportinoConverter } from '@/utils/converters';
import { Rapportino, TipoGiornata, Tecnico, Veicolo, DettaglioOreData, MasterData } from '@/models/definitions';
import { useSnackbar } from '@/contexts/SnackbarContext';
import OreLavoroSingoloTecnico from '@/components/Rapportini/OreLavoroSingoloTecnico';
import SignatureDialog from '@/components/form/SignatureDialog';
import PdfPreviewDialog from '@/components/pdf/PdfPreviewDialog';
import { generateRapportinoPDF } from '@/services/rapportinoPDFGenerator';
import { shareOrDownload } from '@/services/shareService';
import dayjs from 'dayjs';
import ConfirmationDialog from '@/components/ConfirmationDialog';

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
    const { userProfile } = useAuth();
    const { reportId } = useParams<{ reportId: string }>();
    const location = useLocation();
    const isOfflineMode = location.pathname.includes('edit-offline');
    const { data: masterData, loading: collectionsLoading } = useLocalData();
    const { tipiGiornata = [], tecnici = [], veicoli = [], navi = [], luoghi = [] } = masterData || {};
    const { showSnackbar } = useSnackbar();
    const isEditMode = Boolean(reportId);
    const loggedInTecnicoId = userProfile?.tecnicoId;

    const [isConfirmSaveDialogOpen, setIsConfirmSaveDialogOpen] = useState(false);

    const tecnicoScrivente = useMemo(() => tecnici.find(t => t.id === loggedInTecnicoId), [tecnici, loggedInTecnicoId]);

    const [originalReport, setOriginalReport] = useState<Rapportino | null>(null);
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
    const [veicoloId, setVeicoloId] = useState('');
    const [naveId, setNaveId] = useState('');
    const [luogoId, setLuogoId] = useState('');
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
        if (!isEditMode && tecnicoScrivente) {
            const nomeTecnico = `${tecnicoScrivente.cognome} ${tecnicoScrivente.nome}`.trim();
            setDettaglioOre([createInitialDettaglio(tecnicoScrivente.id, nomeTecnico)]);
            setPageLoading(false);
        }
    }, [isEditMode, tecnicoScrivente]);

    useEffect(() => {
        const populateFormWithData = (report: Rapportino) => {
            if (!report) return;
    
            // Converte il Timestamp di Firestore in un oggetto Date di JavaScript.
            // Se il campo `data` non esiste o è invalido, usa la data corrente come fallback.
            const reportDate = report.data ? (report.data instanceof Timestamp ? report.data.toDate() : new Date(report.data)) : new Date();
    
            setOriginalReport(report);
            setDataInizio(reportDate);
            setTipoGiornataId(report.tipoGiornataId || '');
            setVeicoloId(report.veicoloId || '');
            setNaveId(report.naveId || '');
            setLuogoId(report.luogoId || '');
            setDescrizioneBreve(report.descrizioneBreve || '');
            setLavoroEseguito(report.lavoroEseguito || '');
            setMaterialiImpiegati(report.materialiImpiegati || '');
            setFirmaFirmatarioNome(report.firmaFirmatarioNome || '');
            setFirmaFirmatarioSocieta(report.firmaFirmatarioSocieta || '');
            setFirmaVettoriale(report.firmaVettoriale || null);

            const tipo = tipiGiornata.find(t => t.id === report.tipoGiornataId);
            setIsLavorativo(isGiornataLavorativa(tipo));
    
            // Popola i dettagli delle ore, garantendo che ci sia un nome per ogni tecnico.
            const allTecnicoDetails = (report.dettaglioOreTecnici || []).map(savedDetail => {
                const tecnicoInfo = tecnici.find(t => t.id === savedDetail.tecnicoId);
                const nomeTecnico = tecnicoInfo ? `${tecnicoInfo.cognome} ${tecnicoInfo.nome}`.trim() : 'Tecnico non trovato';
                return {
                    ...createInitialDettaglio(savedDetail.tecnicoId, nomeTecnico),
                    ...savedDetail,
                };
            });
            setDettaglioOre(allTecnicoDetails);
        };

        const loadReportData = async () => {
            if (!isEditMode || !reportId || collectionsLoading) return;
            
            setPageLoading(true);
            try {
                let reportData: Rapportino | null = null;

                // Flusso Offline-First come da blueprint: prima cerca in locale, poi in remoto.
                if (isOfflineMode) {
                     const syncEvent = await db.syncQueue.where('entityId').equals(reportId).first();
                     if (syncEvent) reportData = syncEvent.payload as Rapportino;
                } else {
                    // 1. Cerca in IndexedDB (cache locale)
                    const localReport = await db.rapportini.get(reportId);
                    if (localReport) {
                        reportData = localReport as Rapportino;
                    } else {
                        // 2. Se non trovato, scarica da Firestore
                        const reportRef = doc(firestoreDb, 'rapportini', reportId).withConverter(rapportinoConverter);
                        const reportSnap = await getDoc(reportRef);
                        if (reportSnap.exists()) {
                            reportData = reportSnap.data();
                            // Salva nella cache locale per accessi futuri
                            await db.rapportini.put(reportData);
                        }
                    }
                }

                if (reportData) {
                    populateFormWithData(reportData);
                    
                    // Logica di sola lettura
                    const today = new Date();
                    const reportDate = reportData.data instanceof Timestamp ? reportData.data.toDate() : new Date(reportData.data);
                    const isCreator = reportData.tecnicoId === loggedInTecnicoId;
                    const isCurrentMonth = isSameMonth(reportDate, today);
                    const isPreviousMonth = isSameMonth(reportDate, subMonths(today, 1));
                    const isWithinGracePeriod = today.getDate() <= 3;

                    if (isOfflineMode) {
                        setIsReadOnly(true);
                        setLockReason("Questo report è in attesa di sincronizzazione e non può essere modificato.");
                    } else if (!isCreator) {
                        setIsReadOnly(true);
                        setLockReason("Questo report non può essere modificato perché non sei il tecnico creatore.");
                    } else if (!isCurrentMonth && !(isPreviousMonth && isWithinGracePeriod)) {
                        setIsReadOnly(true);
                        setLockReason("Questo report non è modificabile perché appartiene a un mese precedente.");
                    }
                } else {
                    showSnackbar("Rapportino non trovato.", "error");
                    navigate('/lista-report');
                }
            } catch (error) {
                console.error("Errore durante il caricamento del rapportino: ", error);
                showSnackbar("Si è verificato un errore critico nel caricamento dei dati.", "error");
            } finally {
                setPageLoading(false);
            }
        };

        if (isEditMode) {
            loadReportData();
        } else {
            setPageLoading(false);
        }
    }, [reportId, isEditMode, isOfflineMode, collectionsLoading, loggedInTecnicoId, navigate, showSnackbar, tecnici, tipiGiornata]);

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

    const handleCancel = () => navigate('/lista-report');

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

    const getFullReportData = (dataPerReport: Date = dataInizio || new Date()): Omit<Rapportino, 'id'> => {
        const mainTecnicoDetail = dettaglioOre.find(d => d.tecnicoId === loggedInTecnicoId)!;

        const naveSelezionata = navi.find(n => n.id === naveId);
        const luogoSelezionato = luoghi.find(l => l.id === luogoId);

        const nomeDestinazione = naveId === 'Nessuna' ? 'Nessuna' : (naveSelezionata?.nome || (luogoId === 'Nessuno' ? 'Nessuno' : luogoSelezionato?.nome || 'Generico'));
        const nomeReport = `Rapportino del ${format(dataPerReport, 'dd/MM/yyyy')} - ${nomeDestinazione}`;

        return {
            nome: nomeReport,
            data: dataPerReport,
            tecnicoId: loggedInTecnicoId!,
            tipoGiornataId,
            isTrasferta: mainTecnicoDetail.isManual,
            oraInizio: mainTecnicoDetail.oraInizio,
            oraFine: mainTecnicoDetail.oraFine,
            pausa: mainTecnicoDetail.pausa,
            dettaglioOreTecnici: dettaglioOre.map(({ ...rest }) => rest),
            presenze: dettaglioOre.map(d => d.tecnicoId),
            veicoloId: veicoloId || 'Nessuno',
            naveId: naveId || 'Nessuna',
            luogoId: luogoId || 'Nessuno',
            descrizioneBreve: descrizioneBreve || '',
            lavoroEseguito: lavoroEseguito || '',
            materialiImpiegati: materialiImpiegati || '',
            firmaFirmatarioNome: firmaFirmatarioNome || '',
            firmaFirmatarioSocieta: firmaFirmatarioSocieta || '',
            firmaVettoriale: firmaVettoriale || null,
            createdAt: originalReport ? originalReport.createdAt : new Date(),
            updatedAt: new Date(),
        };
    };

    const salvaOAccodaRapportino = async (): Promise<string | null> => {
        if (!loggedInTecnicoId || !dataInizio) {
            showSnackbar("Errore: Utente non autenticato o data mancante.", "error");
            return null;
        }
        if (!tipoGiornataId) {
            showSnackbar("Il campo 'Tipo Giornata' è obbligatorio.", "warning");
            return null;
        }

        if (isLavorativo) {
            if (!lavoroEseguito.trim()) {
                showSnackbar("Il campo 'Lavoro Eseguito' è obbligatorio.", "warning");
                return null;
            }
            if (!naveId) {
                showSnackbar("Il campo 'Nave' è obbligatorio. Selezionare un'opzione.", "warning");
                return null;
            }
            if (!luogoId) {
                showSnackbar("Il campo 'Luogo' è obbligatorio. Selezionare un'opzione.", "warning");
                return null;
            }
        }

        setIsSaving(true);
        try {
            if (navigator.onLine && !isOfflineMode) {
                let finalId = reportId;
                const reportData = getFullReportData();

                if (isEditMode && reportId) {
                    await runTransaction(firestoreDb, async (transaction) => {
                        const reportRef = doc(firestoreDb, 'rapportini', reportId).withConverter(rapportinoConverter);
                        const sfDoc = await transaction.get(reportRef);
                        if (!sfDoc.exists()) {
                            throw new Error(`Documento con ID ${reportId} non trovato.`);
                        }
                        const { createdAt, ...updateData } = reportData;
                        transaction.update(reportRef, updateData);
                    });
                } else {
                    const collectionRef = collection(firestoreDb, 'rapportini').withConverter(rapportinoConverter);
                    const docRef = await addDoc(collectionRef, reportData);
                    finalId = docRef.id;
                }
                showSnackbar(isEditMode ? "Rapportino aggiornato!" : "Rapportino creato!", "success");
                return finalId ?? null;
            } else {
                const reportData = getFullReportData();
                const queuedId = await aggiungiAllaCoda(reportData, reportId);
                showSnackbar("Offline. Il rapportino è stato salvato localmente.", "info");
                return queuedId;
            }
        } catch (error) {
            console.error("Errore durante il salvataggio: ", error);
            const errorMessage = (error instanceof Error) ? error.message : "Errore di salvataggio.";
            showSnackbar(`Errore: ${errorMessage}`, "error");
            return null;
        } finally {
            setIsSaving(false);
        }
    };

    const handleMultiDaySave = async () => {
        if (!dataInizio || !dataFine || !tipoGiornataId || !loggedInTecnicoId) {
            showSnackbar("Per la creazione multipla, sono necessarie le date di inizio e fine e il tipo di giornata.", "warning");
            return;
        }

        setIsSaving(true);
        try {
            const giorniDaCreare = eachDayOfInterval({
                start: startOfDay(dataInizio),
                end: startOfDay(dataFine)
            });

            const nomeTipoGiornata = tipiGiornata.find(t => t.id === tipoGiornataId)?.nome || 'Evento';

            const createReportObject = (giorno: Date): Omit<Rapportino, 'id'> => ({
                nome: `Rapportino del ${format(giorno, 'dd/MM/yyyy')} - ${nomeTipoGiornata}`,
                data: giorno,
                tecnicoId: loggedInTecnicoId,
                tipoGiornataId,
                isTrasferta: false,
                oraInizio: '',
                oraFine: '',
                pausa: 0,
                dettaglioOreTecnici: [{
                    tecnicoId: loggedInTecnicoId,
                    ore: 8,
                    isManual: true,
                    nome: tecnicoScrivente?.nome || '',
                    oraInizio: '',
                    oraFine: '',
                    pausa: 0
                }],
                presenze: [loggedInTecnicoId],
                veicoloId: 'Nessuno',
                naveId: 'Nessuna',
                luogoId: 'Nessuno',
                descrizioneBreve: '',
                lavoroEseguito: '',
                materialiImpiegati: '',
                firmaFirmatarioNome: '',
                firmaFirmatarioSocieta: '',
                firmaVettoriale: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            if (navigator.onLine) {
                const batch = writeBatch(firestoreDb);
                const collectionRef = collection(firestoreDb, 'rapportini').withConverter(rapportinoConverter);
                giorniDaCreare.forEach(giorno => {
                    const reportRef = doc(collectionRef);
                    const reportData = createReportObject(giorno);
                    batch.set(reportRef, reportData);
                });
                await batch.commit();
            } else {
                for (const giorno of giorniDaCreare) {
                    const reportData = createReportObject(giorno);
                    await aggiungiAllaCoda(reportData);
                }
            }

            showSnackbar(`Creati ${giorniDaCreare.length} rapportini con successo!`, "success");
            navigate('/lista-report');

        } catch (error) {
            console.error("Errore creazione multipla: ", error);
            showSnackbar("Si è verificato un errore durante la creazione dei rapportini.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSave = async () => {
        if (!isEditMode && firmaVettoriale) {
            setIsConfirmSaveDialogOpen(true);
            return;
        }
        await proceedToSave();
    };

    const proceedToSave = async () => {
        if (isMultiDay) {
            await handleMultiDaySave();
        } else {
            const savedId = await salvaOAccodaRapportino();
            if (savedId) {
                navigate('/lista-report');
            }
        }
    };

    const handleConfirmSave = async () => {
        setIsConfirmSaveDialogOpen(false);
        await proceedToSave();
    };

    const handleShare = async () => {
        setIsSharing(true);
        setIsPdfPreviewOpen(true);
        if (pdfUrl) URL.revokeObjectURL(pdfUrl);

        try {
            const reportDataForPdf = getFullReportData();
            const finalReportData = {
                 id: reportId || 'N/D (Offline)',
                 ...reportDataForPdf
            } as Rapportino;

            if (!masterData) throw new Error("Dati anagrafici non disponibili per la generazione del PDF.");
            const pdfBlob = await generateRapportinoPDF(finalReportData, masterData as MasterData);
            const newPdfUrl = URL.createObjectURL(pdfBlob);
            setPdfUrl(newPdfUrl);
        } catch (error) {
            console.error("Errore durante la generazione PDF per condivisione: ", error);
            showSnackbar("Errore durante la generazione del PDF.", "error");
            setIsPdfPreviewOpen(false);
        } finally {
            setIsGeneratingPdf(false);
            setIsSharing(false);
        }
    };

    const handleFinalShare = async () => {
        if (!pdfUrl || !dataInizio) return;
        setIsSharing(true);
        try {
            const response = await fetch(pdfUrl);
            const blob = await response.blob();
            const fileName = `Rapportino_${format(dataInizio, 'dd-MM-yyyy')}.pdf`;

            await shareOrDownload(blob, fileName);
            setIsPdfPreviewOpen(false);
        } catch (error) {
            console.error("Errore di condivisione finale: ", error);
            if (!(error instanceof DOMException && error.name === 'AbortError')) {
                showSnackbar("Impossibile condividere il file.", "error");
            }
        } finally {
            setIsSharing(false);
        }
    };

    const handleOpenSignatureModal = () => {
        if (isEditMode && firmaVettoriale && !isReadOnly) {
             if(originalReport && originalReport.firmaVettoriale) {
                showSnackbar("La firma non può essere modificata dopo il primo salvataggio.", "warning");
                return;
             }
        }
        if (!firmaFirmatarioNome) {
            showSnackbar("Per favore, inserisci prima il Nome e Cognome del firmatario.", "warning");
            return;
        }
        setIsSignatureModalOpen(true)
    };

    const handleSaveSignature = (signatureData: string) => {
        setFirmaVettoriale(signatureData);
        setIsSignatureModalOpen(false);
        showSnackbar("Firma salvata con successo! Ricorda di salvare il rapportino.", "success");
    };

    if (pageLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress /></Box>;

    const scriventeDettaglio = dettaglioOre.find(d => d.tecnicoId === loggedInTecnicoId);
    const disableActions = isSaving || isSharing || isReadOnly;

    const getRenderValue = (id: string, collection: (Veicolo | Tecnico | any)[], labelGetter: (item: any) => string, noneString: string) => {
        if (id === noneString) {
            return <em>{noneString}</em>;
        }
        const item = collection.find(v => v.id === id);
        return item ? labelGetter(item) : '';
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={it}>
            <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 900, mx: 'auto' }}>
                <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 } }}>
                     <Box sx={{ textAlign: 'center', mb: 3, borderBottom: '2px solid', borderColor: 'primary.main', pb: 2 }}>
                        <Typography variant="h4" component="h1" fontWeight="bold">Tecnologie Industriali Navali</Typography>
                        <Typography variant="h6" component="h2">Report Intervento</Typography>
                    </Box>

                    {isReadOnly && lockReason && <Alert severity="info" sx={{ mb: 2 }}>{lockReason}</Alert>}

                    <Section title="Dati Principali">
                        <Grid size={12}>
                            {!isEditMode && (
                                <FormControlLabel control={<Switch checked={isMultiDay} onChange={handleMultiDayToggle} />} label="Crea per più giorni (solo Ferie/Malattia)" disabled={isEditMode || disableActions} />
                            )}
                        </Grid>
                        <Grid
                            size={{
                                xs: 12,
                                md: isMultiDay ? 6 : 12
                            }}>
                             <DatePicker label={isMultiDay ? "Dal" : "Data"} value={dataInizio} onChange={setDataInizio} disabled={disableActions} sx={{width: '100%'}} />
                        </Grid>
                        {isMultiDay && (
                            <Grid
                                size={{
                                    xs: 12,
                                    md: 6
                                }}>
                                <DatePicker label="Al" value={dataFine} onChange={setDataFine} disabled={disableActions} sx={{width: '100%'}} minDate={dataInizio || undefined} />
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

                    {!isMultiDay && (
                        <>
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
                                        <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, width: '100%' }}>
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
                                            <FormControl fullWidth required disabled={disableActions}>
                                                <InputLabel id="nave-label">Nave</InputLabel>
                                                <Select labelId="nave-label" value={naveId} label="Nave" onChange={e => setNaveId(e.target.value as string)}>
                                                    <MenuItem value="Nessuna"><em>Nessuna</em></MenuItem>
                                                    {sortedNavi.map(n => <MenuItem key={n.id} value={n.id}>{n.nome}</MenuItem>)}
                                                </Select>
                                            </FormControl>
                                        </Grid>
                                        <Grid
                                            size={{
                                                xs: 12,
                                                md: 6
                                            }}>
                                            <FormControl fullWidth required disabled={disableActions}>
                                                <InputLabel id="luogo-label">Luogo</InputLabel>
                                                <Select labelId="luogo-label" value={luogoId} label="Luogo" onChange={e => setLuogoId(e.target.value as string)}>
                                                    <MenuItem value="Nessuno"><em>Nessuno</em></MenuItem>
                                                    {sortedLuoghi.map(l => <MenuItem key={l.id} value={l.id}>{l.nome}</MenuItem>)}
                                                </Select>
                                            </FormControl>
                                        </Grid>
                                        <Grid size={12}>
                                            <FormControl fullWidth disabled={disableActions}>
                                                <InputLabel id="veicolo-label">Veicolo</InputLabel>
                                                <Select
                                                    labelId="veicolo-label"
                                                    value={veicoloId}
                                                    label="Veicolo"
                                                    onChange={e => setVeicoloId(e.target.value as string)}
                                                    renderValue={(selected) => getRenderValue(selected, sortedVeicoli, getVeicoloLabel, "Nessuno")}
                                                >
                                                    <MenuItem value="Nessuno"><em>Nessuno</em></MenuItem>
                                                    {sortedVeicoli.map(v => <MenuItem key={v.id} value={v.id}>{getVeicoloLabel(v)}</MenuItem>)}
                                                </Select>
                                            </FormControl>
                                        </Grid>
                                        <Grid size={12}><TextField label="Breve Descrizione Lavoro" value={descrizioneBreve} onChange={e => setDescrizioneBreve(e.target.value)} fullWidth disabled={disableActions} /></Grid>
                                        <Grid size={12}><TextField label="Materiali Impiegati" value={materialiImpiegati} onChange={e => setMaterialiImpiegati(e.target.value)} fullWidth multiline rows={2} disabled={disableActions} /></Grid>
                                        <Grid size={12}><TextField label="Lavoro Eseguito" value={lavoroEseguito} onChange={e => setLavoroEseguito(e.target.value)} fullWidth multiline rows={4} required disabled={disableActions} /></Grid>
                                    </Section>

                                    <Section title="Firma Cliente">
                                        <Grid
                                            size={{
                                                xs: 12,
                                                md: 6
                                            }}>
                                            <TextField label="Nome e Cognome Firmatario" value={firmaFirmatarioNome} onChange={(e) => setFirmaFirmatarioNome(e.target.value)} fullWidth required disabled={disableActions}/>
                                        </Grid>
                                        <Grid
                                            size={{
                                                xs: 12,
                                                md: 6
                                            }}>
                                            <TextField label="Società" value={firmaFirmatarioSocieta} onChange={(e) => setFirmaFirmatarioSocieta(e.target.value)} fullWidth disabled={disableActions}/>
                                        </Grid>
                                        <Grid size={12}>
                                            {firmaVettoriale ? (
                                                <Box sx={{border: '1px dashed grey', borderRadius: 1, p: 2, textAlign: 'center', backgroundColor: isReadOnly ? '#f5f5f5' : '#616161' }}>
                                                    <Typography variant="body2" gutterBottom sx={{ color: isReadOnly ? 'black' : 'white' }}>Firma salvata:</Typography>
                                                    <img
                                                        key={firmaVettoriale}
                                                        src={firmaVettoriale}
                                                        alt="Firma"
                                                        style={{
                                                            maxWidth: '200px',
                                                            height: 'auto',
                                                            margin: 'auto',
                                                            filter: isReadOnly ? 'none' : 'invert(1)'
                                                        }}/>
                                                    <br />
                                                    {!isReadOnly && <Button onClick={handleOpenSignatureModal} startIcon={<EditIcon/>} sx={{mt: 1, color: isReadOnly ? 'black' : 'white' }} disabled={disableActions}>Modifica Firma</Button>}
                                                </Box>
                                            ) : (
                                                <Button variant="outlined" startIcon={<BorderColorIcon />} onClick={handleOpenSignatureModal} disabled={disableActions} fullWidth>Aggiungi Firma Cliente</Button>
                                            )}
                                        </Grid>
                                    </Section>
                                </> 
                            )}
                        </>
                    )}


                    <Box id="action-buttons" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 4 }}>
                        <Button variant="outlined" color="primary" onClick={handleCancel} disabled={isSaving || isSharing}>Chiudi</Button>

                        <Box sx={{ display: 'flex', gap: 2 }}>
                           {!isReadOnly && (
                                <Button variant="contained" onClick={handleSave} disabled={disableActions}>
                                    {isSaving ? <CircularProgress size={24} /> : (isEditMode ? 'Aggiorna' : 'Salva')}
                                </Button>
                           )}
                            <Button
                                variant="contained"
                                color="secondary"
                                onClick={handleShare}
                                disabled={isSaving || isSharing}
                                startIcon={(isGeneratingPdf || isSharing) ? <CircularProgress size={24} /> : <ShareIcon />}
                            >
                                Condividi
                            </Button>
                        </Box>
                    </Box>
                </Paper>
            </Box>
            <Dialog open={isModalOpen} onClose={handleCloseModal} maxWidth="sm" fullWidth>
                <DialogTitle>Modifica orario di {editingTecnico?.nome}</DialogTitle>
                <DialogContent>{tempDettaglioOre && <Box sx={{pt: 2}}><OreLavoroSingoloTecnico datiOre={tempDettaglioOre} onUpdate={setTempDettaglioOre} isReadOnly={isReadOnly} /></Box>}</DialogContent>
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
            <ConfirmationDialog
                open={isConfirmSaveDialogOpen}
                onClose={() => setIsConfirmSaveDialogOpen(false)}
                onConfirm={handleConfirmSave}
                title="Conferma Salvataggio Firma"
                message="Sei sicuro di voler salvare? La firma non potrà più essere modificata dopo il primo salvataggio."
            />
        </LocalizationProvider>
    );
};
export default ReportFormPage;