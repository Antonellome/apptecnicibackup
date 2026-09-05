import { useReducer, useEffect, useMemo, useCallback, useRef, useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { isAfter, startOfMonth, add, format, eachDayOfInterval } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

import { AuthContext } from '@/contexts/AuthContextDefinition';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { useSyncManager } from '@/hooks/useSyncManager';
import { db } from '@/db/local-db';
import { aggiungiAllaCoda } from '@/services/syncService';
import { useGlobalData } from '@/hooks/useGlobalData';
import { Rapportino, TipoGiornata, Tecnico, Veicolo, DettaglioOreData } from '@/models/definitions';

const FORM_AUTOSAVE_KEY = 'form-autosave-data';

function removeUndefinedKeys(obj: any): any {
    if (obj === null || typeof obj !== 'object' || obj instanceof Date || obj instanceof Timestamp) return obj;
    if (Array.isArray(obj)) return obj.map(item => removeUndefinedKeys(item)).filter(item => item !== undefined);
    const newObj: { [key: string]: any } = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key) && obj[key] !== undefined) {
            const value = removeUndefinedKeys(obj[key]);
            if (value !== undefined) newObj[key] = value;
        }
    }
    return newObj;
}

const ASSENZA_KEYWORDS = ['ferie', 'malattia', 'legge 104', 'permesso'];
const MULTI_DAY_ALLOWED_KEYWORDS = ['ferie', 'malattia'];

const isTipoGiornataLavorativo = (tipo: TipoGiornata | undefined): boolean => {
    if (!tipo || !tipo.nome) return true;
    return !ASSENZA_KEYWORDS.some(keyword => tipo.nome.toLowerCase().includes(keyword));
};

const getAutomaticPause = (oraInizio: string | undefined, oraFine: string | undefined): number => {
    if (!oraInizio || !oraFine) return 0;
    try {
        const lunchStart = new Date(`1970-01-01T12:00:00`);
        const lunchEnd = new Date(`1970-01-01T13:00:00`);
        const workStart = new Date(`1970-01-01T${oraInizio}`);
        const workEnd = new Date(`1970-01-01T${oraFine}`);
        if (workEnd <= workStart) workEnd.setDate(workEnd.getDate() + 1);
        const overlaps = workStart < lunchEnd && lunchStart < workEnd;
        return overlaps ? 60 : 0;
    } catch { return 0; }
};

const calculateOre = (dettaglio: Partial<DettaglioOreData>): number => {
    if (dettaglio.isManual) return parseFloat(String(dettaglio.ore)) || 0;
    const inizio = new Date(`1970-01-01T${dettaglio.oraInizio || '00:00'}`);
    const fine = new Date(`1970-01-01T${dettaglio.oraFine || '00:00'}`);
    if (fine <= inizio) fine.setDate(fine.getDate() + 1);
    const diff = (fine.getTime() - inizio.getTime()) / (1000 * 60);
    const oreCalcolate = (diff - (dettaglio.pausa ?? 0)) / 60;
    return Math.round(oreCalcolate * 4) / 4;
};

const createInitialDettaglio = (tecnicoId: string, nome: string, isLavorativo: boolean, baseDetail?: Partial<DettaglioOreData>): DettaglioOreData => {
    const defaultDetail: DettaglioOreData = {
        tecnicoId, nome,
        isManual: baseDetail?.isManual ?? !isLavorativo,
        oraInizio: baseDetail?.oraInizio || '07:30',
        oraFine: baseDetail?.oraFine || '16:30',
        pausa: baseDetail?.pausa ?? 60,
        ore: 8,
    };
    if (isLavorativo) {
        defaultDetail.ore = calculateOre(defaultDetail);
        defaultDetail.isManual = baseDetail?.isManual ?? false;
    }
    return defaultDetail;
};

interface FormState {
    tecnicoScriventeId?: string;
    originalReport: Rapportino | null;
    data: Date | null;
    dataFine: Date | null;
    ordineLavoro: string;
    isMultiDay: boolean;
    dettaglioOreTecnici: DettaglioOreData[];
    tipoGiornataId: string;
    trasfertaId: string;
    includeTrasferta: boolean;
    veicoloId: string;
    naveId: string;
    luogoId: string;
    descrizioneBreve: string;
    lavoroEseguito: string;
    materialiImpiegati: string;
    firmaFirmatarioNome: string;
    firmaFirmatarioSocieta: string;
    firmaVettoriale: string | null;
    isReadOnly: boolean;
    lockReason: string | null;
    pageLoading: boolean;
    isProcessing: boolean;
    isModalOpen: boolean;
    editingTecnico: DettaglioOreData | null;
    tempDettaglioOre: DettaglioOreData | null;
    isSignatureModalOpen: boolean;
    isConfirmSaveDialogOpen: boolean;
}

type FormAction = 
    | { type: 'SET_FIELD'; payload: { field: keyof FormState; value: any } }
    | { type: 'SET_MULTIPLE_FIELDS'; payload: Partial<FormState> }
    | { type: 'LOAD_EDIT_DATA'; payload: { report: Rapportino, isReadOnly: boolean, lockReason: string | null } }
    | { type: 'LOAD_AUTOSAVE_DATA'; payload: Partial<FormState> }
    | { type: 'LOAD_NEW_FORM_DEFAULTS'; payload: { tecnicoId: string, dettaglio: DettaglioOreData[] } }
    | { type: 'SET_DETTAGLIO_ORE'; payload: DettaglioOreData[] };

const initialState: FormState = {
    originalReport: null, data: new Date(), dataFine: new Date(), ordineLavoro: '', isMultiDay: false,
    dettaglioOreTecnici: [], tipoGiornataId: '', trasfertaId: '', includeTrasferta: false, veicoloId: '', naveId: '', luogoId: '',
    descrizioneBreve: '', lavoroEseguito: '', materialiImpiegati: '', firmaFirmatarioNome: '', firmaFirmatarioSocieta: '',
    firmaVettoriale: null, isReadOnly: false, lockReason: null, pageLoading: true, isProcessing: false, 
    isModalOpen: false, editingTecnico: null, tempDettaglioOre: null, isSignatureModalOpen: false, isConfirmSaveDialogOpen: false,
};

const formReducer = (state: FormState, action: FormAction): FormState => {
    switch (action.type) {
        case 'SET_FIELD': return { ...state, [action.payload.field]: action.payload.value };
        case 'SET_MULTIPLE_FIELDS': return { ...state, ...action.payload };
        case 'SET_DETTAGLIO_ORE': return { ...state, dettaglioOreTecnici: action.payload };
        case 'LOAD_EDIT_DATA':
            const { report, isReadOnly, lockReason } = action.payload;
            return {
                ...state,
                originalReport: report,
                tecnicoScriventeId: report.tecnicoId,
                data: new Date(report.data),
                ordineLavoro: report.ordineLavoro || '',
                tipoGiornataId: report.tipoGiornataId || '',
                trasfertaId: report.trasfertaId || '',
                includeTrasferta: !!report.includeTrasferta,
                veicoloId: report.veicoloId || '',
                naveId: report.naveId || '',
                luogoId: report.luogoId || '',
                descrizioneBreve: report.descrizioneBreve || '',
                lavoroEseguito: report.lavoroEseguito || '',
                materialiImpiegati: report.materialiImpiegati || '',
                firmaFirmatarioNome: report.firmaFirmatarioNome || '',
                firmaFirmatarioSocieta: report.firmaFirmatarioSocieta || '',
                firmaVettoriale: report.firmaVettoriale || null,
                dettaglioOreTecnici: report.dettaglioOreTecnici || [],
                isReadOnly, lockReason,
                pageLoading: false,
            };
        case 'LOAD_AUTOSAVE_DATA':
            return { ...state, ...action.payload, pageLoading: false };
        case 'LOAD_NEW_FORM_DEFAULTS':
            return { ...state, tecnicoScriventeId: action.payload.tecnicoId, dettaglioOreTecnici: action.payload.dettaglio, pageLoading: false };
        default:
            return state;
    }
};

export const useReportForm = () => {
    const navigate = useNavigate();
    const authContext = useContext(AuthContext);
    const userProfile = authContext?.userProfile;
    const { requestManualSync } = useSyncManager();
    const { reportId } = useParams<{ reportId: string }>();
    const { showSnackbar } = useSnackbar();

    const [state, dispatch] = useReducer(formReducer, initialState);
    const isUnmounting = useRef(false);

    const { masterData, loading: collectionsLoading } = useGlobalData();
    const { 
        tecnici = [], ditte = [], categorie = [], navi = [], luoghi = [], 
        veicoli = [], tipiGiornata = [], clienti = []
    } = masterData || {};

    const isEditMode = Boolean(reportId);
    const loggedInTecnicoId = userProfile?.tecnicoId;

    const tecnicoScrivente = useMemo(() => tecnici.find(t => t.id === state.tecnicoScriventeId), [tecnici, state.tecnicoScriventeId]);
    const isLavorativo = useMemo(() => {
        const tipo = tipiGiornata.find(t => t.id === state.tipoGiornataId);
        return isTipoGiornataLavorativo(tipo);
    }, [state.tipoGiornataId, tipiGiornata]);

    const { tipiGiornataOperativi, tipiGiornataTrasferta } = useMemo(() => {
        const trasferte = tipiGiornata.filter(t => (t as any).categoria === 'trasferta' || (t.nome || '').toLowerCase().includes('trasferta'));
        const operativi = tipiGiornata.filter(t => !trasferte.some(tr => tr.id === t.id));
        return { tipiGiornataOperativi: operativi, tipiGiornataTrasferta: trasferte };
    }, [tipiGiornata]);

    const tipiGiornataFiltrati = useMemo(() => {
        if (state.isMultiDay) return tipiGiornataOperativi.filter(t => MULTI_DAY_ALLOWED_KEYWORDS.some(k => (t?.nome || '').toLowerCase().includes(k)));
        return tipiGiornataOperativi;
    }, [state.isMultiDay, tipiGiornataOperativi]);

    const sortedVeicoli = useMemo(() => [...veicoli].sort((a, b) => (`${a.marca || ''} ${a.modello || ''} - ${a.targa || 'N/A'}`).localeCompare(`${b.marca || ''} ${b.modello || ''} - ${b.targa || 'N/A'}`)), [veicoli]);
    const sortedNavi = useMemo(() => [...navi].sort((a, b) => (a?.nome || '').localeCompare(b?.nome || '')), [navi]);
    const sortedLuoghi = useMemo(() => [...luoghi].sort((a, b) => (a?.nome || '').localeCompare(b?.nome || '')), [luoghi]);

    const scriventeDettaglio = useMemo(() => state.dettaglioOreTecnici.find(d => d.tecnicoId === state.tecnicoScriventeId), [state.dettaglioOreTecnici, state.tecnicoScriventeId]);
    const otherTecnicos = useMemo(() => tecnici.filter(t => t.id !== state.tecnicoScriventeId).sort((a, b) => (`${a.cognome} ${a.nome}`).localeCompare(`${b.cognome} ${b.nome}`)), [tecnici, state.tecnicoScriventeId]);
    const selectedTecnicos = useMemo(() => otherTecnicos.filter(t => state.dettaglioOreTecnici.some(d => d.tecnicoId === t.id && t.id !== state.tecnicoScriventeId)), [state.dettaglioOreTecnici, otherTecnicos, state.tecnicoScriventeId]);
    const disableActions = state.isProcessing || state.isReadOnly;

    useEffect(() => { return () => { isUnmounting.current = true; }; }, []);

    useEffect(() => {
        const loadData = async () => {
            if (collectionsLoading) {
                return;
            }

            try {
                if (isEditMode && reportId) {
                    localStorage.removeItem(FORM_AUTOSAVE_KEY);
                    const reportData = await db.rapportini.get(reportId);
                    if (reportData) {
                        const isCreator = reportData.tecnicoId === loggedInTecnicoId;
                        const deadline = add(startOfMonth(new Date(reportData.data)), { months: 1, days: 5 });
                        let readOnly = false, lockReason = null;
                        if (!isCreator) {
                            readOnly = true; lockReason = "Creato da altro tecnico. Solo visualizzazione.";
                        } else if (isAfter(new Date(), deadline)) {
                            readOnly = true; lockReason = `Modifiche bloccate dopo il 5 del mese successivo.`;
                        }
                        dispatch({ type: 'LOAD_EDIT_DATA', payload: { report: reportData, isReadOnly: readOnly, lockReason } });
                    } else {
                        showSnackbar("Rapportino non trovato.", "error");
                        navigate('/lista-report');
                    }
                } else if (loggedInTecnicoId) {
                    const savedDataJSON = localStorage.getItem(FORM_AUTOSAVE_KEY);
                    if (savedDataJSON) {
                        const savedData = JSON.parse(savedDataJSON);
                        const parsedData = { ...savedData, data: savedData.data ? new Date(savedData.data) : new Date(), dataFine: savedData.dataFine ? new Date(savedData.dataFine) : new Date(), tecnicoScriventeId: loggedInTecnicoId };
                        dispatch({ type: 'LOAD_AUTOSAVE_DATA', payload: parsedData });
                    } else {
                        const scrivente = tecnici.find(t => t.id === loggedInTecnicoId);
                        if (scrivente) {
                            const nome = `${scrivente.cognome} ${scrivente.nome}`.trim();
                            const initialDettaglio = [createInitialDettaglio(scrivente.id, nome, true)];
                            dispatch({ type: 'LOAD_NEW_FORM_DEFAULTS', payload: { tecnicoId: loggedInTecnicoId, dettaglio: initialDettaglio } });
                        } else {
                            dispatch({ type: 'SET_FIELD', payload: { field: 'pageLoading', value: false } });
                        }
                    }
                } else {
                    dispatch({ type: 'SET_FIELD', payload: { field: 'pageLoading', value: false } });
                }
            } catch (error) {
                console.error("Errore caricamento dati:", error);
                showSnackbar("Errore critico durante il caricamento.", "error");
                dispatch({ type: 'SET_FIELD', payload: { field: 'pageLoading', value: false } });
            }
        };
        loadData();
    }, [reportId, isEditMode, collectionsLoading, loggedInTecnicoId, navigate, showSnackbar, tecnici]);

    useEffect(() => {
        if (isEditMode || state.pageLoading || state.isProcessing || isUnmounting.current) return;
        const { ...stateToSave } = state;
        localStorage.setItem(FORM_AUTOSAVE_KEY, JSON.stringify(stateToSave));
    }, [state, isEditMode]);

    const setField = useCallback((field: keyof FormState, value: any) => {
        dispatch({ type: 'SET_FIELD', payload: { field, value } });
    }, []);

    const validateForm = (): boolean => {
        if (!state.data) { showSnackbar("La data è obbligatoria.", "error"); return false; }
        if (!state.tipoGiornataId) { showSnackbar("Il tipo di giornata è obbligatorio.", "error"); return false; }

        if (isLavorativo && !state.isMultiDay) {
            if (!state.naveId) { showSnackbar("La Nave è obbligatoria per gli interventi.", "error"); return false; }
            if (!state.luogoId) { showSnackbar("Il Luogo è obbligatorio per gli interventi.", "error"); return false; }
            if (!state.lavoroEseguito.trim()) { showSnackbar("Il campo 'Lavoro Eseguito' è obbligatorio.", "error"); return false; }

            if (state.firmaVettoriale && (!state.firmaFirmatarioNome.trim() || !state.firmaFirmatarioSocieta.trim())) {
                 showSnackbar("Nome e Società del Firmatario sono obbligatori se è presente la firma.", "error"); return false; 
            }
        }
        return true;
    };

    const getFullReportData = (reportDate?: Date): Omit<Rapportino, 'id'> & { id?: string } | null => {
        const dateToUse = reportDate || state.data;
        if (!loggedInTecnicoId || !dateToUse) {
            console.error("ID tecnico o data mancanti, impossibile creare i dati del report.");
            return null;
        }

        const baseData: Omit<Rapportino, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'isLocked' | 'createdBy'> = {
            data: Timestamp.fromDate(dateToUse),
            nome: `Rapportino del ${format(dateToUse, 'dd-MM-yyyy')}`,
            tecnicoId: loggedInTecnicoId,
            tecnicoScriventeId: loggedInTecnicoId, 
            presenze: Array.from(new Set(state.dettaglioOreTecnici.map(d => d.tecnicoId))),
            tipoGiornataId: state.tipoGiornataId,
            giornataId: state.tipoGiornataId, 
            includeTrasferta: state.includeTrasferta,
            trasfertaId: state.includeTrasferta ? state.trasfertaId : undefined,
            naveId: state.naveId || undefined,
            luogoId: state.luogoId || undefined,
            veicoloId: state.veicoloId || undefined,
            lavoroEseguito: state.lavoroEseguito.trim(),
            descrizioneBreve: state.descrizioneBreve,
            materialiImpiegati: state.materialiImpiegati,
            ordineLavoro: state.ordineLavoro,
            dettaglioOreTecnici: state.dettaglioOreTecnici,
            firmaFirmatarioNome: state.firmaFirmatarioNome,
            firmaFirmatarioSocieta: state.firmaFirmatarioSocieta,
            firmaVettoriale: state.firmaVettoriale,
        };

        const now = Timestamp.now();

        if (isEditMode && state.originalReport) {
            return {
                ...baseData,
                id: state.originalReport.id,
                createdAt: state.originalReport.createdAt, 
                createdBy: state.originalReport.createdBy, 
                updatedAt: now,
                isLocked: state.originalReport.isLocked, 
                version: (state.originalReport.version || 1) + 1, 
            };
        } else {
            return {
                ...baseData,
                createdAt: now,
                updatedAt: now,
                createdBy: loggedInTecnicoId,
                isLocked: false,
                version: 1, 
            };
        }
    };
    
    const proceedToSave = async (options: { navigateOnSuccess: boolean }): Promise<string | null> => {
        try {
            let savedId: string | null = null;
            if (state.isMultiDay && state.data && state.dataFine && state.tipoGiornataId) {
                const days = eachDayOfInterval({ start: state.data, end: state.dataFine });
                for (const day of days) {
                    const dataToSave = getFullReportData(day);
                    if (!dataToSave) continue;
                    
                    const entityId = `local-${uuidv4()}`;
                    const finalData = { ...dataToSave, id: entityId };

                    // Salva immediatamente nel DB locale per visibilità UI
                    await db.rapportini.put(finalData as Rapportino);

                    await aggiungiAllaCoda({ type: 'rapportino', action: 'create', entityId, payload: removeUndefinedKeys(dataToSave) });
                }
                showSnackbar(`Creati ${days.length} rapportini!`, "success");
            } else {
                const dataToSave = getFullReportData();
                if (!dataToSave) { showSnackbar("Dati incompleti.", "error"); return null; }
                
                const actionType = isEditMode ? 'update' : 'create';
                const entityId = dataToSave.id || `local-${uuidv4()}`;
                
                const finalData = { ...dataToSave, id: entityId };

                // Salva immediatamente nel DB locale per visibilità UI
                await db.rapportini.put(finalData as Rapportino);

                // Aggiungi alla coda di sincronizzazione
                await aggiungiAllaCoda({ type: 'rapportino', action: actionType, entityId, payload: removeUndefinedKeys(dataToSave) });
                
                showSnackbar(isEditMode ? "Rapportino aggiornato!" : "Rapportino creato!", "success");
                savedId = entityId;
            }
            localStorage.removeItem(FORM_AUTOSAVE_KEY);
            requestManualSync();
            if (options.navigateOnSuccess) navigate('/lista-report');
            return savedId;
        } catch (error) { showSnackbar(`Errore: ${(error as Error).message}`, "error"); return null; }
    };

    const handleSave = async () => {
        if (!validateForm() || state.isProcessing) return;
        setField('isProcessing', true);
        if (!isEditMode && state.firmaVettoriale) {
            setField('isConfirmSaveDialogOpen', true);
        } else {
            const savedId = await proceedToSave({ navigateOnSuccess: true });
            if (!savedId) setField('isProcessing', false);
        }
    };

    const handleConfirmSave = async () => {
        setField('isConfirmSaveDialogOpen', false);
        if (!validateForm()) { setField('isProcessing', false); return; }
        const savedId = await proceedToSave({ navigateOnSuccess: true });
        if (!savedId) setField('isProcessing', false);
    };

    const handleCancelConfirmSave = () => {
        dispatch({ type: 'SET_MULTIPLE_FIELDS', payload: { isConfirmSaveDialogOpen: false, isProcessing: false } });
    }

    const handleAltriTecniciChange = (_: any, nuoviTecniciSelezionati: Tecnico[]) => {
        const newDettagli = state.dettaglioOreTecnici.filter(d => d.tecnicoId === state.tecnicoScriventeId);
        const scriventeDettaglio = newDettagli[0];
        if(!scriventeDettaglio) return;

        nuoviTecniciSelezionati.forEach(tecnico => {
            const existing = state.dettaglioOreTecnici.find(d => d.tecnicoId === tecnico.id);
            const nome = `${tecnico.cognome} ${tecnico.nome}`.trim();
            newDettagli.push(existing || createInitialDettaglio(tecnico.id, nome, isLavorativo, scriventeDettaglio));
        });
        dispatch({ type: 'SET_DETTAGLIO_ORE', payload: newDettagli });
    };

    const handleOreUpdate = useCallback((updatedData: DettaglioOreData) => {
        const newDettagli = state.dettaglioOreTecnici.map(currentDetail => {
            if (currentDetail.tecnicoId === updatedData.tecnicoId) {
                const timeChanged = currentDetail.oraInizio !== updatedData.oraInizio || currentDetail.oraFine !== updatedData.oraFine;
                let newPause = updatedData.pausa;
                if (timeChanged && currentDetail.pausa === updatedData.pausa) newPause = getAutomaticPause(updatedData.oraInizio, updatedData.oraFine);
                const finalData = { ...updatedData, pausa: newPause };
                finalData.ore = calculateOre(finalData);
                return finalData;
            }
            return currentDetail;
        });
        dispatch({ type: 'SET_DETTAGLIO_ORE', payload: newDettagli });
    }, [state.dettaglioOreTecnici]);
    
    const handleCancel = () => { localStorage.removeItem(FORM_AUTOSAVE_KEY); navigate('/lista-report'); };
    const removeTecnico = (tecnicoIdToRemove: string) => dispatch({ type: 'SET_DETTAGLIO_ORE', payload: state.dettaglioOreTecnici.filter(d => d.tecnicoId !== tecnicoIdToRemove) });
    
    const handleOpenModal = (tecnico: DettaglioOreData) => dispatch({ type: 'SET_MULTIPLE_FIELDS', payload: { editingTecnico: tecnico, tempDettaglioOre: tecnico, isModalOpen: true }});
    const handleCloseModal = () => setField('isModalOpen', false);
    const handleSaveFromModal = () => { if (state.tempDettaglioOre) handleOreUpdate(state.tempDettaglioOre); handleCloseModal(); };

    const handleTipoGiornataChange = (id: string) => {
        const tipo = tipiGiornata.find(t => t.id === id);
        const lavorativo = isTipoGiornataLavorativo(tipo);
        if (!state.isMultiDay) {
            const newDettagli = state.dettaglioOreTecnici.map(d => ({ ...d, isManual: !lavorativo, ore: lavorativo ? calculateOre(d) : 8 }));
            dispatch({ type: 'SET_MULTIPLE_FIELDS', payload: { tipoGiornataId: id, dettaglioOreTecnici: newDettagli } });
        } else {
            setField('tipoGiornataId', id);
        }
    };
    
    const handleMultiDayToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
        const isChecked = e.target.checked;
        let newTipoGiornataId = state.tipoGiornataId;
        if (isChecked) {
            const currentTipo = tipiGiornata.find(t => t.id === state.tipoGiornataId);
            if (currentTipo && !MULTI_DAY_ALLOWED_KEYWORDS.some(k => (currentTipo?.nome || '').toLowerCase().includes(k))) newTipoGiornataId = '';
        }
        const lavorativo = isLavorativo && !isChecked;
        const newDettagli = state.dettaglioOreTecnici.map(d => ({ ...d, isManual: !lavorativo, ore: lavorativo ? calculateOre(d) : 8 }));
        dispatch({ type: 'SET_MULTIPLE_FIELDS', payload: { isMultiDay: isChecked, tipoGiornataId: newTipoGiornataId, dettaglioOreTecnici: newDettagli } });
    };

    const handleOpenSignatureModal = () => {
        if (state.originalReport?.firmaVettoriale && isEditMode) { showSnackbar("La firma non può essere modificata.", "warning"); return; }
        if (!isLavorativo) { showSnackbar("La firma è disponibile solo per interventi operativi.", "warning"); return; }
        setField('isSignatureModalOpen', true);
    };
    const handleSaveSignature = (signatureData: string) => dispatch({ type: 'SET_MULTIPLE_FIELDS', payload: { firmaVettoriale: signatureData, isSignatureModalOpen: false } });

    const getVeicoloLabel = useCallback((veicolo: Veicolo | undefined) => {
        if (!veicolo) return '';
        return `${veicolo.marca || ''} ${veicolo.modello || ''} - ${veicolo.targa || 'N/A'}`.trim();
    }, []);

    return {
        state, dispatch, setField,
        isEditMode, isLavorativo, disableActions, 
        masterData: masterData || {}, collectionsLoading, tecnicoScrivente, tipiGiornataFiltrati, tipiGiornataTrasferta, tipiGiornataOperativi, 
        selectedTecnicos, otherTecnicos, scriventeDettaglio,
        sortedVeicoli, sortedNavi, sortedLuoghi, getVeicoloLabel,
        handleMultiDayToggle, handleTipoGiornataChange, handleAltriTecniciChange, handleOreUpdate, removeTecnico,
        handleOpenModal, handleCloseModal, handleSaveFromModal, handleCancel,
        handleSave, 
        handleOpenSignatureModal, handleSaveSignature, 
        handleConfirmSave, handleCancelConfirmSave,
    };
};
