
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { isSameMonth, subMonths, format, eachDayOfInterval, startOfDay } from 'date-fns';
import { doc, getDoc, addDoc, collection, runTransaction, writeBatch, Timestamp } from 'firebase/firestore';

import { useAuth } from '@/hooks/useAuth';
import { useLocalData } from '@/hooks/useLocalData';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { db } from '@/db/local-db';
import { db as firestoreDb } from '@/firebase';
import { aggiungiAllaCoda } from '@/services/offlineSync';
import { rapportinoConverter } from '@/utils/converters';
import { Rapportino, TipoGiornata, Tecnico, Veicolo, DettaglioOreData, MasterData } from '@/models/definitions';
import { generateRapportinoPDF } from '@/services/rapportinoPDFGenerator';
import { shareOrDownload } from '@/services/shareService';

function removeUndefinedKeys(obj: any): any {
    if (obj === null || typeof obj !== 'object' || obj instanceof Date || obj instanceof Timestamp) {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(item => removeUndefinedKeys(item)).filter(item => item !== undefined);
    }
    const newObj: { [key: string]: any } = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key) && obj[key] !== undefined) {
            const value = removeUndefinedKeys(obj[key]);
            if (value !== undefined) {
                newObj[key] = value;
            }
        }
    }
    return newObj;
}

const NON_LAVORATIVO_KEYWORDS = ['ferie', 'malattia', 'legge 104'];
const MULTI_DAY_ALLOWED_KEYWORDS = ['ferie', 'malattia'];

const isGiornataLavorativa = (tipo: TipoGiornata | undefined): boolean => {
    if (!tipo || !tipo.nome) return true;
    return !NON_LAVORATIVO_KEYWORDS.some(keyword => tipo.nome.toLowerCase().includes(keyword));
};

const calculateOre = (dettaglio: Partial<DettaglioOreData>): number => {
    if (dettaglio.isManual) {
        return parseFloat(String(dettaglio.ore)) || 0;
    }
    const inizio = new Date(`1970-01-01T${dettaglio.oraInizio || '00:00'}`);
    const fine = new Date(`1970-01-01T${dettaglio.oraFine || '00:00'}`);
    if (fine <= inizio) {
        fine.setDate(fine.getDate() + 1);
    }
    const diff = (fine.getTime() - inizio.getTime()) / (1000 * 60); // Minuti
    const oreCalcolate = (diff - (dettaglio.pausa || 0)) / 60;
    return Math.round(oreCalcolate * 4) / 4;
};

const createInitialDettaglio = (
    tecnicoId: string,
    nome: string,
    baseDetail?: Partial<DettaglioOreData>
): DettaglioOreData => {
    const defaultDetail: DettaglioOreData = {
        tecnicoId,
        nome,
        isManual: baseDetail?.isManual || false,
        oraInizio: baseDetail?.oraInizio || '07:30',
        oraFine: baseDetail?.oraFine || '16:30',
        pausa: baseDetail?.pausa || 60,
        ore: baseDetail?.ore || 0,
    };
    defaultDetail.ore = calculateOre(defaultDetail);
    return defaultDetail;
};

export const useReportForm = () => {
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
    const [originalReport, setOriginalReport] = useState<Rapportino | null>(null);
    const [dataInizio, setDataInizio] = useState<Date | null>(new Date());
    const [dataFine, setDataFine] = useState<Date | null>(new Date());
    const [isMultiDay, setIsMultiDay] = useState(false);
    const [dettaglioOre, setDettaglioOre] = useState<DettaglioOreData[]>([]);
    const [tipoGiornataId, setTipoGiornataId] = useState('');
    const [trasfertaId, setTrasfertaId] = useState('');
    const [includeTrasferta, setIncludeTrasferta] = useState(false);
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
    const [firmaVettoriale, setFirmaVettoriale] = useState<string | undefined>(undefined);

    const tecnicoScrivente = useMemo(() => tecnici.find(t => t.id === loggedInTecnicoId), [tecnici, loggedInTecnicoId]);

    const getVeicoloLabel = useCallback((veicolo: Veicolo | undefined) => {
        if (!veicolo) return '';
        return `${veicolo.marca || ''} ${veicolo.modello || ''} - ${veicolo.targa || 'N/A'}`.trim();
    }, []);

    const sortedVeicoli = useMemo(() => [...veicoli].sort((a, b) => getVeicoloLabel(a).localeCompare(getVeicoloLabel(b))), [veicoli, getVeicoloLabel]);
    const sortedNavi = useMemo(() => [...navi].sort((a, b) => (a?.nome || '').localeCompare(b?.nome || '')), [navi]);
    const sortedLuoghi = useMemo(() => [...luoghi].sort((a, b) => (a?.nome || '').localeCompare(b?.nome || '')), [luoghi]);
    const sortedTecnici = useMemo(() => [...tecnici].sort((a, b) => {
        const cognomeA = a?.cognome || '';
        const cognomeB = b?.cognome || '';
        const nomeA = a?.nome || '';
        const nomeB = b?.nome || '';
        const cognomeCompare = cognomeA.localeCompare(cognomeB);
        if (cognomeCompare !== 0) return cognomeCompare;
        return nomeA.localeCompare(nomeB);
    }), [tecnici]);

    const { tipiGiornataLavorativi, tipiGiornataTrasferta } = useMemo(() => {
        const trasferte = tipiGiornata.filter(t => (t as any).categoria === 'trasferta' || (t.nome || '').toLowerCase().includes('trasferta'));
        const lavorativi = tipiGiornata.filter(t => ((t as any).categoria !== 'trasferta') && !(t.nome || '').toLowerCase().includes('trasferta'));
        return { tipiGiornataLavorativi: lavorativi, tipiGiornataTrasferta: trasferte };
    }, [tipiGiornata]);

    const otherTecnicos = useMemo(() => sortedTecnici.filter(t => t.id !== loggedInTecnicoId), [sortedTecnici, loggedInTecnicoId]);
    const altriTecniciIds = useMemo(() => dettaglioOre.filter(d => d.tecnicoId !== loggedInTecnicoId).map(d => d.tecnicoId), [dettaglioOre, loggedInTecnicoId]);
    const selectedTecnicos = useMemo(() => otherTecnicos.filter(t => altriTecniciIds.includes(t.id)), [altriTecniciIds, otherTecnicos]);

    const tipiGiornataFiltrati = useMemo(() => {
        const sourceList = tipiGiornataLavorativi;
        if (isMultiDay) {
            return sourceList.filter(t => MULTI_DAY_ALLOWED_KEYWORDS.some(keyword => (t?.nome || '').toLowerCase().includes(keyword)));
        }
        return sourceList;
    }, [isMultiDay, tipiGiornataLavorativi]);

    useEffect(() => {
        const initializeForm = async () => {
            if (!isEditMode && tecnicoScrivente) {
                const nomeTecnico = `${tecnicoScrivente.cognome} ${tecnicoScrivente.nome}`.trim();
                setDettaglioOre([createInitialDettaglio(tecnicoScrivente.id, nomeTecnico)]);
                setPageLoading(false);
            }
        };
        initializeForm();
    }, [isEditMode, tecnicoScrivente]);

    useEffect(() => {
        const populateFormWithData = (report: Rapportino) => {
            if (!report) return;
            const reportDate = report.data ? (report.data instanceof Timestamp ? report.data.toDate() : new Date(report.data)) : new Date();
            setOriginalReport(report);
            setDataInizio(reportDate);
            setTipoGiornataId(report.tipoGiornataId || '');
            setTrasfertaId(report.trasfertaId || '');
            setIncludeTrasferta(!!report.trasfertaId);
            setVeicoloId(report.veicoloId || '');
            setNaveId(report.naveId || '');
            setLuogoId(report.luogoId || '');
            setDescrizioneBreve(report.descrizioneBreve || '');
            setLavoroEseguito(report.lavoroEseguito || '');
            setMaterialiImpiegati(report.materialiImpiegati || '');
            setFirmaFirmatarioNome(report.firmaFirmatarioNome || '');
            setFirmaFirmatarioSocieta(report.firmaFirmatarioSocieta || '');
            setFirmaVettoriale(report.firmaVettoriale || undefined);
            const tipo = tipiGiornata.find(t => t.id === report.tipoGiornataId);
            setIsLavorativo(isGiornataLavorativa(tipo));
            const allTecnicoDetails = (report.dettaglioOreTecnici || []).map(savedDetail => {
                const tecnicoInfo = tecnici.find(t => t.id === savedDetail.tecnicoId);
                const nomeTecnico = tecnicoInfo ? `${tecnicoInfo.cognome} ${tecnicoInfo.nome}`.trim() : 'Tecnico non trovato';
                return { ...createInitialDettaglio(savedDetail.tecnicoId, nomeTecnico), ...savedDetail };
            });
            setDettaglioOre(allTecnicoDetails);
        };

        const loadReportData = async () => {
            if (!isEditMode || !reportId || collectionsLoading) return;
            setPageLoading(true);
            try {
                let reportData: Rapportino | null = null;
                if (isOfflineMode) {
                    reportData = await db.rapportini.get(reportId) as Rapportino | null;
                } else {
                    const localReport = await db.rapportini.get(reportId);
                    if (localReport) {
                        reportData = localReport as Rapportino;
                    } else {
                        const reportRef = doc(firestoreDb, 'rapportini', reportId).withConverter(rapportinoConverter);
                        const reportSnap = await getDoc(reportRef);
                        if (reportSnap.exists()) {
                            reportData = reportSnap.data();
                            await db.rapportini.put(reportData);
                        }
                    }
                }
                if (reportData) {
                    populateFormWithData(reportData);
                    const today = new Date();
                    const reportDate = reportData.data instanceof Timestamp ? reportData.data.toDate() : new Date(reportData.data);
                    const isCreator = reportData.tecnicoId === loggedInTecnicoId;
                    const isCurrentMonth = isSameMonth(reportDate, today);
                    const isPreviousMonth = isSameMonth(reportDate, subMonths(today, 1));
                    const isWithinGracePeriod = today.getDate() <= 3;
                    if (isOfflineMode) {}
                    else if (!isCreator) {
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

        const runEffect = async () => {
            if (isEditMode) {
                await loadReportData();
            } else {
                setPageLoading(false);
            }
        };
        runEffect();
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
        const baseDetail = isLavorativo ? scrivente : undefined;
        const nuoviDettagli = nuoviTecniciSelezionati.map(t => {
            const existingDetail = dettaglioOre.find(d => d.tecnicoId === t.id);
            return existingDetail || createInitialDettaglio(t.id, `${t.cognome} ${t.nome}`.trim(), baseDetail);
        });
        setDettaglioOre([scrivente, ...nuoviDettagli]);
    };

    const removeTecnico = (tecnicoIdToRemove: string) => {
        setDettaglioOre(prev => prev.filter(d => d.tecnicoId !== tecnicoIdToRemove));
    };

    const getFullReportData = (): Omit<Rapportino, 'id'> | null => {
        if (!loggedInTecnicoId || !tecnicoScrivente || !dataInizio) {
            showSnackbar("Dati utente o data mancanti.", "error");
            return null;
        }
        const tipoGiornataSelezionato = tipiGiornata.find(t => t.id === tipoGiornataId);
        const scriventeDettaglio = dettaglioOre.find(d => d.tecnicoId === loggedInTecnicoId);
        const reportData: Omit<Rapportino, 'id'> = {
            nome: `Rapportino del ${format(dataInizio, 'dd/MM/yyyy')} - ${tipoGiornataSelezionato?.nome || 'N/D'}`,
            data: dataInizio,
            oreLavoro: dettaglioOre.reduce((acc, curr) => acc + (curr.ore || 0), 0),
            tecnicoId: loggedInTecnicoId,
            tipoGiornataId: tipoGiornataId,
            trasfertaId: includeTrasferta ? trasfertaId : undefined,
            oraInizio: scriventeDettaglio?.oraInizio || '',
            oraFine: scriventeDettaglio?.oraFine || '',
            pausa: scriventeDettaglio?.pausa || 0,
            dettaglioOreTecnici: dettaglioOre.map(d => ({...d, ore: parseFloat(String(d.ore)) || 0})),
            presenze: dettaglioOre.map(d => d.tecnicoId),
            veicoloId: veicoloId || 'Nessuno',
            naveId: naveId || 'Nessuna',
            luogoId: luogoId || 'Nessuno',
            descrizioneBreve: descrizioneBreve || '',
            lavoroEseguito: lavoroEseguito || '',
            materialiImpiegati: materialiImpiegati || '',
            firmaFirmatarioNome: firmaFirmatarioNome || '',
            firmaFirmatarioSocieta: firmaFirmatarioSocieta || '',
            firmaVettoriale: firmaVettoriale || undefined,
            createdAt: originalReport?.createdAt || new Date(),
            updatedAt: new Date(),
        };
        return reportData;
    };

    const salvaOAccodaRapportino = async (options: { navigateOnSuccess: boolean } = { navigateOnSuccess: true }): Promise<string | null> => {
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
        }
        setIsSaving(true);
        try {
            let finalId: string | undefined | null = reportId;
            const reportData = getFullReportData();
            if (!reportData) return null;
            const sanitizedReportData = removeUndefinedKeys(reportData);
            if (navigator.onLine && !isOfflineMode) {
                if (isEditMode && reportId) {
                    await runTransaction(firestoreDb, async (transaction) => {
                        const reportRef = doc(firestoreDb, 'rapportini', reportId);
                        transaction.update(reportRef, sanitizedReportData);
                    });
                    await db.rapportini.put({ ...(sanitizedReportData as Rapportino), id: reportId, isOffline: false });
                    finalId = reportId;
                } else {
                    const collectionRef = collection(firestoreDb, 'rapportini');
                    const docRef = await addDoc(collectionRef, sanitizedReportData);
                    finalId = docRef.id;
                    await db.rapportini.put({ ...(sanitizedReportData as Rapportino), id: finalId, isOffline: false });
                }
            } else {
                finalId = await aggiungiAllaCoda(sanitizedReportData, reportId);
            }
            showSnackbar(isEditMode ? "Rapportino aggiornato!" : "Rapportino creato!", "success");
            if (options.navigateOnSuccess) {
                navigate('/lista-report');
            }
            return finalId ?? null;
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
        if (isSaving) return;
        if (!dataInizio || !dataFine || !tipoGiornataId || !loggedInTecnicoId) {
            showSnackbar("Per la creazione multipla, sono necessarie le date di inizio e fine e il tipo di giornata.", "warning");
            return;
        }
        setIsSaving(true);
        try {
            const giorniDaCreare = eachDayOfInterval({ start: startOfDay(dataInizio), end: startOfDay(dataFine) });
            const nomeTipoGiornata = tipiGiornata.find(t => t.id === tipoGiornataId)?.nome || 'Evento';
            const rapportiniLocaliCreati: Rapportino[] = [];
            const createReportObject = (giorno: Date): Omit<Rapportino, 'id'> => ({
                nome: `Rapportino del ${format(giorno, 'dd/MM/yyyy')} - ${nomeTipoGiornata}`,
                data: giorno,
                oreLavoro: 8,
                tecnicoId: loggedInTecnicoId,
                tipoGiornataId,
                trasfertaId: undefined,
                oraInizio: '', 
                oraFine: '', 
                pausa: 0, 
                dettaglioOreTecnici: [{
                    tecnicoId: loggedInTecnicoId,
                    ore: 8,
                    isManual: true,
                    nome: `${tecnicoScrivente?.cognome || ''} ${tecnicoScrivente?.nome || ''}`.trim(),
                    oraInizio: '', 
                    oraFine: '', 
                    pausa: 0, 
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
                firmaVettoriale: undefined,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            if (navigator.onLine) {
                const batch = writeBatch(firestoreDb);
                const collectionRef = collection(firestoreDb, 'rapportini').withConverter(rapportinoConverter);
                giorniDaCreare.forEach(giorno => {
                    const reportRef = doc(collectionRef);
                    const reportObject = { ...createReportObject(giorno), id: reportRef.id };
                    batch.set(reportRef, reportObject);
                    rapportiniLocaliCreati.push({ ...reportObject, isOffline: false });
                });
                await batch.commit();
                if (rapportiniLocaliCreati.length > 0) {
                    await db.rapportini.bulkPut(rapportiniLocaliCreati);
                }
            } else {
                for (const giorno of giorniDaCreare) {
                    await aggiungiAllaCoda(createReportObject(giorno));
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

    const proceedToSave = async () => {
        if (isSaving) return;
        if (isMultiDay) {
            await handleMultiDaySave();
        } else {
            await salvaOAccodaRapportino({ navigateOnSuccess: true });
        }
    };

    const handleSave = async () => {
        if (isSaving) return;
        if (!isEditMode && firmaVettoriale) {
            setIsConfirmSaveDialogOpen(true);
            return;
        }
        await proceedToSave();
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
            const reportData = getFullReportData();
            if (!reportData) throw new Error("Dati del report invalidi per la generazione del PDF.")
            if (!masterData) throw new Error("Dati anagrafici non disponibili per la generazione del PDF.");
            const reportDataWithId = { ...reportData, id: reportId || 'temp-id' };
            const pdfBlob = await generateRapportinoPDF(reportDataWithId, masterData as MasterData);
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
    
    const handleSaveAndShare = async () => {
        if (isSaving) return;
        if (isMultiDay) {
            showSnackbar("La funzione 'Salva e Condividi' non è disponibile per la creazione di più giorni.", "warning");
            return;
        }
        const savedId = await salvaOAccodaRapportino({ navigateOnSuccess: false });
        if (savedId) {
            await handleShare();
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
                showSnackbar("La firma non potrà più essere modificata dopo il primo salvataggio.", "warning");
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

    const scriventeDettaglio = dettaglioOre.find(d => d.tecnicoId === loggedInTecnicoId);
    const disableActions = isSaving || isSharing || isReadOnly;

    return {
        isEditMode, isOfflineMode, isReadOnly, lockReason, pageLoading, isSaving, isSharing, isGeneratingPdf,
        masterData, collectionsLoading, dataInizio, setDataInizio, dataFine, setDataFine, isMultiDay, tipoGiornataId,
        setTipoGiornataId, trasfertaId, setTrasfertaId, includeTrasferta, setIncludeTrasferta, isLavorativo, veicoloId,
        setVeicoloId, naveId, setNaveId, luogoId, setLuogoId, descrizioneBreve, setDescrizioneBreve, lavoroEseguito,
        setLavoroEseguito, materialiImpiegati, setMaterialiImpiegati, dettaglioOre, firmaFirmatarioNome, setFirmaFirmatarioNome,
        firmaFirmatarioSocieta, setFirmaFirmatarioSocieta, firmaVettoriale, tecnicoScrivente, tipiGiornataFiltrati,
        selectedTecnicos, otherTecnicos, scriventeDettaglio, handleMultiDayToggle, handleTipoGiornataChange,
        handleAltriTecniciChange, handleOreUpdate, handleScriventeOreUpdate, removeTecnico, handleOpenModal, handleSave,
        handleSaveAndShare, handleShare, handleCancel, handleOpenSignatureModal, isModalOpen, handleCloseModal,
        handleSaveFromModal, editingTecnico, tempDettaglioOre, setTempDettaglioOre, isSignatureModalOpen,
        setIsSignatureModalOpen, handleSaveSignature, isPdfPreviewOpen, setIsPdfPreviewOpen, pdfUrl, handleFinalShare,
        isConfirmSaveDialogOpen, setIsConfirmSaveDialogOpen, handleConfirmSave, disableActions, sortedVeicoli, sortedNavi, 
        sortedLuoghi, getVeicoloLabel, tipiGiornataLavorativi, tipiGiornataTrasferta
    };
};
