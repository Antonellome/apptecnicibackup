
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
import BorderColorIcon from '@mui/icons-material/BorderColor';
import SignatureCanvas from 'react-signature-canvas';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { it } from 'date-fns/locale';
import { isSameMonth, subMonths, format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useMasterData } from '@/hooks/useMasterData';
import { db as firestoreDb } from '@/firebase';
import { doc, getDoc, addDoc, updateDoc, collection, Timestamp } from 'firebase/firestore';
import { Rapportino, TipoGiornata, Tecnico, DettaglioOreTecnico } from '@/models/definitions';
import { aggiungiAllaCoda } from '@/services/offlineSync';
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
    const [isSharing, setIsSharing] = useState(false);
    const [dettaglioOre, setDettaglioOre] = useState<DettaglioOreData[]>([]);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
    const [firmaFirmatarioNome, setFirmaFirmatarioNome] = useState('');
    const [firmaFirmatarioSocieta, setFirmaFirmatarioSocieta] = useState('');
    const [firmaVettoriale, setFirmaVettoriale] = useState<string | null>(null);
    const sigCanvas = useRef<SignatureCanvas>(null);

    const formRef = useRef<HTMLDivElement>(null);
    const memoizedShowSnackbar = useCallback(showSnackbar, []);
    const tecnicoScrivente = useMemo(() => tecnici.find(t => t.id === loggedInTecnicoId), [tecnici, loggedInTecnicoId]);

    const altriTecniciIds = useMemo(() => dettaglioOre.filter(d => d.tecnicoId !== loggedInTecnicoId).map(d => d.tecnicoId), [dettaglioOre, loggedInTecnicoId]);
    const otherTecnicos = useMemo(() => sortedTecnici.filter(t => t.id !== loggedInTecnicoId), [sortedTecnici, loggedInTecnicoId]);
    const selectedTecnicos = useMemo(() => otherTecnicos.filter(t => altriTecniciIds.includes(t.id)), [altriTecniciIds, otherTecnicos]);

    useEffect(() => {
        const loadReportData = async () => {
            if (isEditMode && reportId) {
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

                        const details = (report.dettaglioOreTecnici || []).map(savedDetail => {
                            const tecnicoInfo = tecnici.find(t => t.id === savedDetail.tecnicoId);
                            return {
                                tecnicoId: savedDetail.tecnicoId,
                                nome: tecnicoInfo ? `${tecnicoInfo.cognome} ${tecnicoInfo.nome}`.trim() : 'Sconosciuto',
                                isManual: report.isTrasferta, 
                                oraInizio: report.oraInizio || '08:00', 
                                oraFine: report.oraFine || '17:00', 
                                pausa: report.pausa === undefined ? 60 : report.pausa,
                                ore: savedDetail?.ore ?? 8,
                            };
                        });
                        setDettaglioOre(details);

                        const reportMonth = report.data.toDate().getMonth();
                        const previousMonth = subMonths(new Date(), 1).getMonth();
                        if (reportMonth <= previousMonth && !user?.isAdmin) {
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
            } else if (loggedInTecnicoId && tecnicoScrivente) {
                setDettaglioOre([{
                    tecnicoId: loggedInTecnicoId,
                    nome: `${tecnicoScrivente.cognome} ${tecnicoScrivente.nome}`.trim(),
                    isManual: false,
                    oraInizio: '08:00',
                    oraFine: '17:00',
                    pausa: 60,
                    ore: 8
                }]);
            }
            setPageLoading(false);
        };

        if (!collectionsLoading) {
            loadReportData();
        }
    }, [reportId, isEditMode, collectionsLoading, loggedInTecnicoId, memoizedShowSnackbar, navigate, tecnicoScrivente, tecnici, tipiGiornata, user?.isAdmin]);

    const handleOpenModal = (tecnico: DettaglioOreData) => { /* ... */ };
    const handleTipoGiornataChange = (id: string) => { setTipoGiornataId(id); const tipo = tipiGiornata.find(t => t.id === id); setIsLavorativo(isGiornataLavorativa(tipo)); };
    const handleCancel = () => navigate(isEditMode ? '/lista-report' : '/');

    const handleOreUpdate = useCallback((updatedData: DettaglioOreData) => {
        setDettaglioOre(prevDettagli => 
            prevDettagli.map(d => 
                d.tecnicoId === updatedData.tecnicoId ? updatedData : d
            )
        );
    }, []);

    const handleAltriTecniciChange = (_: React.SyntheticEvent, nuoviTecniciSelezionati: Tecnico[]) => {
        const scrivente = dettaglioOre.find(d => d.tecnicoId === loggedInTecnicoId);
        if (!scrivente) return;

        const nuoviDettagli = nuoviTecniciSelezionati.map(t => {
            const existingDetail = dettaglioOre.find(d => d.tecnicoId === t.id);
            return existingDetail || { tecnicoId: t.id, nome: `${t.cognome} ${t.nome}`.trim(), isManual: scrivente.isManual, oraInizio: scrivente.oraInizio, oraFine: scrivente.oraFine, pausa: scrivente.pausa, ore: scrivente.ore };
        });
        setDettaglioOre([scrivente, ...nuoviDettagli]);
    };

    const removeTecnico = (tecnicoIdToRemove: string) => {
        setDettaglioOre(prev => prev.filter(d => d.tecnicoId !== tecnicoIdToRemove));
    };

    const performSave = async (): Promise<string | null> => {
        if (!loggedInTecnicoId) {
            memoizedShowSnackbar("Errore: Utente non autenticato.", "error");
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

        const reportData: Partial<Rapportino> = {
            data: Timestamp.fromDate(data || new Date()),
            tecnicoId: loggedInTecnicoId,
            altriTecniciIds,
            tipoGiornataId,
            isTrasferta: mainTecnicoDetail.isManual,
            oraInizio: mainTecnicoDetail.oraInizio,
            oraFine: mainTecnicoDetail.oraFine,
            pausa: mainTecnicoDetail.pausa,
            dettaglioOreTecnici: dettaglioOre.map(d => ({ tecnicoId: d.tecnicoId, ore: d.ore || 0 } as DettaglioOreTecnico)),
            veicoloId: veicoloId,
            naveId: naveId,
            luogoId: luogoId,
            descrizioneBreve,
            lavoroEseguito,
            materialiImpiegati,
            firmaFirmatarioNome,
            firmaFirmatarioSocieta,
            firmaVettoriale,
            updatedAt: Timestamp.now(),
        };
        if (!isEditMode) {
            reportData.createdAt = Timestamp.now();
        }

        try {
            if (!navigator.onLine) {
                const operation = { type: isEditMode ? 'update' : 'add', collection: 'rapportini', data: { ...reportData, id: reportId }, docId: reportId };
                await aggiungiAllaCoda(operation as any);
                memoizedShowSnackbar(`Rapportino ${isEditMode ? 'aggiornato' : 'salvato'} nella coda offline.`, "info");
                return reportId || "offline-id";
            } else {
                if (isEditMode) {
                    await updateDoc(doc(firestoreDb, 'rapportini', reportId!), reportData);
                    memoizedShowSnackbar("Rapportino aggiornato con successo!", "success");
                    return reportId;
                } else {
                    const newDocRef = await addDoc(collection(firestoreDb, 'rapportini'), reportData);
                    memoizedShowSnackbar("Rapportino salvato con successo!", "success");
                    return newDocRef.id;
                }
            }
        } catch (error) {
            console.error("Errore durante il salvataggio: ", error);
            memoizedShowSnackbar("Si è verificato un errore durante il salvataggio.", "error");
            return null;
        }
    };
    
    const handleSave = async () => {
        setIsSaving(true);
        const success = await performSave();
        if (success) {
            navigate('/lista-report');
        }
        setIsSaving(false);
    };

    const handleShare = async (idForShare?: string) => {
        const element = formRef.current;
        if (!element) {
            memoizedShowSnackbar('Impossibile trovare il form da condividere.', 'error');
            return;
        }
        setIsSharing(true);
    
        const actionButtons = document.getElementById('action-buttons');
        if (actionButtons) (actionButtons as HTMLElement).style.visibility = 'hidden';

        try {
            const canvas = await html2canvas(element, {
                scale: 2,
                backgroundColor: '#ffffff',
                onclone: (clonedDoc) => {
                    const style = clonedDoc.createElement('style');
                    clonedDoc.head.appendChild(style);
                    style.innerHTML = `
                        body, .MuiPaper-root, .MuiPaper-outlined { background-color: #ffffff !important; color: #000000 !important; }
                        * { box-shadow: none !important; text-shadow: none !important; }
                        .MuiTypography-root, p, span, div, h1, h2, h3, h4, label, .MuiInputLabel-root, .MuiMenuItem-root, .MuiInputBase-input, .MuiOutlinedInput-input, .MuiInput-input, .MuiSelect-select, .MuiChip-label {
                            color: #000000 !important; -webkit-text-fill-color: #000000 !important; }
                        .MuiOutlinedInput-notchedOutline { border-color: #cccccc !important; }
                        .MuiSvgIcon-root { fill: #000000 !important; }
                        .MuiChip-root { background-color: #f0f0f0 !important; border: 1px solid #cccccc !important; }
                        .MuiDivider-root::before, .MuiDivider-root::after { border-color: rgba(0, 0, 0, 0.12) !important; }
                    `;
                }
            });
            
            const imgData = canvas.toDataURL('image/png');
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
            const x = (pdfWidth - imgWidth) / 2;
            const y = 10;
            pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);

            const pdfBlob = pdf.output('blob');
            const fileName = `Rapportino-${idForShare || reportId || 'nuovo'}.pdf`;
            const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });
    
            if (navigator.share && navigator.canShare({ files: [pdfFile] })) {
                await navigator.share({
                    files: [pdfFile],
                    title: `Rapportino di Lavoro - ${format(data || new Date(), 'dd/MM/yyyy')}`,
                    text: `Ecco il rapportino di lavoro del ${format(data || new Date(), 'dd/MM/yyyy')}.`,
                });
            } else {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(pdfBlob);
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } catch (error) {
            console.error("Errore durante la creazione del PDF: ", error);
            memoizedShowSnackbar("Errore durante la creazione del PDF.", "error");
        } finally {
            if (actionButtons) (actionButtons as HTMLElement).style.visibility = 'visible';
            setIsSharing(false);
        }
    };
    
    const handleSaveAndShare = async () => {
        setIsSaving(true);
        const savedReportId = await performSave();
        if (savedReportId) {
            await handleShare(savedReportId);
        }
        setIsSaving(false);
    };
    
    const handleOpenSignatureModal = () => setIsSignatureModalOpen(true);

    if (pageLoading || collectionsLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress /></Box>;
    
    const scriventeDettaglio = dettaglioOre.find(d => d.tecnicoId === loggedInTecnicoId);
    const disableActions = isSaving || isSharing;

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={it}>
            <Box sx={{ p: { xs: 2, sm: 3 }, mx: 'auto' }}>
                <Paper ref={formRef} elevation={3} sx={{ p: { xs: 2, sm: 3 } }}>
                    <Typography variant="h4" component="h1" gutterBottom sx={{ textAlign: 'center', mb: 3 }}>
                        T.I.N. srl Report di Lavoro
                    </Typography>
                    
                    {isReadOnly && lockReason && <Alert severity="warning" sx={{ mb: 2 }}>{lockReason}</Alert>}
                    
                    <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }} noValidate autoComplete="off">
                        <DatePicker label="Data" value={data} onChange={setData} disabled={isReadOnly || disableActions} slotProps={{ textField: { fullWidth: true, required: true } }} />
                        <TextField label="Tecnico Responsabile" value={user?.email || '...'} fullWidth disabled />
                        <FormControl fullWidth required>
                            <InputLabel>Tipo Giornata</InputLabel>
                            <Select value={tipoGiornataId} label="Tipo Giornata" onChange={e => handleTipoGiornataChange(e.target.value)} disabled={isReadOnly || disableActions}>
                                {sortedTipiGiornata.map(t => (<MenuItem key={t.id} value={t.id}><span>{t.nome}</span></MenuItem>))}
                            </Select>
                        </FormControl>

                        {isLavorativo && (
                            <>
                                <Divider sx={{ my: 1 }}><Typography variant="overline">Dettaglio Ore Lavoro</Typography></Divider>
                                
                                {scriventeDettaglio && (
                                    <OreLavoroSingoloTecnico key={scriventeDettaglio.tecnicoId} datiOre={scriventeDettaglio} onUpdate={handleOreUpdate} isReadOnly={isReadOnly || disableActions} isScrivente={true} />
                                )}

                                <Autocomplete multiple options={otherTecnicos} getOptionLabel={(o) => `${o.cognome} ${o.nome}`} value={selectedTecnicos} onChange={handleAltriTecniciChange} renderInput={params => <TextField {...params} label="Aggiungi altri tecnici presenti" />} disabled={isReadOnly || disableActions} />

                                {dettaglioOre.filter(d => d.tecnicoId !== loggedInTecnicoId).map(dett => (
                                     <Paper key={dett.tecnicoId} variant="outlined" sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                                        <Box><Typography variant="body1" fontWeight="bold">{dett.nome}</Typography><Chip label={dett.isManual ? `Ore manuali: ${dett.ore || 0}` : `Orario: ${dett.oraInizio || 'N/A'} - ${dett.oraFine || 'N/A'} (${dett.ore || 0} ore)`} size="small" /></Box>
                                        <Box>
                                            <IconButton size="small" onClick={() => handleOpenModal(dett)} disabled={isReadOnly || disableActions}><EditIcon /></IconButton>
                                            <IconButton size="small" onClick={() => removeTecnico(dett.tecnicoId)} disabled={isReadOnly || disableActions}><DeleteIcon /></IconButton>
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
                                
                                <Divider sx={{ my: 2 }}><Typography variant="overline">Firma Cliente</Typography></Divider>
                                
                                <Box id="form-signature-placeholder">
                                    {firmaVettoriale ? (
                                        <Box sx={{border: '1px dashed grey', borderRadius: 1, p: 2, textAlign: 'center'}}>
                                            <Typography variant="body2" gutterBottom>Firmato da: <strong>{firmaFirmatarioNome || 'N/D'}</strong> ({firmaFirmatarioSocieta || 'N/D'})</Typography>
                                            <img src={firmaVettoriale} alt="Firma" style={{width: '200px', height: 'auto', border: '1px solid #eee'}}/>
                                            <br />
                                            <Button onClick={handleOpenSignatureModal} startIcon={<EditIcon/>} sx={{mt: 1}} disabled={disableActions}>Modifica Firma</Button>
                                        </Box>
                                    ) : (
                                        <Button variant="outlined" startIcon={<BorderColorIcon />} onClick={handleOpenSignatureModal} disabled={isReadOnly || disableActions} fullWidth>Aggiungi Firma Cliente</Button>
                                    )}
                                </Box>
                            </>
                        )}

                        <Grid container spacing={2} justifyContent="flex-end" sx={{ mt: 2 }} id="action-buttons">
                            <Grid>
                                <Button variant="outlined" onClick={handleCancel} disabled={disableActions}>Annulla</Button>
                            </Grid>
                            {!isEditMode ? (
                                <>
                                    <Grid>
                                        <Button variant="contained" onClick={handleSave} disabled={disableActions}>{isSaving ? <CircularProgress size={24} /> : 'Salva'}</Button>
                                    </Grid>
                                    <Grid>
                                        <Button variant="contained" color="secondary" onClick={handleSaveAndShare} disabled={disableActions} startIcon={isSharing ? <CircularProgress size={24} /> : <ShareIcon />}>Salva e Condividi</Button>
                                    </Grid>
                                </>
                            ) : (
                                <>
                                    <Grid>
                                        <Button variant="contained" onClick={handleSave} disabled={isReadOnly || disableActions}>{isSaving ? <CircularProgress size={24} /> : 'Aggiorna'}</Button>
                                    </Grid>
                                    <Grid>
                                        <Button variant="contained" color="secondary" onClick={handleSaveAndShare} disabled={isReadOnly || disableActions} startIcon={isSharing ? <CircularProgress size={24} /> : <ShareIcon />}>Aggiorna e Condividi</Button>
                                    </Grid>
                                </>
                            )}
                        </Grid>
                    </Box>
                </Paper>
            </Box>
            {/* Modals remain unchanged */}
        </LocalizationProvider>
    );
};
export default ReportFormPage;
