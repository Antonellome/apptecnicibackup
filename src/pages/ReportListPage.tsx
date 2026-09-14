import React, { useState, useMemo, Fragment, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  Paper,
  Typography,
  Button,
  Alert,
  Chip,
  Divider,
  Menu,
  MenuItem,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip
} from '@mui/material';
import { WifiOff, CloudQueue, Gesture, Edit, Share, Delete, AccountCircle, ErrorOutline, Close } from '@mui/icons-material';
import { format, startOfMonth, addMonths, isAfter, isSameMonth, isSameDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { useLiveQuery } from 'dexie-react-hooks';
import { EnrichedRapportino, SyncState } from '@/models/definitions';
import FullScreenLoader from '@/components/FullScreenLoader';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import { AuthContext } from '@/contexts/AuthContextDefinition';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { db } from '@/db/local-db';
import { aggiungiAllaCoda } from '@/services/syncService';
import { generateRapportinoPDF } from '@/services/rapportinoPDFGenerator';
import { shareOrDownload } from '@/services/shareService';
import { useSyncManager } from '@/hooks/useSyncManager';
import { GlobalDataContext } from '@/contexts/GlobalDataContext'; 
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

const PdfPreviewDialog = ({ open, onClose, pdfUrl, onShare, isProcessing }: { open: boolean, onClose: () => void, pdfUrl: string | null, onShare: () => void, isProcessing: boolean }) => {
  if (!pdfUrl) return null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg" PaperProps={{ sx: { height: '90vh' } }}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Anteprima Rapportino
        <IconButton edge="end" color="inherit" onClick={onClose} aria-label="close">
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 0, overflow: 'hidden' }}>
        <iframe src={pdfUrl} width="100%" height="100%" style={{ border: 'none' }} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isProcessing}>Chiudi</Button>
        <Button onClick={onShare} variant="contained" disabled={isProcessing}>{isProcessing ? 'Condivisione...' : 'Condividi'}</Button>
      </DialogActions>
    </Dialog>
  );
};

const toDateSafe = (date: any): Date | null => {
  if (!date) return null;
  if (date instanceof Date) return date;
  if (typeof date.toDate === 'function') return date.toDate();
  
  if (typeof date._seconds === 'number' && typeof date._nanoseconds === 'number') {
    return new Date(date._seconds * 1000 + date._nanoseconds / 1000000);
  }
  if (typeof date.seconds === 'number' && typeof date.nanoseconds === 'number') {
    return new Date(date.seconds * 1000 + date.nanoseconds / 1000000);
  }

  const parsedDate = new Date(date);
  return isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const SYNC_STATUSES: SyncState[] = ['pending', 'syncing', 'synced', 'failed', 'error'];

const ReportListPage: React.FC = () => {
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  const authContext = useContext(AuthContext);
  const userProfile = authContext?.userProfile;
  const { requestManualSync, pendingSyncItems } = useSyncManager();
  const isOnline = useOnlineStatus();
  
  const globalDataContext = useContext(GlobalDataContext);
  const masterData = globalDataContext?.masterData;
  const collectionsLoading = globalDataContext?.loading;

  const rapportiniGrezzi = useLiveQuery(() => db.rapportini.filter(r => r.isDeleted !== true).toArray());
  const syncQueueItems = useLiveQuery(() => db.syncQueue.toArray());

  const enrichedRapportini = useMemo(() => {
    if (!rapportiniGrezzi || !masterData || !userProfile || !syncQueueItems) return [];

    const syncStatusMap = new Map<string, SyncState>();
    syncQueueItems.forEach(item => {
        if (item.entityId && SYNC_STATUSES.includes(item.syncStatus as SyncState)) {
            syncStatusMap.set(item.entityId, item.syncStatus as SyncState);
        }
    });

    const rapportini = rapportiniGrezzi.map(report => {
      const reportDate = toDateSafe(report.data);
      if (!reportDate) return null;

      const isUserInvolved = (report.presenze || []).includes(userProfile.tecnicoId);
      if (!isUserInvolved) return null;

      const tipoGiornata = masterData.tipiGiornata.find(t => t.id === report.tipoGiornataId);
      const nave = masterData.navi.find(n => n.id === report.naveId);
      const luogo = masterData.luoghi.find(l => l.id === report.luogoId);
      const creatore = masterData.tecnici.find(t => t.id === report.createdBy);

      const dettagliTecnico = report.dettaglioOreTecnici?.filter(d => d.tecnicoId === userProfile.tecnicoId) || [];
      const oreLavorateTecnico = dettagliTecnico.reduce((acc, curr) => acc + (curr.ore || 0), 0);
      const orariTecnico = dettagliTecnico.map(d => {
        if (d.isManual) {
          return `Manuale: ${d.ore || 0}h`;
        }
        if (d.oraInizio && d.oraFine) {
          return `${d.oraInizio}-${d.oraFine} (${(d.ore || 0).toFixed(2)}h)`;
        }
        return '';
      }).filter(Boolean).join(', ');

      const syncState: SyncState = syncStatusMap.get(report.id || '') || (report.isOffline ? 'pending' : 'synced');
      
      return {
        ...report,
        data: reportDate,
        tipoGiornata,
        naveNome: nave?.nome,
        luogoNome: luogo?.nome,
        creatore,
        isEditable: syncState !== 'syncing', 
        isClickable: true,
        oreDisplay: oreLavorateTecnico > 0 ? `${oreLavorateTecnico.toFixed(2)} ore` : '',
        orariDisplay: orariTecnico,
        hasFirma: !!report.firmaVettoriale,
        syncState,
      } as EnrichedRapportino;
    }).filter((r): r is EnrichedRapportino => r !== null);

    rapportini.sort((a, b) => b.data.getTime() - a.data.getTime());
    return rapportini;

  }, [rapportiniGrezzi, masterData, userProfile, syncQueueItems]);

  const [menuState, setMenuState] = useState<{ anchorEl: HTMLElement; report: EnrichedRapportino; } | null>(null);
  const [reportToDelete, setReportToDelete] = useState<EnrichedRapportino | null>(null);
  const [isConfirmDeleteDialogOpen, setConfirmDeleteDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<Date | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfToShare, setPdfToShare] = useState<{blob: Blob, filename: string} | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  useEffect(() => {
    if (enrichedRapportini && !currentMonth) {
      setCurrentMonth(startOfMonth(enrichedRapportini.length > 0 ? enrichedRapportini[0].data : new Date()));
    }
  }, [enrichedRapportini, currentMonth]);

  useEffect(() => {
    return () => { if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl); };
  }, [pdfPreviewUrl]);

  const displayedRapportini = useMemo(() => {
    if (!enrichedRapportini || !currentMonth) return [];
    return enrichedRapportini.filter(r => isSameMonth(r.data, currentMonth));
  }, [enrichedRapportini, currentMonth]);

  const handleRowClick = (event: React.MouseEvent<HTMLElement>, report: EnrichedRapportino) => {
    setMenuState({ anchorEl: event.currentTarget, report });
  };

  const handleMenuClose = () => setMenuState(null);

  const handleEdit = () => {
    if (!menuState || !menuState.report.isEditable) return;
    navigate(`/report/edit/${menuState.report.id}`);
    handleMenuClose();
  };

  const handleShare = async () => {
    if (!menuState || !masterData) {
        showSnackbar("Dati non pronti.", "error");
        return;
    }
    const { report } = menuState;
    setIsProcessing(true);
    handleMenuClose();
    try {
        const fullReport = await db.rapportini.get(report.id || '');
        if (!fullReport) throw new Error("Rapportino non trovato.");
        
        const pdfBlob = await generateRapportinoPDF({ ...fullReport, data: report.data }, masterData);
        const url = URL.createObjectURL(pdfBlob);
        
        setPdfPreviewUrl(url);
        setPdfToShare({ blob: pdfBlob, filename: `Rapportino_${format(report.data, 'dd-MM-yyyy')}.pdf` });
        setIsPreviewOpen(true);
    } catch (error) {
        showSnackbar(`Errore anteprima: ${(error as Error).message}`, "error");
    } finally {
        setIsProcessing(false);
    }
  };

  const executeShare = async () => {
    if (!pdfToShare) return;
    setIsProcessing(true);
    try {
        await shareOrDownload(pdfToShare.blob, pdfToShare.filename);
    } catch (error) {
        if ((error as DOMException).name !== 'AbortError') {
            showSnackbar(`Errore condivisione: ${(error as Error).message}`, "error");
        }
    } finally {
        setIsProcessing(false);
        setIsPreviewOpen(false);
    }
  };

  const handleDeleteRequest = () => {
    if (!menuState) return;
    const { report } = menuState;

    const isOwner = report.createdBy === userProfile?.tecnicoId;
    const deadline = addMonths(startOfMonth(report.data), 1);

    if (!isOwner) {
        showSnackbar("Non puoi eliminare un report creato da altri.", "warning");
    } else if (isAfter(new Date(), deadline)) {
        showSnackbar("I report possono essere eliminati solo fino alla fine del mese di competenza.", "warning");
    } else {
        setReportToDelete(report);
        setConfirmDeleteDialogOpen(true);
    }
    handleMenuClose();
  };

  const confirmDelete = async () => {
    if (!reportToDelete || !reportToDelete.id) return;
    setIsProcessing(true);
    setConfirmDeleteDialogOpen(false);
    try {
        await db.rapportini.update(reportToDelete.id, { isDeleted: true });
        await aggiungiAllaCoda({ 
            type: 'rapportino', 
            action: 'update', 
            entityId: reportToDelete.id, 
            payload: { isDeleted: true } 
        });
        showSnackbar("Rapportino eliminato e sincronizzazione in corso.", "success");
        requestManualSync();
    } catch (error) {
        showSnackbar(`Errore eliminazione: ${(error as Error).message}`, "error");
    } finally {
        setIsProcessing(false);
        setReportToDelete(null);
    }
  };

  if (collectionsLoading || !currentMonth || !masterData) return <FullScreenLoader />;

  const handleMonthChange = (inc: number) => setCurrentMonth(prev => prev ? addMonths(prev, inc) : new Date());
  const isNextMonthDisabled = !currentMonth || isAfter(startOfMonth(addMonths(currentMonth, 1)), new Date());
  
  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>I Miei Report</Typography>
        <Button variant="contained" color="primary" size="large" onClick={() => navigate('/nuovo-report')} disabled={isProcessing}>Nuovo</Button>
      </Box>
      
      {!isOnline && <Alert severity="warning" icon={<WifiOff />} sx={{ mb: 2 }}>Sei offline. Le modifiche verranno sincronizzate alla riconnessione.</Alert>}
      {(pendingSyncItems ?? 0) > 0 && <Chip icon={<CloudQueue />} label={`${pendingSyncItems} modifiche in attesa`} color="warning" sx={{ mb: 2, width: '100%' }} />}
      
      <Paper sx={{ mb: 2, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button variant="outlined" onClick={() => handleMonthChange(-1)}>Mese Prec.</Button>
        <Typography variant="h6">{format(currentMonth, 'MMMM yyyy', { locale: it })}</Typography>
        <Button variant="outlined" onClick={() => handleMonthChange(1)} disabled={isNextMonthDisabled}>Mese Succ.</Button>
      </Paper>

      <Paper elevation={3} sx={{ mt: 2 }}>
        <List disablePadding>
          {displayedRapportini.length === 0 ? (
            <Typography sx={{ textAlign: 'center', p: 4, color: 'text.secondary' }}>Nessun report per questo mese.</Typography>
          ) : (
            displayedRapportini.map((report, index) => {
              const prevReport = index > 0 ? displayedRapportini[index - 1] : null;
              const isNewDay = !prevReport || !isSameDay(report.data, prevReport.data);
              const isSelected = menuState?.report.id === report.id || reportToDelete?.id === report.id;
              const nextReport = displayedRapportini[index + 1];
              const isLastOfGroup = !nextReport || !isSameDay(report.data, nextReport.data);
              const tipoGiornataNome = report.tipoGiornata?.nome || '[Tipo sconosciuto]';

              return (
                <Fragment key={report.id}>
                  {isNewDay && (
                      <Divider component="li" textAlign="left" sx={{ my: 2, mx: 2, textTransform: 'capitalize', '&::before, &::after': { borderColor: 'primary.main' } }}>
                          <Chip label={format(report.data, 'EEEE dd MMMM', { locale: it })} color="primary"/>
                      </Divider>
                  )}
                  <ListItem disablePadding divider={!isLastOfGroup}>
                    <ListItemButton onClick={(e) => handleRowClick(e, report)} disabled={isProcessing} selected={isSelected} sx={{ py: 1.5, px: 2, ...(isSelected && { border: '2px solid', borderColor: 'primary.main', borderRadius: 1 }) }}>
                      <Box sx={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: '500', color: 'primary.main' }}>{tipoGiornataNome}</Typography>
                          {report.ordineLavoro && <Typography variant="caption" color="text.secondary">{report.ordineLavoro}</Typography>}
                          {report.orariDisplay && <Typography variant="caption" color="text.secondary" display="block">{report.orariDisplay}</Typography>}
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
                           {report.createdBy !== userProfile?.tecnicoId && report.creatore && <Chip icon={<AccountCircle />} label={`${report.creatore.nome} ${report.creatore.cognome}`} size="small" variant="outlined" color="info" sx={{ mb: 0.5 }} />}
                          <Typography variant="body2" color="text.secondary" noWrap>{report.descrizioneBreve || ''}</Typography>
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0, textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <Box sx={{ height: '24px', display: 'flex', alignItems: 'center', gap: 1 }}>
                                {report.syncState === 'pending' && <Tooltip title="In attesa di sync"><CloudQueue fontSize="small" color="warning" /></Tooltip>}
                                {report.syncState === 'error' && <Tooltip title="Errore di sincronizzazione"><ErrorOutline fontSize="small" color="error" /></Tooltip>}
                                {report.hasFirma && <Tooltip title="Firmato"><Gesture fontSize="small" color="action" /></Tooltip>}
                            </Box>
                            <Typography variant="caption" color="text.secondary" noWrap>{report.naveNome || ''}</Typography>
                            <Typography variant="caption" color="text.secondary" noWrap>{report.luogoNome || ''}</Typography>
                        </Box>
                      </Box>
                    </ListItemButton>
                  </ListItem>
                </Fragment>
              );
            })
          )}
        </List>
      </Paper>

      <Menu open={!!menuState} onClose={handleMenuClose} anchorEl={menuState?.anchorEl}>
          <MenuItem onClick={handleEdit} disabled={!menuState?.report.isEditable}><ListItemIcon><Edit /></ListItemIcon>Modifica</MenuItem>
          <MenuItem onClick={handleShare}><ListItemIcon><Share /></ListItemIcon>Condividi</MenuItem>
          <MenuItem onClick={handleDeleteRequest} sx={{ color: 'error.main' }}><ListItemIcon><Delete color="error" /></ListItemIcon>Elimina</MenuItem>
      </Menu>

      <ConfirmationDialog open={isConfirmDeleteDialogOpen} onClose={() => setConfirmDeleteDialogOpen(false)} onConfirm={confirmDelete} title="Conferma Eliminazione" description={`Sei sicuro di voler eliminare il report del ${reportToDelete ? format(reportToDelete.data, 'dd/MM/yyyy') : ''}?`} />
      {isProcessing && !isPreviewOpen && <FullScreenLoader />}
      <PdfPreviewDialog open={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} pdfUrl={pdfPreviewUrl} onShare={executeShare} isProcessing={isProcessing} />
    </Box>
  );
};

export default ReportListPage;
