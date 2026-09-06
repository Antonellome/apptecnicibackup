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
  ListItemText
} from '@mui/material';
import { WifiOff, CloudQueue, Gesture, Edit, Share, Delete, AccountCircle, ErrorOutline } from '@mui/icons-material';
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

// LA SOLA E UNICA VERITA'. LA FUNZIONE CHE AVREI DOVUTO SCRIVERE 3 GIORNI FA.
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

const ReportListPage: React.FC = () => {
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  const authContext = useContext(AuthContext);
  const userProfile = authContext?.userProfile;
  const { requestManualSync, pendingSyncCount } = useSyncManager();
  const isOnline = useOnlineStatus();
  
  const globalDataContext = useContext(GlobalDataContext);
  const masterData = globalDataContext?.masterData;
  const collectionsLoading = globalDataContext?.loading;

  const rapportiniGrezzi = useLiveQuery(() => db.rapportini.toArray(), []);

  const syncQueueItems = useLiveQuery(() => db.syncQueue.toArray(), []);

  const enrichedRapportini = useMemo(() => {
    if (!rapportiniGrezzi || !masterData || !userProfile || !syncQueueItems) return [];

    const syncStatusMap = new Map<string, SyncState>();
    syncQueueItems.forEach(item => {
        if (item.entityId) {
            syncStatusMap.set(item.entityId, item.syncStatus === 'error' ? 'error' : 'pending');
        }
    });

    const rapportini = rapportiniGrezzi.map(report => {
      // CORREZIONE CHIRURGICA
      const reportDate = toDateSafe(report.data);
      if (!reportDate) {
        console.error("Data non valida, rapportino scartato:", report.id, report.data);
        return null;
      }

      const isNonWorkingDay = !report.dettaglioOreTecnici || report.dettaglioOreTecnici.length === 0;
      let isUserInvolved = false;

      if (isNonWorkingDay) {
        isUserInvolved = report.tecnicoId === userProfile.tecnicoId;
      } else {
        isUserInvolved = report.dettaglioOreTecnici.some(d => d.tecnicoId === userProfile.tecnicoId);
      }

      if (!isUserInvolved) {
        return null;
      }

      const tipoGiornata = masterData.tipiGiornata.find(t => t.id === report.tipoGiornataId);
      const nave = masterData.navi.find(n => n.id === report.naveId);
      const luogo = masterData.luoghi.find(l => l.id === report.luogoId);
      const tecnicoScrivente = masterData.tecnici.find(t => t.id === report.tecnicoScriventeId);

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

      const syncState: SyncState = syncStatusMap.get(report.id) || 'synced';
      const isEditable = syncState === 'synced';

      return {
        ...report,
        data: reportDate, // DATA CORRETTA
        tipoGiornata: tipoGiornata,
        naveNome: nave?.nome,
        luogoNome: luogo?.nome,
        creatore: tecnicoScrivente?.nome || 'N/D',
        isEditable: isEditable,
        isClickable: true,
        oreDisplay: oreLavorateTecnico > 0 ? `${oreLavorateTecnico.toFixed(2)} ore` : '',
        orariDisplay: orariTecnico,
        hasFirma: !!report.firmaVettoriale,
        syncState: syncState,
      } as EnrichedRapportino;
    }).filter((r): r is EnrichedRapportino => r !== null);

    // Ordinamento sicuro su oggetti Date validi
    rapportini.sort((a, b) => b.data.getTime() - a.data.getTime());

    return rapportini;

  }, [rapportiniGrezzi, masterData, userProfile, syncQueueItems]);

  const [menuState, setMenuState] = useState<{ anchorEl: HTMLElement; report: EnrichedRapportino; } | null>(null);
  const [reportToDelete, setReportToDelete] = useState<EnrichedRapportino | null>(null);
  const [isConfirmDeleteDialogOpen, setConfirmDeleteDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<Date | null>(null);
  
  useEffect(() => {
    if (enrichedRapportini && !currentMonth) {
      setCurrentMonth(startOfMonth(enrichedRapportini.length > 0 ? enrichedRapportini[0].data : new Date()));
    }
  }, [enrichedRapportini, currentMonth]);

  const displayedRapportini = useMemo(() => {
    if (!enrichedRapportini || !currentMonth) return [];
    // Filtro sicuro su oggetti Date validi
    return enrichedRapportini.filter(r => isSameMonth(r.data, currentMonth));
  }, [enrichedRapportini, currentMonth]);

  if (collectionsLoading || !rapportiniGrezzi || !currentMonth || !masterData) return <FullScreenLoader />;

  const handleRowClick = (event: React.MouseEvent<HTMLElement>, report: EnrichedRapportino) => {
    event.preventDefault();
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
      showSnackbar("Dati non pronti per la condivisione.", "error");
      return;
    }
    const { report } = menuState;
    setIsProcessing(true);
    handleMenuClose();
    try {
      const fullReport = await db.rapportini.get(report.id);
      if (!fullReport) throw new Error("Rapportino non trovato nel database locale.");
      
      // Passiamo la data già convertita
      const pdfBlob = await generateRapportinoPDF({ ...fullReport, data: report.data }, masterData);
      await shareOrDownload(pdfBlob, `Rapportino_${format(report.data, 'dd-MM-yyyy')}.pdf`);
    } catch (error) {
      console.error("Errore durante la condivisione:", error);
      if ((error as DOMException).name !== 'AbortError') {
        showSnackbar(`Impossibile condividere: ${(error as Error).message}`, "error");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = () => {
    if (!menuState || !userProfile || !menuState.report.isEditable) return;
    const { report } = menuState;

    if (report.tecnicoId !== userProfile.tecnicoId && !report.isOwner) {
        showSnackbar("Non puoi cancellare un report creato da un altro tecnico.", "warning");
    } else if (!isSameMonth(report.data, new Date())) {
        showSnackbar("Puoi cancellare solo i report del mese corrente.", "warning");
    } else {
      setReportToDelete(report);
      setConfirmDeleteDialogOpen(true);
    }
    handleMenuClose();
  };

  const confirmDelete = async () => {
    if (!reportToDelete) return;
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

      showSnackbar("Rapportino contrassegnato come eliminato e messo in coda per la sinc.", "success");
      requestManualSync();

    } catch (error) {
      console.error("Errore durante la cancellazione (soft delete):", error);
      showSnackbar(`Errore: ${(error as Error).message}`, "error");
    } finally {
      setIsProcessing(false);
      setReportToDelete(null);
    }
  };

  const handleMonthChange = (increment: number) => setCurrentMonth(prev => prev ? addMonths(prev, increment) : new Date());
  const isNextMonthDisabled = () => !currentMonth || isAfter(startOfMonth(addMonths(currentMonth, 1)), new Date());

  const handleDialogClose = () => {
      setConfirmDeleteDialogOpen(false);
      setReportToDelete(null);
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>I Miei Report</Typography>
        <Button variant="contained" color="primary" size="large" onClick={() => navigate('/nuovo-report')} disabled={isProcessing}>Nuovo</Button>
      </Box>
      {!isOnline && <Alert severity="warning" icon={<WifiOff />} sx={{ mb: 2 }}>Sei offline...</Alert>}
      {(pendingSyncCount ?? 0) > 0 && <Chip icon={<CloudQueue />} label={`${pendingSyncCount} modifiche in attesa di invio`} color="warning" sx={{ mb: 2, width: '100%' }} />}
      <Paper sx={{ mb: 2, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button variant="outlined" onClick={() => handleMonthChange(-1)}>Mese Prec.</Button>
        <Typography variant="h6">{currentMonth ? format(currentMonth, 'MMMM yyyy', { locale: it }) : '...'}</Typography>
        <Button variant="outlined" onClick={() => handleMonthChange(1)} disabled={isNextMonthDisabled()}>Mese Succ.</Button>
      </Paper>
      <Paper elevation={3} sx={{ mt: 2 }}>
        <List disablePadding>
          {displayedRapportini.length === 0 ? (
            <Typography sx={{ textAlign: 'center', p: 4, fontStyle: 'italic', color: 'text.secondary' }}>Nessun report per questo mese.</Typography>
          ) : (
            displayedRapportini.map((report, index) => {
              if (report.isDeleted) return null;
              const prevReport = displayedRapportini.slice(0, index).reverse().find(r => !r.isDeleted);
              const isNewDay = !prevReport || !isSameDay(report.data, prevReport.data);
              const isSelected = menuState?.report.id === report.id || reportToDelete?.id === report.id;
              const nextReport = displayedRapportini[index + 1];
              const isLastOfGroup = !nextReport || !isSameDay(report.data, nextReport.data) || nextReport.isDeleted;
              
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
                          {report.orariDisplay && <Typography variant="caption" color="text.secondary">{report.orariDisplay}</Typography>}
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
                           {report.tecnicoId !== userProfile?.tecnicoId && report.creatore && <Chip icon={<AccountCircle />} label={report.creatore} size="small" variant="outlined" color="info" sx={{ mb: 0.5 }} />}
                          <Typography variant="body2" color="text.secondary" noWrap>{report.descrizioneBreve || ''}</Typography>
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0, textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <Box sx={{ height: '24px', display: 'flex', alignItems: 'center', gap: 1 }}>
                                {report.syncState === 'pending' && <CloudQueue fontSize="small" color="warning" titleAccess="In attesa di sincronizzazione" />}
                                {report.syncState === 'error' && <ErrorOutline fontSize="small" color="error" titleAccess="Errore di sincronizzazione" />}
                                {report.hasFirma && <Gesture fontSize="small" color="action" titleAccess="Firmato" />}
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
      <Menu open={menuState !== null} onClose={handleMenuClose} anchorEl={menuState?.anchorEl} anchorOrigin={{ vertical: 'center', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'left' }}>
          <MenuItem onClick={handleEdit} disabled={!menuState?.report.isEditable}><ListItemIcon><Edit fontSize="small" /></ListItemIcon><ListItemText>Modifica</ListItemText></MenuItem>
          <MenuItem onClick={handleShare}><ListItemIcon><Share fontSize="small" /></ListItemIcon><ListItemText>Condividi</ListItemText></MenuItem>
          <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }} disabled={!menuState?.report.isEditable}><ListItemIcon><Delete fontSize="small" color="error" /></ListItemIcon><ListItemText>Cancella</ListItemText></MenuItem>
      </Menu>
      <ConfirmationDialog open={isConfirmDeleteDialogOpen} onClose={handleDialogClose} onConfirm={confirmDelete} title="Conferma Cancellazione" description={`Sei sicuro di voler cancellare questo rapportino? L'azione è irreversibile.`} />
      {isProcessing && <FullScreenLoader />}
    </Box>
  );
};

export default ReportListPage;
