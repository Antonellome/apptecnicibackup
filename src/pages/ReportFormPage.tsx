
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Paper, Typography, TextField, FormControl, InputLabel, Select, MenuItem,
    Switch, FormControlLabel, Autocomplete, Button, CircularProgress, Alert, Divider, Box,
    Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Chip
} from '@mui/material';
import Grid from '@mui/material/Grid';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ShareIcon from '@mui/icons-material/Share';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { it } from 'date-fns/locale';
import { isSameMonth, subMonths, isBefore, startOfDay, parseISO, format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useMasterData } from '@/hooks/useMasterData';
import { db as firestoreDb } from '@/firebase';
import { doc, getDoc, addDoc, updateDoc, collection, Timestamp } from 'firebase/firestore';
import { Rapportino, TipoGiornata, Tecnico } from '@/models/definitions';
import { aggiungiAllaCoda, RapportinoInSospeso } from '@/services/offlineSync';
import { useSnackbar } from '@/contexts/SnackbarContext';
import OreLavoroSingoloTecnico from '@/components/Rapportini/OreLavoroSingoloTecnico';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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

const ReportFormPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { reportId } = useParams<{ reportId: string }>();
    const { masterData, loading: collectionsLoading } = useMasterData();
    const { tipiGiornata = [], tecnici = [], veicoli = [], navi = [], luoghi = [] } = masterData || {};
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
    const [isSharing, setIsSharing] = useState(false); // Nuovo stato per la condivisione
    const [isPeriodo, setIsPeriodo] = useState(false);
    const [dataInizio, setDataInizio] = useState<Date | null>(new Date());
    const [dataFine, setDataFine] = useState<Date | null>(new Date());
    const [dettaglioOre, setDettaglioOre] = useState<DettaglioOreData[]>([]);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTecnico, setEditingTecnico] = useState<DettaglioOreData | null>(null);
    const [tempDettaglioOre, setTempDettaglioOre] = useState<DettaglioOreData | null>(null);

    const formRef = useRef<HTMLDivElement>(null);
    const memoizedShowSnackbar = useCallback(showSnackbar, []);
    const canShare = useMemo(() => typeof navigator.share === 'function' && typeof navigator.canShare === 'function', []);
    const tecnicoScrivente = useMemo(() => tecnici.find(t => t.id === loggedInTecnicoId), [tecnici, loggedInTecnicoId]);

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
                            ore: dettaglioSalvato?.ore ?? 0,
                        };
                    });
                    setDettaglioOre(dettagliCaricati);

                    const today = new Date();
                    const isGracePeriod = today.getDate() <= 10;
                    const isReportInCurrentMonth = isSameMonth(reportDate, today);
                    const isReportInPreviousMonth = isSameMonth(reportDate, subMonths(today, 1));

                    let isLocked = false;
                    let reason = '';
                    if (reportData.tecnicoId !== loggedInTecnicoId) {
                        isLocked = true;
                        reason = "Rapportino bloccato: non sei l'autore originale.";
                    } else if (!isReportInCurrentMonth && !(isGracePeriod && isReportInPreviousMonth)) {
                        isLocked = true;
                        reason = "Rapportino bloccato: puoi modificare solo i report del mese corrente (o del mese precedente entro i primi 10 giorni).";
                    }
                    setIsReadOnly(isLocked);
                    setLockReason(reason);

                } else {
                    memoizedShowSnackbar("Report non trovato.", "error");
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

    const handleOpenModal = (tecnico: DettaglioOreData) => {
        setEditingTecnico(tecnico);
        setTempDettaglioOre(tecnico);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingTecnico(null);
        setTempDettaglioOre(null);
    };
    
    const handleSaveFromModal = () => {
        if (tempDettaglioOre) {
            handleOreUpdate(tempDettaglioOre);
        }
        handleCloseModal();
    };


    const altriTecniciIds = useMemo(() => dettaglioOre.filter(d => d.tecnicoId !== loggedInTecnicoId).map(d => d.tecnicoId), [dettaglioOre, loggedInTecnicoId]);
    const otherTecnicos = useMemo(() => sortedTecnici.filter(t => t.id !== loggedInTecnicoId), [sortedTecnici, loggedInTecnicoId]);
    const selectedTecnicos = useMemo(() => otherTecnicos.filter(t => altriTecniciIds.includes(t.id)), [altriTecniciIds, otherTecnicos]);

    const handleTipoGiornataChange = (id: string) => { setTipoGiornataId(id); const tipo = tipiGiornata.find(t => t.id === id); setIsLavorativo(isGiornataLavorativa(tipo)); };
    const handleCancel = () => navigate(isEditMode ? '/lista-report' : '/');

    const handleOreUpdate = useCallback((updatedData: DettaglioOreData) => {
        setDettaglioOre(prevDettagli => {
            const newDettagli = prevDettagli.map(d => d.tecnicoId === updatedData.tecnicoId ? updatedData : d);
            if (updatedData.tecnicoId === loggedInTecnicoId) {
                return newDettagli.map(d => {
                    if (d.tecnicoId === loggedInTecnicoId) return d;
                    return { 
                        ...d, 
                        isManual: updatedData.isManual,
                        oraInizio: updatedData.oraInizio,
                        oraFine: updatedData.oraFine,
                        pausa: updatedData.pausa,
                        ore: updatedData.ore
                    };
                });
            }
            return newDettagli;
        });
    }, [loggedInTecnicoId]);

    const handleAltriTecniciChange = (_: React.SyntheticEvent, nuoviTecniciSelezionati: Tecnico[]) => {
        const scrivente = dettaglioOre.find(d => d.tecnicoId === loggedInTecnicoId);
        if (!scrivente) return;

        const nuoviDettagli = nuoviTecniciSelezionati.map(t => {
            const existingDetail = dettaglioOre.find(d => d.tecnicoId === t.id);
            if (existingDetail) {
                return existingDetail;
            }
            return {
                tecnicoId: t.id,
                nome: `${t.cognome} ${t.nome}`.trim(),
                isManual: scrivente.isManual,
                oraInizio: scrivente.oraInizio,
                oraFine: scrivente.oraFine,
                pausa: scrivente.pausa,
                ore: scrivente.ore
            };
        });

        setDettaglioOre([scrivente, ...nuoviDettagli]);
    };

    const removeTecnico = (tecnicoIdToRemove: string) => {
        setDettaglioOre(prev => prev.filter(d => d.tecnicoId !== tecnicoIdToRemove));
    };

    const saveReport = async (): Promise<boolean> => {
        if ((!data && !isPeriodo) || !tipoGiornataId || !loggedInTecnicoId) {
            memoizedShowSnackbar("Compila i campi obbligatori (Data e Tipo Giornata).", "warning");
            return false;
        }

        const isOnline = navigator.onLine;
        const scriventeDettaglio = dettaglioOre.find(d => d.tecnicoId === loggedInTecnicoId);

        try {
            if (isPeriodo && !isEditMode) {
                if (!dataInizio || !dataFine || isBefore(startOfDay(dataFine), startOfDay(dataInizio))) {
                    memoizedShowSnackbar('La data di fine non può precedere quella di inizio.', "error");
                    return false;
                }
                const selectedTipo = tipiGiornata.find(t => t.id === tipoGiornataId);
                const tipoNome = selectedTipo?.nome.toLowerCase() || '';
                let oreDaAssegnare = 0;
                if (tipoNome.includes('ferie') || tipoNome.includes('malattia')) {
                    oreDaAssegnare = 8;
                }
                const dettaglioOreTecniciToSave = dettaglioOre.map(d => ({ tecnicoId: d.tecnicoId, ore: oreDaAssegnare }));
                const rapportinoData: Partial<Rapportino> = {
                    nome: 'Report di periodo', tipoGiornataId, data: Timestamp.fromDate(dataInizio), dataInizio: Timestamp.fromDate(dataInizio), dataFine: Timestamp.fromDate(dataFine), tecnicoId: loggedInTecnicoId,
                    presenze: dettaglioOre.map(d => d.tecnicoId), dettaglioOreTecnici: dettaglioOreTecniciToSave, isTrasferta: false, oraInizio: null, oraFine: null, pausa: null, veicoloId: null, naveId: null,
                    luogoId: null, descrizioneBreve: '', lavoroEseguito: '', materialiImpiegati: '', altriTecniciIds: dettaglioOre.filter(d => d.tecnicoId !== loggedInTecnicoId).map(d => d.tecnicoId),
                };
                if (isOnline) {
                    await addDoc(collection(firestoreDb, 'rapportini'), { ...rapportinoData, createdAt: Timestamp.now() });
                } else {
                    await aggiungiAllaCoda(rapportinoData as Omit<RapportinoInSospeso, 'localId'>);
                }
            } else { 
                const presenze = dettaglioOre.map(d => d.tecnicoId);
                const dettaglioOreTecniciToSave = dettaglioOre.map(d => ({ tecnicoId: d.tecnicoId, ore: d.ore || 0 }));
                let rapportinoData: Partial<Rapportino> = {
                    nome: 'Report giornaliero', data: Timestamp.fromDate(data!), tipoGiornataId, tecnicoId: loggedInTecnicoId, presenze,
                };
                if (isLavorativo) {
                    rapportinoData = {
                        ...rapportinoData, isTrasferta: scriventeDettaglio?.isManual || false, oraInizio: scriventeDettaglio?.isManual ? null : scriventeDettaglio?.oraInizio,
                        oraFine: scriventeDettaglio?.isManual ? null : scriventeDettaglio?.oraFine, pausa: scriventeDettaglio?.isManual ? null : scriventeDettaglio?.pausa,
                        dettaglioOreTecnici: dettaglioOreTecniciToSave, altriTecniciIds: dettaglioOre.filter(d => d.tecnicoId !== loggedInTecnicoId).map(d => d.tecnicoId),
                        veicoloId, naveId, luogoId, descrizioneBreve, lavoroEseguito, materialiImpiegati,
                    };
                } else {
                    const selectedTipo = tipiGiornata.find(t => t.id === tipoGiornataId);
                    const tipoNome = selectedTipo?.nome.toLowerCase() || '';
                    let oreDaAssegnare = 0;
                    if (tipoNome.includes('ferie') || tipoNome.includes('malattia')) {
                        oreDaAssegnare = 8;
                    }
                    const dettaglioOreTecniciToSaveNonLavorativo = dettaglioOre.map(d => ({ tecnicoId: d.tecnicoId, ore: oreDaAssegnare }));
                    rapportinoData = { ...rapportinoData, dettaglioOreTecnici: dettaglioOreTecniciToSaveNonLavorativo, isTrasferta: false, oraInizio: null, oraFine: null, pausa: null, veicoloId: null, naveId: null, luogoId: null, descrizioneBreve: '', lavoroEseguito: '', materialiImpiegati: '', altriTecniciIds: dettaglioOre.filter(d => d.tecnicoId !== loggedInTecnicoId).map(d => d.tecnicoId) };
                }

                if (isOnline) {
                    if (isEditMode && reportId) {
                        await updateDoc(doc(firestoreDb, 'rapportini', reportId), { ...rapportinoData, updatedAt: Timestamp.now() });
                    } else {
                        await addDoc(collection(firestoreDb, 'rapportini'), { ...rapportinoData, createdAt: Timestamp.now() });
                    }
                } else {
                    if (isEditMode) {
                        memoizedShowSnackbar("La modifica dei report non è disponibile offline.", "warning");
                        return false;
                    }
                    await aggiungiAllaCoda(rapportinoData as Omit<RapportinoInSospeso, 'localId'>);
                }
            }
            return true;
        } catch (error) {
            console.error("Errore salvataggio: ", error);
            memoizedShowSnackbar("Errore durante il salvataggio.", "error");
            return false;
        }
    };

    const generateAndSharePdf = async () => {
        if (!formRef.current) {
            memoizedShowSnackbar('Impossibile trovare il form da condividere.', 'error');
            return;
        }
        setIsSharing(true);
        try {
            const canvas = await html2canvas(formRef.current, {
                scale: 2, useCORS: true,
                onclone: (doc) => {
                    const el = doc.getElementById('action-buttons');
                    if (el) el.style.display = 'none';
                }
            });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            const pdfFile = new File([pdf.output('blob')], 'rapportino.pdf', { type: 'application/pdf' });

            if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
                await navigator.share({
                    files: [pdfFile],
                    title: 'Rapportino di Lavoro',
                    text: `Rapportino del ${data ? format(data, 'dd/MM/yyyy') : 'giorno'}.`,
                });
                memoizedShowSnackbar('Rapportino condiviso con successo!', 'success');
            } else {
                 const link = document.createElement('a');
                link.href = URL.createObjectURL(pdfFile);
                link.download = 'rapportino.pdf';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                memoizedShowSnackbar('PDF scaricato. La condivisione non è supportata.', 'info');
            }
        } catch (error) {
            console.error('Errore condivisione PDF:', error);
            memoizedShowSnackbar('Errore durante la creazione o condivisione del PDF.', 'error');
        } finally {
            setIsSharing(false);
        }
    };

    const handleFinalSubmit = async (options: { share: boolean }) => {
        // Se siamo in modalità modifica e l'opzione è solo condividere, salta il salvataggio
        if (isEditMode && options.share) {
            await generateAndSharePdf();
            return;
        }

        setIsSaving(true);
        const saveSuccess = await saveReport();
        if (saveSuccess) {
            if (options.share && canShare) {
                await generateAndSharePdf(); // La notifica di successo viene già gestita dentro
                // La navigazione avviene dopo la condivisione per non interrompere il processo
                navigate('/lista-report');
            } else {
                memoizedShowSnackbar(isEditMode ? "Report aggiornato con successo!" : "Report creato con successo!", "success", { autoHideDuration: 3000 });
                navigate('/lista-report');
            }
        }
        setIsSaving(false);
    };

    if (pageLoading || collectionsLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress /></Box>;
    
    const scriventeDettaglio = dettaglioOre.find(d => d.tecnicoId === loggedInTecnicoId);
    const disableActions = isSaving || isSharing;

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={it}>
            <Box sx={{ p: { xs: 2, sm: 3 }, mx: 'auto' }}>
                <Paper ref={formRef} elevation={3} sx={{ p: { xs: 2, sm: 3 } }}>
                    <Typography variant="h4" component="h1" gutterBottom>{isEditMode ? 'Dettaglio' : 'Nuovo'} Report</Typography>
                    {isReadOnly && lockReason && <Alert severity="warning" sx={{ mb: 2 }}>{lockReason}</Alert>}
                    <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 2 }} noValidate autoComplete="off">
                         {!isEditMode && ( <Alert severity="info" sx={{ display: 'flex', alignItems: 'center', mt: 1 }}> <FormControlLabel control={<Switch checked={isPeriodo} onChange={e => setIsPeriodo(e.target.checked)} disabled={disableActions} />} label="Inserisci per un periodo di più giorni" /> </Alert> )}
                        {isPeriodo && !isEditMode ? (
                            <Grid container spacing={2}>
                                <Grid xs={12} sm={6}><DatePicker label="Data Inizio" value={dataInizio} onChange={setDataInizio} slotProps={{ textField: { fullWidth: true, required: true } }} /></Grid>
                                <Grid xs={12} sm={6}><DatePicker label="Data Fine" value={dataFine} onChange={setDataFine} slotProps={{ textField: { fullWidth: true, required: true } }} /></Grid>
                            </Grid>
                        ) : ( <DatePicker label="Data" value={data} onChange={setData} disabled={isReadOnly || disableActions} slotProps={{ textField: { fullWidth: true, required: true } }} /> )}
                        <TextField label="Tecnico Responsabile" value={user?.email || '...'} fullWidth disabled />
                        <FormControl fullWidth required>
                            <InputLabel>Tipo Giornata</InputLabel>
                            <Select value={tipoGiornataId} label="Tipo Giornata" onChange={e => handleTipoGiornataChange(e.target.value)} disabled={isReadOnly || disableActions}>
                                {sortedTipiGiornata.map(t => (<MenuItem key={t.id} value={t.id}><span>{t.nome}</span></MenuItem>))}
                            </Select>
                        </FormControl>
                        {isLavorativo && !isPeriodo && (
                            <>
                                <Divider sx={{ my: 1 }}><Typography variant="overline">Dettaglio Ore Lavoro</Typography></Divider>
                                
                                {scriventeDettaglio && (
                                    <OreLavoroSingoloTecnico
                                        key={scriventeDettaglio.tecnicoId}
                                        datiOre={scriventeDettaglio}
                                        onUpdate={handleOreUpdate}
                                        isReadOnly={isReadOnly || disableActions}
                                        isScrivente={true}
                                    />
                                )}

                                <Autocomplete
                                    multiple
                                    options={otherTecnicos}
                                    getOptionLabel={(o) => `${o.cognome} ${o.nome}`}
                                    value={selectedTecnicos}
                                    onChange={handleAltriTecniciChange}
                                    renderInput={params => <TextField {...params} label="Aggiungi altri tecnici presenti" />}
                                    disabled={isReadOnly || disableActions}
                                />

                                {dettaglioOre.filter(d => d.tecnicoId !== loggedInTecnicoId).map(dett => (
                                     <Paper key={dett.tecnicoId} variant="outlined" sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                                        <Box>
                                            <Typography variant="body1" fontWeight="bold">{dett.nome}</Typography>
                                             <Chip
                                                label={dett.isManual 
                                                    ? `Ore manuali: ${dett.ore || 0}` 
                                                    : `Orario: ${dett.oraInizio || 'N/A'} - ${dett.oraFine || 'N/A'} (${dett.ore || 0} ore)`
                                                }
                                                size="small"
                                            />
                                        </Box>
                                        <Box>
                                            <IconButton size="small" onClick={() => handleOpenModal(dett)} disabled={isReadOnly || disableActions}>
                                                <EditIcon />
                                            </IconButton>
                                            <IconButton size="small" onClick={() => removeTecnico(dett.tecnicoId)} disabled={isReadOnly || disableActions}>
                                                <DeleteIcon />
                                            </IconButton>
                                        </Box>
                                    </Paper>
                                ))}

                                <Divider sx={{ my: 1 }}><Typography variant="overline">Dettagli Intervento</Typography></Divider>
                                <FormControl fullWidth><InputLabel>Nave</InputLabel><Select value={naveId || ''} label="Nave" onChange={e => setNaveId(e.target.value)} disabled={isReadOnly || disableActions}><MenuItem value=""><em>Nessuna</em></MenuItem>{sortedNavi.map(n => <MenuItem key={n.id} value={n.id}>{n.nome}</MenuItem>)}</Select></FormControl>
                                <FormControl fullWidth><InputLabel>Luogo</InputLabel><Select value={luogoId || ''} label="Luogo" onChange={e => setLuogoId(e.target.value)} disabled={isReadOnly || disableActions}><MenuItem value=""><em>Nessuno</em></MenuItem>{sortedLuoghi.map(l => <MenuItem key={l.id} value={l.id}>{l.nome}</MenuItem>)}</Select></FormControl>
                                <FormControl fullWidth><InputLabel>Veicolo</InputLabel><Select value={veicoloId || ''} label="Veicolo" onChange={e => setVeicoloId(e.target.value)} disabled={isReadOnly || disableActions}><MenuItem value=""><em>Nessuno</em></MenuItem>{sortedVeicoli.map(v => <MenuItem key={v.id} value={v.id}>{`${v.targa || 'N/A'} - ${v.nome}`}</MenuItem>)}</Select></FormControl>
                                <TextField label="Breve Descrizione" value={descrizioneBreve} onChange={e => setDescrizioneBreve(e.target.value)} fullWidth disabled={isReadOnly || disableActions} />
                                <TextField label="Materiali Impiegati" value={materialiImpiegati} onChange={e => setMaterialiImpiegati(e.target.value)} fullWidth multiline rows={2} disabled={isReadOnly || disableActions} />
                                <TextField label="Lavoro Eseguito" value={lavoroEseguito} onChange={e => setLavoroEseguito(e.target.value)} fullWidth multiline rows={4} disabled={isReadOnly || disableActions} />
                            </>
                        )}
                        <Grid container spacing={2} justifyContent="flex-end" sx={{ mt: 2 }} id="action-buttons">
                            <Grid><Button variant="outlined" size="large" onClick={handleCancel} disabled={disableActions}> {isReadOnly ? 'Indietro' : 'Annulla'}</Button></Grid>
                            {!isReadOnly && (
                            <>
                                <Grid>
                                    <Button 
                                        variant="contained" 
                                        color="primary" 
                                        size="large" 
                                        onClick={() => handleFinalSubmit({ share: false })}
                                        disabled={disableActions}
                                    >
                                        {isSaving ? <CircularProgress size={24} /> : 'Salva'}
                                    </Button>
                                </Grid>
                                {canShare && (
                                    <Grid>
                                        <Button 
                                            variant="contained" 
                                            color="secondary" 
                                            size="large" 
                                            onClick={() => handleFinalSubmit({ share: true })}
                                            disabled={disableActions}
                                            startIcon={(isSaving || isSharing) ? <CircularProgress size={24} color="inherit" /> : <ShareIcon />}
                                        >
                                            {isEditMode ? 'Condividi' : 'Salva e Condividi'}
                                        </Button>
                                    </Grid>
                                )}
                            </>
                           )}
                        </Grid>
                    </Box>
                </Paper>
            </Box>
            <Dialog open={isModalOpen} onClose={handleCloseModal} maxWidth="sm" fullWidth>
                <DialogTitle>Modifica orario di {editingTecnico?.nome}</DialogTitle>
                <DialogContent>
                    {tempDettaglioOre && (
                        <Box sx={{pt: 2}}>
                             <OreLavoroSingoloTecnico
                                datiOre={tempDettaglioOre}
                                onUpdate={setTempDettaglioOre}
                                isReadOnly={false}
                                isScrivente={false}
                            />
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseModal}>Annulla</Button>
                    <Button onClick={handleSaveFromModal} variant="contained">Salva Orario</Button>
                </DialogActions>
            </Dialog>
        </LocalizationProvider>
    );
};
export default ReportFormPage;
