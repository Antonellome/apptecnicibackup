
import React from 'react';
import {
    Paper, Typography, TextField, FormControl, InputLabel, Select, MenuItem,
    Autocomplete, Button, CircularProgress, Alert, Box, Chip, IconButton, Switch, FormControlLabel,
    Dialog, DialogTitle, DialogContent, DialogActions, Grid
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ShareIcon from '@mui/icons-material/Share';
import BorderColorIcon from '@mui/icons-material/BorderColor';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { it } from 'date-fns/locale';
import { format } from 'date-fns';

import { useReportForm } from '@/hooks/useReportForm';
import OreLavoroSingoloTecnico from '@/components/Rapportini/OreLavoroSingoloTecnico';
import SignatureDialog from '@/components/form/SignatureDialog';
import PdfPreviewDialog from '@/components/pdf/PdfPreviewDialog';
import ConfirmationDialog from '@/components/ConfirmationDialog';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <Paper variant="outlined" sx={{ p: 2, mt: 3, borderLeft: '4px solid', borderColor: 'primary.main' }}>
        <Typography variant="h6" gutterBottom component="div" sx={{ fontWeight: 'bold', color: 'primary.dark' }}>
            {title}
        </Typography>
        <Grid container spacing={3} sx={{ width: '100%' }}>
            {children}
        </Grid>
    </Paper>
);

const ReportFormPage: React.FC = () => {
    const {
        isEditMode, isReadOnly, lockReason, pageLoading, isSaving, isSharing, isGeneratingPdf,
        dataInizio, setDataInizio, dataFine, setDataFine, isMultiDay, tipoGiornataId,
        trasfertaId, setTrasfertaId, includeTrasferta, setIncludeTrasferta, isLavorativo, veicoloId, setVeicoloId, naveId, setNaveId,
        luogoId, setLuogoId, descrizioneBreve, setDescrizioneBreve, lavoroEseguito, setLavoroEseguito,
        materialiImpiegati, setMaterialiImpiegati, dettaglioOre, firmaFirmatarioNome, setFirmaFirmatarioNome,
        firmaFirmatarioSocieta, setFirmaFirmatarioSocieta, firmaVettoriale, tecnicoScrivente, tipiGiornataFiltrati,
        selectedTecnicos, otherTecnicos, scriventeDettaglio, handleMultiDayToggle, handleTipoGiornataChange,
        handleAltriTecniciChange, removeTecnico, handleOpenModal, handleSave, handleSaveAndShare, handleShare,
        handleCancel, handleOpenSignatureModal, isModalOpen, handleCloseModal, handleSaveFromModal, editingTecnico,
        tempDettaglioOre, setTempDettaglioOre, isSignatureModalOpen, setIsSignatureModalOpen, handleSaveSignature,
        isPdfPreviewOpen, handleClosePdfPreview, pdfUrl, handleFinalShare, isConfirmSaveDialogOpen, setIsConfirmSaveDialogOpen,
        handleConfirmSave, disableActions, sortedVeicoli, sortedNavi, sortedLuoghi, getVeicoloLabel, tipiGiornataTrasferta
    } = useReportForm();

    if (pageLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress /></Box>;

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
                                    {tipiGiornataFiltrati.map((t: any) => <MenuItem key={t.id} value={t.id}>{t.nome}</MenuItem>)}
                                </Select>
                            </FormControl>
                            <FormControlLabel
                                control={<Switch checked={includeTrasferta} onChange={(e) => setIncludeTrasferta(e.target.checked)} />}
                                label="Aggiungi Trasferta"
                                disabled={disableActions}
                            />
                            {includeTrasferta && (
                                <FormControl fullWidth required disabled={disableActions} sx={{ mt: 2 }}>
                                    <InputLabel id="tipo-trasferta-label">Tipo di Trasferta</InputLabel>
                                    <Select
                                        labelId="tipo-trasferta-label"
                                        id="tipo-trasferta-select"
                                        value={trasfertaId}
                                        label="Tipo di Trasferta"
                                        onChange={e => setTrasfertaId(e.target.value as string)}
                                    >
                                        {tipiGiornataTrasferta?.map((t: any) => <MenuItem key={t.id} value={t.id}>{t.nome}</MenuItem>)}
                                    </Select>
                                </FormControl>
                            )}
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
                                        <OreLavoroSingoloTecnico key={scriventeDettaglio.tecnicoId} datiOre={scriventeDettaglio} onUpdate={() => {}} isReadOnly={disableActions} isScrivente={true} />
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

                                {dettaglioOre.filter(d => d.tecnicoId !== tecnicoScrivente?.id).map(dett => (
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
                                        <Grid size={{ xs: 12, md: 6 }}>
                                            <FormControl fullWidth required disabled={disableActions}>
                                                <InputLabel id="nave-label">Nave</InputLabel>
                                                <Select labelId="nave-label" value={naveId} label="Nave" onChange={e => setNaveId(e.target.value as string)}>
                                                    <MenuItem value="Nessuna"><em>Nessuna</em></MenuItem>
                                                    {sortedNavi.map((n: any) => <MenuItem key={n.id} value={n.id}>{n.nome}</MenuItem>)}
                                                </Select>
                                            </FormControl>
                                        </Grid>
                                        <Grid size={{ xs: 12, md: 6 }}>
                                            <FormControl fullWidth required disabled={disableActions}>
                                                <InputLabel id="luogo-label">Luogo</InputLabel>
                                                <Select labelId="luogo-label" value={luogoId} label="Luogo" onChange={e => setLuogoId(e.target.value as string)}>
                                                    <MenuItem value="Nessuno"><em>Nessuno</em></MenuItem>
                                                    {sortedLuoghi.map((l: any) => <MenuItem key={l.id} value={l.id}>{l.nome}</MenuItem>)}
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
                                                    renderValue={(selected) => getVeicoloLabel(sortedVeicoli.find((v:any) => v.id === selected))}
                                                >
                                                    <MenuItem value="Nessuno"><em>Nessuno</em></MenuItem>
                                                    {sortedVeicoli.map((v: any) => <MenuItem key={v.id} value={v.id}>{getVeicoloLabel(v)}</MenuItem>)}
                                                </Select>
                                            </FormControl>
                                        </Grid>
                                        <Grid size={12}><TextField label="Breve Descrizione Lavoro" value={descrizioneBreve} onChange={e => setDescrizioneBreve(e.target.value)} fullWidth disabled={disableActions} /></Grid>
                                        <Grid size={12}><TextField label="Materiali Impiegati" value={materialiImpiegati} onChange={e => setMaterialiImpiegati(e.target.value)} fullWidth multiline rows={2} disabled={disableActions} /></Grid>
                                        <Grid size={12}><TextField label="Lavoro Eseguito" value={lavoroEseguito} onChange={e => setLavoroEseguito(e.target.value)} fullWidth multiline rows={4} required disabled={disableActions} /></Grid>
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
                                                <Box sx={{ border: '1px dashed grey', borderRadius: 1, p: 2, textAlign: 'center', backgroundColor: '#f5f5f5' }}>
                                                    <Typography variant="body2" gutterBottom>Firma salvata:</Typography>
                                                    <img
                                                        key={firmaVettoriale}
                                                        src={firmaVettoriale}
                                                        alt="Firma"
                                                        style={{
                                                            width: '100%',
                                                            maxWidth: '400px',
                                                            height: 'auto',
                                                            margin: 'auto',
                                                            backgroundColor: 'white',
                                                            border: '1px solid #ddd'
                                                        }}/>
                                                    <br />
                                                    {!isReadOnly && <Button onClick={handleOpenSignatureModal} startIcon={<EditIcon/>} sx={{mt: 1}} disabled={disableActions}>Modifica Firma</Button>}
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
                           {isReadOnly ? (
                                <Button
                                    variant="contained"
                                    color="secondary"
                                    onClick={handleShare}
                                    disabled={isSaving || isSharing}
                                    startIcon={(isGeneratingPdf || isSharing) ? <CircularProgress size={24} /> : <ShareIcon />}
                                >
                                    Condividi
                                </Button>
                            ) : (
                                <>
                                    <Button variant="contained" onClick={handleSave} disabled={disableActions}>
                                        {isSaving ? <CircularProgress size={24} /> : (isEditMode ? 'Aggiorna' : 'Salva')}
                                    </Button>
                                    <Button
                                        variant="contained"
                                        color="secondary"
                                        onClick={handleSaveAndShare}
                                        disabled={disableActions || isMultiDay}
                                        startIcon={(isGeneratingPdf || isSharing) ? <CircularProgress size={24} /> : <ShareIcon />}
                                    >
                                        Salva e Condividi
                                    </Button>
                                </>
                            )}
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
                onClose={handleClosePdfPreview}
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
                description="Sei sicuro di voler salvare? La firma non potrà più essere modificata dopo il primo salvataggio."
            />
        </LocalizationProvider>
    );
};

export default ReportFormPage;
