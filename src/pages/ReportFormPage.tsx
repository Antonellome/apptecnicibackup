
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Paper, Typography, TextField, FormControl, InputLabel, Select, MenuItem,
    Autocomplete, Button, CircularProgress, Alert, Divider, Box, Chip, Dialog, DialogTitle, DialogContent, DialogActions, IconButton
} from '@mui/material';
import Grid from '@mui/material/Grid';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ShareIcon from '@mui/icons-material/Share';
import BorderColorIcon from '@mui/icons-material/BorderColor';
import SignatureCanvas from 'react-signature-canvas';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { it } from 'date-fns/locale';
import { isSameMonth, format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useLocalData } from '@/hooks/useLocalData';
import { db as firestoreDb } from '@/firebase';
import { doc, getDoc, addDoc, updateDoc, collection, Timestamp } from 'firebase/firestore';
import { Rapportino, TipoGiornata, Tecnico, Veicolo, DettaglioOreData } from '@/models/definitions';
import { useSnackbar } from '@/contexts/SnackbarContext';
import OreLavoroSingoloTecnico from '@/components/Rapportini/OreLavoroSingoloTecnico';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const NON_LAVORATIVO_KEYWORDS = ['ferie', 'malattia', 'permesso', 'legge 104'];
const isGiornataLavorativa = (tipo: TipoGiornata | undefined): boolean => {
    if (!tipo || !tipo.nome) return true;
    return !NON_LAVORATIVO_KEYWORDS.some(keyword => tipo.nome.toLowerCase().includes(keyword));
};

// Funzione per creare lo stato iniziale per un tecnico
const createInitialDettaglio = (tecnicoId: string, nome: string): DettaglioOreData => ({
    tecnicoId,
    nome,
    isManual: false,
    oraInizio: '07:30',
    oraFine: '16:30',
    pausa: 60,
    ore: 8,
});

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

    // --- INIZIALIZZAZIONE SINCRONA DELLO STATO PER EVITARE RACE CONDITION ---
    const [dettaglioOre, setDettaglioOre] = useState<DettaglioOreData[]>(() => {
        if (!isEditMode && loggedInTecnicoId) {
            return [createInitialDettaglio(loggedInTecnicoId, 'Caricamento...')];
        }
        return [];
    });

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
    const [isSharing, setIsSharing] = useState(false);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTecnico, setEditingTecnico] = useState<DettaglioOreData | null>(null);
    const [tempDettaglioOre, setTempDettaglioOre] = useState<DettaglioOreData | null>(null);

    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
    const [firmaFirmatarioNome, setFirmaFirmatarioNome] = useState('');
    const [firmaFirmatarioSocieta, setFirmaFirmatarioSocieta] = useState('');
    const [firmaVettoriale, setFirmaVettoriale] = useState<string | null>(null);
    const sigCanvas = useRef<SignatureCanvas>(null);

    const formRef = useRef<HTMLDivElement>(null);
    const memoizedShowSnackbar = useCallback(showSnackbar, []);

    const altriTecniciIds = useMemo(() => dettaglioOre.filter(d => d.tecnicoId !== loggedInTecnicoId).map(d => d.tecnicoId), [dettaglioOre, loggedInTecnicoId]);
    const otherTecnicos = useMemo(() => tecnici.filter(t => t.id !== loggedInTecnicoId), [tecnici, loggedInTecnicoId]);
    const selectedTecnicos = useMemo(() => otherTecnicos.filter(t => altriTecniciIds.includes(t.id)), [altriTecniciIds, otherTecnicos]);


    useEffect(() => {
        const loadData = async () => {
            // In modalità modifica, carica i dati da Firestore
            if (isEditMode && reportId) {
                setPageLoading(true);
                try {
                    const reportRef = doc(firestoreDb, 'rapportini', reportId);
                    const reportSnap = await getDoc(reportRef);
                    if (reportSnap.exists()) {
                        const report = { id: reportSnap.id, ...reportSnap.data() } as Rapportino;
                        setData(report.data.toDate());
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
                            return {
                                tecnicoId: savedDetail.tecnicoId,
                                nome: tecnicoInfo ? `${tecnicoInfo.cognome} ${tecnicoInfo.nome}`.trim() : 'Sconosciuto',
                                isManual: (savedDetail.isManual ?? report.isTrasferta) || false,
                                oraInizio: savedDetail.oraInizio || report.oraInizio || '07:30',
                                oraFine: savedDetail.oraFine || report.oraFine || '16:30',
                                pausa: savedDetail.pausa ?? report.pausa ?? 60,
                                ore: savedDetail.ore,
                            };
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
                // In modalità nuovo, aggiorna solo il nome del tecnico una volta caricato
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

    const handleTipoGiornataChange = (id: string) => { setTipoGiornataId(id); const tipo = tipiGiornata.find(t => t.id === id); setIsLavorativo(isGiornataLavorativa(tipo)); };
    const handleCancel = () => navigate(isEditMode ? '/lista-report' : '/');

    const handleOreUpdate = useCallback((updatedData: DettaglioOreData) => {
        setDettaglioOre(prevDettagli =>
            prevDettagli.map(d =>
                d.tecnicoId === updatedData.tecnicoId ? updatedData : d
            )
        );
    }, []);

    const handleScriventeOreUpdate = (updatedData: DettaglioOreData) => {
        const oldScriventeData = dettaglioOre.find(d => d.tecnicoId === updatedData.tecnicoId);
        const modeChanged = oldScriventeData?.isManual !== updatedData.isManual;

        setDettaglioOre(prevDettagli => {
            return prevDettagli.map(d => {
                if (d.tecnicoId === updatedData.tecnicoId) {
                    return updatedData;
                }
                if (modeChanged) {
                    return { ...d, isManual: updatedData.isManual };
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
            return existingDetail || createInitialDettaglio(t.id, `${t.cognome} ${t.nome}`.trim());
        });
        setDettaglioOre([scrivente, ...nuoviDettagli]);
    };

    const removeTecnico = (tecnicoIdToRemove: string) => {
        setDettaglioOre(prev => prev.filter(d => d.tecnicoId !== tecnicoIdToRemove));
    };

    const performSave = async (): Promise<string | null> => {
        if (!loggedInTecnicoId || !data) {
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
            data: Timestamp.fromDate(data),
            tecnicoId: loggedInTecnicoId,
            tipoGiornataId,
            isTrasferta: mainTecnicoDetail.isManual,
            oraInizio: mainTecnicoDetail.oraInizio,
            oraFine: mainTecnicoDetail.oraFine,
            pausa: mainTecnicoDetail.pausa,
            dettaglioOreTecnici: dettaglioOre.map(({ nome, ...rest }) => rest),
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
    
    const handleSave = async () => {
        const savedId = await performSave();
        if (savedId) navigate('/lista-report');
    };

    const handleShare = async () => {
        setIsSharing(true);
        const savedId = await performSave();
        if (!savedId) {
            setIsSharing(false);
            memoizedShowSnackbar("Salvataggio fallito. Impossibile condividere.", "error");
            return;
        }

        const element = formRef.current;
        if (!element) {
            setIsSharing(false);
            return;
        }

        const actionButtons = document.getElementById('action-buttons');
        if (actionButtons) (actionButtons as HTMLElement).style.visibility = 'hidden';

        try {
            const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff' });
            const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgRatio = canvas.width / canvas.height;
            let imgWidth = pdfWidth - 20;
            let imgHeight = imgWidth / imgRatio;
            if (imgHeight > pdfHeight - 20) {
                imgHeight = pdfHeight - 20;
                imgWidth = imgHeight * imgRatio;
            }
            pdf.addImage(imgData, 'PNG', (pdfWidth - imgWidth) / 2, 10, imgWidth, imgHeight);
            const pdfBlob = pdf.output('blob');
            const fileName = `Rapportino-${savedId}.pdf`;
            const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });
    
            if (navigator.share && navigator.canShare({ files: [pdfFile] })) {
                await navigator.share({ files: [pdfFile], title: `Rapportino di Lavoro`, text: `Rapportino del ${format(data || new Date(), 'dd/MM/yyyy')}` });
            } else {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(pdfBlob);
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } catch (error) {
            console.error("Errore PDF: ", error);
            memoizedShowSnackbar("Errore durante la creazione del PDF.", "error");
        } finally {
            if (actionButtons) (actionButtons as HTMLElement).style.visibility = 'visible';
            setIsSharing(false);
        }
    };
    
    const handleOpenSignatureModal = () => setIsSignatureModalOpen(true);

    if (pageLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress /></Box>;
    
    const scriventeDettaglio = dettaglioOre.find(d => d.tecnicoId === loggedInTecnicoId);
    const disableActions = isSaving || isSharing || isReadOnly;

    const getVeicoloLabel = (veicolo: Veicolo | undefined) => {
        if (!veicolo) return '';
        return `${veicolo.marca || ''} ${veicolo.modello || ''} - ${veicolo.targa || 'N/A'}`.trim();
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={it}>
            <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 900, mx: 'auto' }}>
                <Paper 
                    ref={formRef} 
                    elevation={3} 
                    sx={{
                        p: { xs: 2, sm: 3 },
                        borderTop: '5px solid',
                        borderColor: 'primary.main'
                    }}
                >
                    <Box sx={{ textAlign: 'center', mb: 3 }}>
                        <Typography variant="h4" component="h1" fontWeight="bold">T.I.N. srl</Typography>
                        <Typography variant="h6" component="h2">Report Intervento</Typography>
                    </Box>
                    
                    {isReadOnly && lockReason && <Alert severity="warning" sx={{ mb: 2 }}>{lockReason}</Alert>}
                    
                    <Grid container spacing={3}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <DatePicker label="Data" value={data} onChange={setData} disabled={disableActions} slotProps={{ textField: { fullWidth: true, required: true } }} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField label="Tecnico Responsabile" value={scriventeDettaglio?.nome || 'Caricamento...'} fullWidth disabled />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <FormControl fullWidth required disabled={disableActions}>
                                <InputLabel>Tipo Giornata</InputLabel>
                                <Select value={tipoGiornataId} label="Tipo Giornata" onChange={e => handleTipoGiornataChange(e.target.value)}>
                                    {tipiGiornata.map(t => <MenuItem key={t.id} value={t.id}>{t.nome}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>

                        {isLavorativo && (
                            <>
                                <Grid size={{ xs: 12 }}><Divider sx={{ my: 2 }}><Typography variant="overline">Ore Lavoro</Typography></Divider></Grid>

                                {scriventeDettaglio && (
                                    <Grid size={{ xs: 12 }}>
                                        <OreLavoroSingoloTecnico key={scriventeDettaglio.tecnicoId} datiOre={scriventeDettaglio} onUpdate={handleScriventeOreUpdate} isReadOnly={disableActions} isScrivente={true} />
                                    </Grid>
                                )}

                                <Grid size={{ xs: 12 }}>
                                     <Autocomplete
                                        multiple
                                        options={otherTecnicos}
                                        getOptionLabel={(o) => `${o.cognome} ${o.nome}`}
                                        value={selectedTecnicos}
                                        onChange={handleAltriTecniciChange}
                                        renderInput={params => <TextField {...params} label="Aggiungi altri tecnici presenti" />}
                                        disabled={disableActions}
                                    />
                                </Grid>

                                {dettaglioOre.filter(d => d.tecnicoId !== loggedInTecnicoId).map(dett => (
                                     <Grid size={{ xs: 12 }} key={dett.tecnicoId}>
                                        <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                                            <Box><Typography variant="body1" fontWeight="500">{dett.nome}</Typography><Chip label={dett.isManual ? `Manuale: ${dett.ore || 0} ore` : `Orario: ${dett.oraInizio || 'N/A'}-${dett.oraFine || 'N/A'} (${dett.ore || 0}h)`} size="small" /></Box>
                                            <Box><IconButton size="small" onClick={() => handleOpenModal(dett)} disabled={disableActions}><EditIcon /></IconButton><IconButton size="small" onClick={() => removeTecnico(dett.tecnicoId)} disabled={disableActions}><DeleteIcon /></IconButton></Box>
                                        </Paper>
                                    </Grid>
                                ))}

                                <Grid size={{ xs: 12 }}><Divider sx={{ my: 2 }}><Typography variant="overline">Dettagli Intervento</Typography></Divider></Grid>
                                
                                <Grid size={{ xs: 12 }}>
                                    <FormControl fullWidth disabled={disableActions}>
                                        <InputLabel>Veicolo</InputLabel>
                                        <Select value={veicoloId || ''} label="Veicolo" onChange={e => setVeicoloId(e.target.value as string)} renderValue={(selectedId) => getVeicoloLabel(veicoli.find(v => v.id === selectedId))}>
                                            <MenuItem value=""><em>Nessuno</em></MenuItem>
                                            {veicoli.map(v => <MenuItem key={v.id} value={v.id}>{getVeicoloLabel(v)}</MenuItem>)}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid size={{ xs: 12 }}>
                                    <FormControl fullWidth disabled={disableActions}>
                                        <InputLabel>Nave</InputLabel>
                                        <Select value={naveId || ''} label="Nave" onChange={e => setNaveId(e.target.value as string)}>
                                            <MenuItem value=""><em>Nessuna</em></MenuItem>
                                            {navi.map(n => <MenuItem key={n.id} value={n.id}>{n.nome}</MenuItem>)}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid size={{ xs: 12 }}>
                                    <FormControl fullWidth disabled={disableActions}>
                                        <InputLabel>Luogo</InputLabel>
                                        <Select value={luogoId || ''} label="Luogo" onChange={e => setLuogoId(e.target.value as string)}>
                                            <MenuItem value=""><em>Nessuno</em></MenuItem>
                                            {luoghi.map(l => <MenuItem key={l.id} value={l.id}>{l.nome}</MenuItem>)}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid size={{ xs: 12 }}><TextField label="Breve Descrizione Lavoro" value={descrizioneBreve} onChange={e => setDescrizioneBreve(e.target.value)} fullWidth disabled={disableActions} /></Grid>
                                <Grid size={{ xs: 12 }}><TextField label="Lavoro Eseguito" value={lavoroEseguito} onChange={e => setLavoroEseguito(e.target.value)} fullWidth multiline rows={4} disabled={disableActions} /></Grid>
                                <Grid size={{ xs: 12 }}><TextField label="Materiali Impiegati" value={materialiImpiegati} onChange={e => setMaterialiImpiegati(e.target.value)} fullWidth multiline rows={2} disabled={disableActions} /></Grid>
                                
                                <Grid size={{ xs: 12 }}><Divider sx={{ my: 2 }}><Typography variant="overline">Firma Cliente</Typography></Divider></Grid>
                                
                                <Grid size={{ xs: 12 }}>
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
                            </>
                        )}

                        <Grid size={{ xs: 12 }} id="action-buttons">
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
                                <Button variant="outlined" onClick={handleCancel} disabled={isSaving || isSharing}>Annulla</Button>
                                <Button variant="contained" onClick={handleSave} disabled={disableActions}>{isSaving ? <CircularProgress size={24} /> : (isEditMode ? 'Aggiorna' : 'Salva')}</Button>
                                {isEditMode && (
                                    <Button variant="contained" color="secondary" onClick={handleShare} disabled={disableActions} startIcon={isSharing ? <CircularProgress size={24} /> : <ShareIcon />}>Aggiorna e Condividi</Button>
                                )}
                            </Box>
                        </Grid>
                    </Grid>
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
